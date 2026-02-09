import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class LiveService {
    constructor(
        private configService: ConfigService,
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    async generateToken(roomName: string, participantName: string) {
        const apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || 'devkey';
        const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || 'secret';

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        return at.toJwt();
    }

    async startStream(userId: string, title: string, roomName?: string, language?: string) {
        // Validation: User ID must be provided (accepts both UUID and Clerk ID formats)
        if (!userId || userId.trim() === '') {
            throw new BadRequestException('User ID is required');
        }

        const roomId = roomName || `room_${userId}`;
        const streamLanguage = language || 'English';

        await this.db.insert(schema.liveStreams).values({
            id: roomId,
            streamerId: userId,
            title: title,
            language: streamLanguage,
            isLive: true,
            viewerCount: '0',
        }).onConflictDoUpdate({
            target: schema.liveStreams.id,
            set: { isLive: true, title: title, language: streamLanguage, endedAt: null, viewerCount: '0' }
        });

        return { roomId };
    }

    async endStream(roomId: string) {
        await this.db.update(schema.liveStreams)
            .set({ isLive: false, endedAt: new Date() })
            .where(eq(schema.liveStreams.id, roomId));
    }

    async updateViewerCount(roomId: string, count: number) {
        await this.db.update(schema.liveStreams)
            .set({ viewerCount: count.toString() })
            .where(eq(schema.liveStreams.id, roomId));
    }

    async getActiveStreams() {
        return this.db.select({
            id: schema.liveStreams.id,
            title: schema.liveStreams.title,
            viewerCount: schema.liveStreams.viewerCount,
            streamerId: schema.liveStreams.streamerId,
            username: schema.profiles.username,
            avatarUrl: schema.profiles.avatarUrl,
        })
            .from(schema.liveStreams)
            .leftJoin(schema.profiles, eq(schema.liveStreams.streamerId, schema.profiles.id))
            .where(eq(schema.liveStreams.isLive, true))
            .orderBy(desc(schema.liveStreams.createdAt));
    }

    // Call History Methods
    async startCall(callId: string, callerId: string, receiverId: string, callType: 'video' | 'voice' | 'group') {
        const [record] = await this.db.insert(schema.callHistory).values({
            callId,
            callerId,
            receiverId,
            callType,
            status: 'initiated',
            startedAt: new Date(),
        }).returning();
        return record;
    }

    async answerCall(callId: string) {
        await this.db.update(schema.callHistory)
            .set({ status: 'answered', answeredAt: new Date() })
            .where(eq(schema.callHistory.callId, callId));
    }

    async endCall(callId: string, endReason: string) {
        const [existing] = await this.db.select()
            .from(schema.callHistory)
            .where(eq(schema.callHistory.callId, callId))
            .limit(1);

        if (!existing) return;

        const endedAt = new Date();
        const answeredAt = existing.answeredAt;
        const durationSeconds = answeredAt
            ? Math.floor((endedAt.getTime() - new Date(answeredAt).getTime()) / 1000)
            : 0;

        await this.db.update(schema.callHistory)
            .set({
                status: 'ended',
                endedAt,
                durationSeconds,
                endReason,
            })
            .where(eq(schema.callHistory.callId, callId));
    }

    async getUserCallHistory(userId: string, limit = 50) {
        const { or } = await import('drizzle-orm');
        return this.db.select({
            id: schema.callHistory.id,
            callId: schema.callHistory.callId,
            callerId: schema.callHistory.callerId,
            receiverId: schema.callHistory.receiverId,
            callType: schema.callHistory.callType,
            status: schema.callHistory.status,
            startedAt: schema.callHistory.startedAt,
            answeredAt: schema.callHistory.answeredAt,
            endedAt: schema.callHistory.endedAt,
            durationSeconds: schema.callHistory.durationSeconds,
            endReason: schema.callHistory.endReason,
        })
            .from(schema.callHistory)
            .where(or(
                eq(schema.callHistory.callerId, userId),
                eq(schema.callHistory.receiverId, userId)
            ))
            .orderBy(desc(schema.callHistory.startedAt))
            .limit(limit);
    }
}
