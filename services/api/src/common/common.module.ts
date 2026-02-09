import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { ExchangeRateService } from './exchange-rate.service';
import { PaystackIpGuard } from './guards/paystack-ip.guard';

/**
 * Common Module
 *
 * Provides shared services across the application.
 * Marked as @Global so services don't need to import CommonModule explicitly.
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        EncryptionService,
        ExchangeRateService,
        PaystackIpGuard,
    ],
    exports: [
        EncryptionService,
        ExchangeRateService,
        PaystackIpGuard,
    ],
})
export class CommonModule { }
