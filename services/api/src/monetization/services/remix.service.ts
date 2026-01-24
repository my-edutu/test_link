import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';

export interface CreateRemixDto {
    parentClipId: string;
    phrase: string;
    language: string;
    dialect?: string;
    audioUrl: string;
}

export interface RemixChain {
    clipId: string;
    userId: string;
    phrase: string;
    depth: number; // 0 = original, 1 = first remix, 2 = remix of remix
}

@Injectable()
export class RemixService {
    private readonly logger = new Logger(RemixService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Register a new remix/duet clip.
     * Links it to the parent and root clip for royalty tracking.
     */
    async createRemix(
        userId: string,
        dto: CreateRemixDto,
    ): Promise<{ clipId: string; parentOwnerId: string; rootClipId: string }> {
        const { parentClipId, phrase, language, dialect, audioUrl } = dto;

        // 1. Verify parent clip exists and get owner
        const parentClip = await this.db
            .select({
                id: schema.voiceClips.id,
                userId: schema.voiceClips.userId,
                rootClipId: schema.voiceClips.rootClipId,
            })
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.id, parentClipId))
            .limit(1);

        if (parentClip.length === 0) {
            throw new NotFoundException('Parent clip not found');
        }

        const parent = parentClip[0];

        // 2. Cannot remix your own clip (unless we allow it)
        if (parent.userId === userId) {
            throw new BadRequestException('You cannot remix your own clip');
        }

        // 3. Determine root clip (original source of the chain)
        // If parent has a root, use that; otherwise parent is the root
        const rootClipId = parent.rootClipId || parentClipId;

        // 4. Create the remix clip
        const [newClip] = await this.db
            .insert(schema.voiceClips)
            .values({
                userId,
                phrase,
                language,
                dialect,
                audioUrl,
                parentClipId,
                rootClipId,
                status: 'pending',
            })
            .returning({ id: schema.voiceClips.id });

        // 5. Increment duets count on parent
        await this.db
            .update(schema.voiceClips)
            .set({
                duetsCount: (await this.getDuetsCount(parentClipId)) + 1,
            })
            .where(eq(schema.voiceClips.id, parentClipId));

        this.logger.log(`Remix created: ${newClip.id} by ${userId} from parent ${parentClipId}`);

        return {
            clipId: newClip.id,
            parentOwnerId: parent.userId,
            rootClipId,
        };
    }

    /**
     * Get the remix chain for a clip (all ancestors up to root).
     */
    async getRemixChain(clipId: string): Promise<RemixChain[]> {
        const chain: RemixChain[] = [];
        let currentClipId: string | null = clipId;
        let depth = 0;

        while (currentClipId) {
            const clip = await this.db
                .select({
                    id: schema.voiceClips.id,
                    userId: schema.voiceClips.userId,
                    phrase: schema.voiceClips.phrase,
                    parentClipId: schema.voiceClips.parentClipId,
                })
                .from(schema.voiceClips)
                .where(eq(schema.voiceClips.id, currentClipId))
                .limit(1);

            if (clip.length === 0) break;

            chain.push({
                clipId: clip[0].id,
                userId: clip[0].userId,
                phrase: clip[0].phrase || '',
                depth,
            });

            currentClipId = clip[0].parentClipId;
            depth++;

            // Safety limit to prevent infinite loops
            if (depth > 10) break;
        }

        return chain.reverse(); // Root first
    }

    /**
     * Get all remixes of a clip.
     */
    async getRemixesOf(clipId: string) {
        return this.db
            .select({
                id: schema.voiceClips.id,
                userId: schema.voiceClips.userId,
                phrase: schema.voiceClips.phrase,
                language: schema.voiceClips.language,
                createdAt: schema.voiceClips.createdAt,
            })
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.parentClipId, clipId));
    }

    /**
     * Get remix stats for a user.
     */
    async getUserRemixStats(userId: string) {
        // Clips user created that have been remixed
        const remixedClips = await this.db
            .select()
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.userId, userId));

        let totalRemixesReceived = 0;
        for (const clip of remixedClips) {
            totalRemixesReceived += clip.duetsCount || 0;
        }

        // Remixes user created
        const remixesMade = await this.db
            .select()
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.userId, userId));

        const remixesMadeCount = remixesMade.filter(c => c.parentClipId !== null).length;

        return {
            totalRemixesReceived,
            remixesMade: remixesMadeCount,
        };
    }

    private async getDuetsCount(clipId: string): Promise<number> {
        const clip = await this.db
            .select({ duetsCount: schema.voiceClips.duetsCount })
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.id, clipId))
            .limit(1);

        return clip[0]?.duetsCount || 0;
    }
}
