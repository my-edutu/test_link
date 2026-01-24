import { Controller, Post, Delete, Body, HttpCode, HttpStatus, Logger, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { RegisterPushTokenDto, UnregisterPushTokenDto } from './dto/register-token.dto';

@Controller('notifications')
export class NotificationController {
    private readonly logger = new Logger(NotificationController.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) {}

    /**
     * Register a push token for a user.
     * Called when the mobile app requests notification permissions.
     */
    @Post('register-token')
    @HttpCode(HttpStatus.OK)
    async registerToken(@Body() dto: RegisterPushTokenDto): Promise<{ success: boolean }> {
        this.logger.log(`Registering push token for user ${dto.userId}`);

        try {
            await this.db
                .update(schema.profiles)
                .set({
                    expoPushToken: dto.expoPushToken,
                    updatedAt: new Date(),
                })
                .where(eq(schema.profiles.id, dto.userId));

            this.logger.log(`Push token registered for user ${dto.userId}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to register push token for user ${dto.userId}:`, error);
            throw error;
        }
    }

    /**
     * Unregister/remove a push token for a user.
     * Called when user logs out or disables notifications.
     */
    @Delete('unregister-token')
    @HttpCode(HttpStatus.OK)
    async unregisterToken(@Body() dto: UnregisterPushTokenDto): Promise<{ success: boolean }> {
        this.logger.log(`Unregistering push token for user ${dto.userId}`);

        try {
            await this.db
                .update(schema.profiles)
                .set({
                    expoPushToken: null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.profiles.id, dto.userId));

            this.logger.log(`Push token unregistered for user ${dto.userId}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to unregister push token for user ${dto.userId}:`, error);
            throw error;
        }
    }
}
