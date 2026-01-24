import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, inArray, isNotNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Expo, { ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId } from 'expo-server-sdk';
import * as schema from '../database/schema';

export interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    category?: 'alert' | 'social' | 'reward';
}

export interface BatchNotificationPayload {
    userIds: string[];
    title: string;
    body: string;
    data?: Record<string, unknown>;
    category?: 'alert' | 'social' | 'reward';
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private expo: Expo;

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) {
        this.expo = new Expo();
    }

    /**
     * Send a push notification to a single user.
     */
    async sendToUser(payload: NotificationPayload): Promise<boolean> {
        const { userId, title, body, data, category } = payload;

        // Get user's push token
        const profile = await this.db
            .select({ expoPushToken: schema.profiles.expoPushToken })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        if (!profile.length || !profile[0].expoPushToken) {
            this.logger.warn(`No push token found for user ${userId}`);
            return false;
        }

        const token = profile[0].expoPushToken;

        if (!Expo.isExpoPushToken(token)) {
            this.logger.warn(`Invalid Expo push token for user ${userId}: ${token}`);
            await this.invalidateToken(userId);
            return false;
        }

        return this.sendNotification({
            userId,
            token,
            title,
            body,
            data,
            category,
        });
    }

    /**
     * Send push notifications to multiple users (batch).
     */
    async sendToUsers(payload: BatchNotificationPayload): Promise<{ sent: number; failed: number }> {
        const { userIds, title, body, data, category } = payload;
        let sent = 0;
        let failed = 0;

        // Get all users' push tokens
        const profiles = await this.db
            .select({
                id: schema.profiles.id,
                expoPushToken: schema.profiles.expoPushToken,
            })
            .from(schema.profiles)
            .where(inArray(schema.profiles.id, userIds));

        // Build messages for valid tokens
        const messages: ExpoPushMessage[] = [];
        const userTokenMap: Map<string, string> = new Map();

        for (const profile of profiles) {
            if (profile.expoPushToken && Expo.isExpoPushToken(profile.expoPushToken)) {
                messages.push({
                    to: profile.expoPushToken,
                    sound: 'default',
                    title,
                    body,
                    data: data as Record<string, string>,
                    categoryId: category,
                });
                userTokenMap.set(profile.expoPushToken, profile.id);
            }
        }

        if (messages.length === 0) {
            this.logger.warn('No valid push tokens found for batch notification');
            return { sent: 0, failed: userIds.length };
        }

        // Chunk messages and send
        const chunks = this.expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

                for (let i = 0; i < ticketChunk.length; i++) {
                    const ticket = ticketChunk[i];
                    const token = (chunk[i] as ExpoPushMessage).to as string;
                    const userId = userTokenMap.get(token);

                    if (ticket.status === 'ok') {
                        sent++;
                        if (userId) {
                            await this.logNotification({
                                userId,
                                token,
                                title,
                                body,
                                data,
                                category,
                                status: 'sent',
                                ticketId: ticket.id,
                            });
                        }
                    } else {
                        failed++;
                        if (userId) {
                            await this.handlePushError(userId, ticket);
                        }
                    }
                }
            } catch (error) {
                this.logger.error('Error sending batch notification chunk:', error);
                failed += chunk.length;
            }
        }

        return { sent, failed };
    }

    /**
     * Internal method to send a single notification.
     */
    private async sendNotification(params: {
        userId: string;
        token: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        category?: string;
    }): Promise<boolean> {
        const { userId, token, title, body, data, category } = params;

        const message: ExpoPushMessage = {
            to: token,
            sound: 'default',
            title,
            body,
            data: data as Record<string, string>,
            categoryId: category,
        };

        try {
            const tickets = await this.expo.sendPushNotificationsAsync([message]);
            const ticket = tickets[0];

            if (ticket.status === 'ok') {
                await this.logNotification({
                    userId,
                    token,
                    title,
                    body,
                    data,
                    category,
                    status: 'sent',
                    ticketId: ticket.id,
                });
                return true;
            } else {
                await this.handlePushError(userId, ticket);
                return false;
            }
        } catch (error) {
            this.logger.error(`Error sending notification to user ${userId}:`, error);
            await this.logNotification({
                userId,
                token,
                title,
                body,
                data,
                category,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Handle push notification errors and invalidate bad tokens.
     */
    private async handlePushError(userId: string, ticket: ExpoPushTicket): Promise<void> {
        if (ticket.status === 'error') {
            this.logger.error(`Push error for user ${userId}: ${ticket.message}`);

            // DeviceNotRegistered means the token is invalid
            if (ticket.details?.error === 'DeviceNotRegistered') {
                this.logger.warn(`Removing invalid token for user ${userId}`);
                await this.invalidateToken(userId);
            }
        }
    }

    /**
     * Remove invalid push token from user profile.
     */
    async invalidateToken(userId: string): Promise<void> {
        await this.db
            .update(schema.profiles)
            .set({ expoPushToken: null })
            .where(eq(schema.profiles.id, userId));
        this.logger.log(`Invalidated push token for user ${userId}`);
    }

    /**
     * Log notification to database for tracking.
     */
    private async logNotification(params: {
        userId: string;
        token: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        category?: string;
        status: string;
        ticketId?: string;
        errorMessage?: string;
    }): Promise<void> {
        const { userId, token, title, body, data, category, status, ticketId, errorMessage } = params;

        try {
            await this.db.insert(schema.notificationLogs).values({
                userId,
                expoPushToken: token,
                title,
                body,
                data: data || null,
                category,
                status,
                ticketId,
                errorMessage,
                sentAt: status === 'sent' ? new Date() : null,
            });
        } catch (error) {
            this.logger.error('Failed to log notification:', error);
        }
    }

    /**
     * Check delivery receipts for sent notifications.
     * Call this periodically or via cron job.
     */
    async checkReceipts(): Promise<void> {
        // Get pending receipts
        const pendingLogs = await this.db
            .select({
                id: schema.notificationLogs.id,
                userId: schema.notificationLogs.userId,
                ticketId: schema.notificationLogs.ticketId,
            })
            .from(schema.notificationLogs)
            .where(eq(schema.notificationLogs.status, 'sent'))
            .limit(100);

        if (pendingLogs.length === 0) return;

        const receiptIds = pendingLogs
            .filter(log => log.ticketId)
            .map(log => log.ticketId as ExpoPushReceiptId);

        if (receiptIds.length === 0) return;

        const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

        for (const chunk of receiptIdChunks) {
            try {
                const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

                for (const receiptId in receipts) {
                    const receipt = receipts[receiptId];
                    const log = pendingLogs.find(l => l.ticketId === receiptId);

                    if (!log) continue;

                    if (receipt.status === 'ok') {
                        await this.db
                            .update(schema.notificationLogs)
                            .set({
                                status: 'delivered',
                                receiptId: receiptId,
                                deliveredAt: new Date(),
                            })
                            .where(eq(schema.notificationLogs.id, log.id));
                    } else if (receipt.status === 'error') {
                        await this.db
                            .update(schema.notificationLogs)
                            .set({
                                status: 'failed',
                                receiptId: receiptId,
                                errorMessage: receipt.message,
                            })
                            .where(eq(schema.notificationLogs.id, log.id));

                        if (receipt.details?.error === 'DeviceNotRegistered') {
                            await this.invalidateToken(log.userId);
                        }
                    }
                }
            } catch (error) {
                this.logger.error('Error checking receipts:', error);
            }
        }
    }
}
