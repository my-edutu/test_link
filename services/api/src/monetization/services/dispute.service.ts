import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import { FlagClipDto } from '../dto/flag.dto';

export const FLAG_REASONS = {
    UNCLEAR_AUDIO: 'unclear_audio',
    DIALECT_DISPUTE: 'dialect_dispute',
    INAPPROPRIATE_CONTENT: 'inappropriate_content',
    OTHER: 'other',
} as const;

export const FLAG_STATUS = {
    PENDING: 'pending',
    REVIEWED: 'reviewed',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
} as const;

@Injectable()
export class DisputeService {
    private readonly logger = new Logger(DisputeService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Flag a clip for admin review.
     */
    async flagClip(
        flaggedBy: string,
        dto: FlagClipDto,
    ): Promise<{ success: boolean; message: string; flagId: string }> {
        const { voiceClipId, reason, additionalNotes } = dto;

        // Check if clip exists
        const clip = await this.db
            .select({ id: schema.voiceClips.id })
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.id, voiceClipId))
            .limit(1);

        if (clip.length === 0) {
            throw new NotFoundException('Voice clip not found');
        }

        // Check if already flagged by this user
        const existingFlag = await this.db
            .select({ id: schema.clipFlags.id })
            .from(schema.clipFlags)
            .where(
                and(
                    eq(schema.clipFlags.voiceClipId, voiceClipId),
                    eq(schema.clipFlags.flaggedBy, flaggedBy),
                    eq(schema.clipFlags.status, FLAG_STATUS.PENDING),
                ),
            )
            .limit(1);

        if (existingFlag.length > 0) {
            throw new BadRequestException('You have already flagged this clip');
        }

        // Insert the flag
        const [inserted] = await this.db
            .insert(schema.clipFlags)
            .values({
                voiceClipId,
                flaggedBy,
                reason,
                additionalNotes,
            })
            .returning({ id: schema.clipFlags.id });

        this.logger.log(`Clip ${voiceClipId} flagged by ${flaggedBy} for: ${reason}`);

        return {
            success: true,
            message: 'Clip has been flagged for review. An admin will look into it.',
            flagId: inserted.id,
        };
    }

    /**
     * Get all pending flags (Admin only).
     */
    async getPendingFlags(limit: number = 50) {
        const flags = await this.db
            .select()
            .from(schema.clipFlags)
            .where(eq(schema.clipFlags.status, FLAG_STATUS.PENDING))
            .limit(limit);

        return flags;
    }

    /**
     * Resolve a flag (Admin only).
     */
    async resolveFlag(
        flagId: string,
        adminId: string,
        resolution: string,
        status: 'resolved' | 'dismissed',
    ): Promise<{ success: boolean }> {
        await this.db
            .update(schema.clipFlags)
            .set({
                status,
                resolvedBy: adminId,
                resolution,
                resolvedAt: new Date(),
            })
            .where(eq(schema.clipFlags.id, flagId));

        this.logger.log(`Flag ${flagId} ${status} by admin ${adminId}`);
        return { success: true };
    }

    /**
     * Get flags for a specific clip.
     */
    async getFlagsForClip(voiceClipId: string) {
        return this.db
            .select()
            .from(schema.clipFlags)
            .where(eq(schema.clipFlags.voiceClipId, voiceClipId));
    }
}
