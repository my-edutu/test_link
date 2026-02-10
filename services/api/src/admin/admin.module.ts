import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminPayoutController } from './admin-payout.controller';
import { AdminPayoutService } from './admin-payout.service';
import { CommonModule } from '../common/common.module';
import { NotificationModule } from '../notifications/notification.module';

/**
 * Admin Module
 * 
 * Provides secure administrative functionality including:
 * - Payout management with encrypted account handling
 * - Audit logging for all sensitive actions
 * - Role-based access control
 */
@Module({
    imports: [CommonModule, NotificationModule],
    controllers: [AdminController, AdminPayoutController],
    providers: [AdminPayoutService],
    exports: [AdminPayoutService],
})
export class AdminModule { }
