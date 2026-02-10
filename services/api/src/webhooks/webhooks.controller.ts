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

interface SupabaseLikePayload {
    user_id: string;
    target_type: 'voice_clip' | 'video_clip' | 'story' | 'comment';
    target_id: string;
}

interface SupabaseMessagePayload {
    sender_id: string;
    conversation_id: string;
    text: string;
    type: string;
}

interface SupabaseCallPayload {
    caller_id: string;
    receiver_id: string;
    call_type: string;
    call_id: string;
    status: string;
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

        this.logger.debug(`Received Supabase webhook: ${payload.type} on ${payload.schema}.${payload.table}`);

        // Handle Auth User Creation
        if (payload.type === 'INSERT' && payload.table === 'users' && payload.schema === 'auth') {
            return this.handleUserCreated(payload.record);
        }

        // Handle New Like
        if (payload.type === 'INSERT' && payload.table === 'likes' && payload.schema === 'public') {
            return this.handleNewLike(payload.record);
        }

        // Handle New Message
        if (payload.type === 'INSERT' && payload.table === 'messages' && payload.schema === 'public') {
            return this.handleNewMessage(payload.record);
        }

        // Handle Incoming Call
        if (payload.type === 'INSERT' && payload.table === 'call_history' && payload.schema === 'public') {
            return this.handleIncomingCall(payload.record);
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

    private async handleNewLike(like: SupabaseLikePayload) {
        try {
            const { user_id, target_type, target_id } = like;

            // 1. Get Sender Details
            const { id: senderId, name: senderName } = await this.getNotificationActor(user_id);

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

    private async handleNewMessage(message: SupabaseMessagePayload) {
        try {
            const { sender_id, conversation_id, text, type } = message;

            // 1. Get Sender Details
            const { id: senderId, name: senderName } = await this.getNotificationActor(sender_id);

            // 2. Get Recipients (members of the conversation who are NOT the sender)
            const members = await this.db.query.conversationMembers.findMany({
                where: eq(schema.conversationMembers.conversationId, conversationId),
            });

            const recipients = members.filter(m => m.userId !== senderId);

            if (recipients.length === 0) {
                return { success: true, message: 'No recipients found' };
            }

            // 3. Emit Event for each recipient
            for (const recipient of recipients) {
                this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_MESSAGE, {
                    recipientId: recipient.userId,
                    senderId,
                    senderName,
                    messagePreview: type === 'text' ? text : `Sent a ${type}`,
                    conversationId,
                });
            }

            return { success: true, message: `Notification queued for ${recipients.length} recipients` };

        } catch (error) {
            this.logger.error(`Error processing message webhook: ${error instanceof Error ? error.message : String(error)}`);
            return { success: false, error: 'Internal error' };
        }
    }

    private async handleIncomingCall(call: SupabaseCallPayload) {
        try {
            const { caller_id, receiver_id, call_type, call_id, status } = call;

            if (status !== 'initiated') {
                return { success: true, message: 'Call status ignored' };
            }

            // 1. Get Caller Details
            const { id: callerId, name: callerName } = await this.getNotificationActor(caller_id);

            // 2. Send VoIP Notification (or High Importance Push)
            // Note: We are using the standard push notification here due to NotificationService limitations,
            // but effectively this alerts the user of an incoming call.
            // Ideally this should trigger a specific signaling event if the NotificationService supported VoIP pushes.

            // We use the event emitter if we had a CALL_RECEIVED event, but sticking to NotificationService direct usage might be harder 
            // without a listener. Let's create a custom "alert" instead.
            // Actually, let's look if we can use NEW_MESSAGE or custom event. 
            // Let's assume we want to notify valid push notifications.

            // Since we don't have a specific event in notification.events.ts for calls, we will just emit a custom 'social' notification
            // via a generic event or we can add handling in the future.
            // For now, let's just use NEW_MESSAGE as a fallback or add a generic notification logic.
            // But verify `NotificationService` isn't accessible here directly (it's in another module).
            // We must use EventEmitter. 

            // Let's repurpose NEW_MESSAGE for now as a "Call" message or use a direct approach if we had the service.
            // Better: Add NEW_MESSAGE event but with text "Incoming Call".

            this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_MESSAGE, {
                recipientId: receiverId,
                senderId: callerId,
                senderName: callerName,
                messagePreview: `Incoming ${callType} call...`,
                conversationId: 'callset_' + callId, // Mock ID to prevent crash
            });

            return { success: true, message: 'Call notification queued' };

        } catch (error) {
            this.logger.error(`Error processing call webhook: ${error instanceof Error ? error.message : String(error)}`);
            return { success: false, error: 'Internal error' };
        }
    }

    /**
     * Helper to fetch actor details for notifications
     */
    private async getNotificationActor(userId: string): Promise<{ id: string; name: string }> {
        const profile = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId),
            columns: { fullName: true, username: true },
        });

        return {
            id: userId,
            name: profile?.fullName || profile?.username || 'Someone',
        };
    }
}
