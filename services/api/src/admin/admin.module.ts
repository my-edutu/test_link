import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminPayoutController } from './admin-payout.controller';
import { AdminPayoutService } from './admin-payout.service';
import { CommonModule } from '../common/common.module';

/**
 * Admin Module
 * 
 * Provides secure administrative functionality including:
 * - Payout management with encrypted account handling
 * - Audit logging for all sensitive actions
 * - Role-based access control
 */
@Module({
    imports: [CommonModule],
    controllers: [AdminController, AdminPayoutController],
    providers: [AdminPayoutService],
    exports: [AdminPayoutService],
})
export class AdminModule { }
