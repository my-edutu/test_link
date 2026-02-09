import { Controller, Post, Body, Headers, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { Public } from '../auth/public.decorator';
import { UsersService } from '../users/users.service';
import * as schema from '../database/schema';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';

interface SupabaseAuthWebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    record: any;
    old_record: any;
}

@Controller('webhooks/supabase')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
        private eventEmitter: EventEmitter2,
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    @Public()
    @Post('auth')
    async handleAuthWebhook(
        @Body() payload: SupabaseAuthWebhookPayload,
        @Headers('x-supabase-webhook-secret') secret: string,
    ) {
        // Simple security check
        const expectedSecret = this.configService.get<string>('SUPABASE_WEBHOOK_SECRET');
        if (expectedSecret && secret !== expectedSecret) {
            this.logger.warn('Unauthorized Supabase webhook attempt');
            throw new UnauthorizedException('Invalid webhook secret');
        }

        this.logger.log(`Received Supabase webhook: ${payload.type} on ${payload.schema}.${payload.table}`);

        // Handle Auth User Creation
        if (payload.type === 'INSERT' && payload.table === 'users' && payload.schema === 'auth') {
            return this.handleUserCreated(payload.record);
        }

        // Handle New Like
        if (payload.type === 'INSERT' && payload.table === 'likes' && payload.schema === 'public') {
            return this.handleNewLike(payload.record);
        }

        return { success: true, message: 'Event ignored' };
    }

    private async handleUserCreated(user: any) {
        const meta = user.raw_user_meta_data || {};

        try {
            await this.usersService.createProfileFromAuth({
                id: user.id,
                email: user.email,
                full_name: meta.full_name,
                username: meta.username,
                avatar_url: meta.avatar_url,
                primary_language: meta.primary_language,
                country: meta.country,
                state: meta.state,
                city: meta.city,
                lga: meta.lga,
                invite_code_input: meta.invite_code_input,
            });
            return { success: true, message: 'Profile synced' };
        } catch (error) {
            this.logger.error(`Error syncing profile from webhook: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    private async handleNewLike(like: any) {
        try {
            const { user_id: senderId, target_type, target_id } = like;

        // 1. Get Sender Details
            const sender = await this.db.query.profiles.findFirst({
                where: eq(schema.profiles.id, senderId),
                columns: { fullName: true, username: true },
            });

            const senderName = sender?.fullName || sender?.username || 'Someone';

            // 2. Get Target Owner
            let ownerId: string | null = null;
            let targetTypeNormalized: 'voice_clip' | 'video_clip' | 'story' | 'comment' | null = null;

            if (target_type === 'voice_clip') {
                targetTypeNormalized = 'voice_clip';
                const clip = await this.db.query.voiceClips.findFirst({
                    where: eq(schema.voiceClips.id, target_id),
                    columns: { userId: true },
                });
                ownerId = clip?.userId || null;
            } else if (target_type === 'video_clip') {
                targetTypeNormalized = 'video_clip';
                const clip = await this.db.query.videoClips.findFirst({
                    where: eq(schema.videoClips.id, target_id),
                    columns: { userId: true },
                });
                ownerId = clip?.userId || null;
            } else if (target_type === 'comment') {
                targetTypeNormalized = 'comment';
                const comment = await this.db.query.comments.findFirst({
                    where: eq(schema.comments.id, target_id),
                    columns: { userId: true },
                });
                ownerId = comment?.userId || null;
            }

            if (!ownerId) {
                this.logger.warn(`Could not find owner for liked item ${target_type}:${target_id}`);
                return { success: false, message: 'Owner not found' };
            }

            if (ownerId === senderId) {
                return { success: true, message: 'Self-like ignored' };
            }

            // 3. Emit Event
            this.eventEmitter.emit(NOTIFICATION_EVENTS.LIKE_RECEIVED, {
                userId: ownerId,
                senderId,
                senderName,
                targetId: target_id,
                targetType: targetTypeNormalized,
            });

            return { success: true, message: 'Notification queued' };
        } catch (error) {
            this.logger.error(`Error processing like webhook: ${error instanceof Error ? error.message : String(error)}`);
            return { success: false, error: 'Internal error' };
        }
    }
}
