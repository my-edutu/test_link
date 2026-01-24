import { Injectable, Inject } from '@nestjs/common';
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

    async startStream(userId: string, title: string, roomName?: string) {
        const roomId = roomName || `room_${userId}`;

        await this.db.insert(schema.liveStreams).values({
            id: roomId,
            streamerId: userId as any, // Cast to any to bypass potential text/uuid mismatch if strictly typed in schema
            title: title,
            isLive: true,
            viewerCount: '0',
        }).onConflictDoUpdate({
            target: schema.liveStreams.id,
            set: { isLive: true, title: title, endedAt: null, viewerCount: '0' }
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
            .leftJoin(schema.profiles, eq(schema.liveStreams.streamerId, schema.profiles.id as any))
            .where(eq(schema.liveStreams.isLive, true))
            .orderBy(desc(schema.liveStreams.createdAt));
    }
}
