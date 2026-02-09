import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { LiveModule } from './live/live.module';
import { MonetizationModule } from './monetization/monetization.module';
import { NotificationModule } from './notifications/notification.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payments/payment.module';
import { ModerationModule } from './moderation/moderation.module';
import { AmbassadorModule } from './ambassador/ambassador.module';
import { BadgesModule } from './badges/badges.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CommonModule, // Global shared services (Encryption, Exchange Rate)
        EventEmitterModule.forRoot(),
        // Rate limiting: 100 requests per 60 seconds per IP
        ThrottlerModule.forRoot([{
            ttl: 60000, // 60 seconds
            limit: 100, // 100 requests
        }]),
        DatabaseModule,
        AuthModule, // JWT authentication
        LiveModule,
        MonetizationModule,
        NotificationModule,
        AdminModule,
        PaymentModule,
        ModerationModule,
        AmbassadorModule,
        BadgesModule,
        UsersModule,
        WebhooksModule,
    ],
    providers: [
        // Global rate limiting guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
