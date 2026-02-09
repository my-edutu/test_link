import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    UnauthorizedException,
    BadRequestException,
    RawBodyRequest,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaystackIpGuard } from '../common/guards/paystack-ip.guard';

interface PaystackWebhookPayload {
    event: string;
    data: {
        id: number;
        reference: string;
        amount: number; // in kobo (1/100 of Naira)
        currency: string;
        status: string;
        customer: {
            email: string;
            customer_code: string;
            metadata?: {
                user_id?: string;
            };
        };
        metadata?: {
            user_id?: string;
        };
    };
}

/**
 * Payment Controller
 * Handles webhook events from Paystack for balance top-ups.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);
    private readonly paystackSecret: string;

    constructor(
        private readonly paymentService: PaymentService,
        private readonly configService: ConfigService,
    ) {
        this.paystackSecret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    }

    /**
     * Paystack webhook endpoint.
     * POST /webhooks/paystack
     *
     * Security:
     * 1. PaystackIpGuard - Verifies request comes from Paystack's IP addresses
     * 2. Signature verification - Validates HMAC SHA512 signature
     */
    @Post('paystack')
    @UseGuards(PaystackIpGuard)
    @HttpCode(HttpStatus.OK)
    async handlePaystackWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-paystack-signature') signature: string,
        @Body() payload: PaystackWebhookPayload,
    ) {
        // 1. Verify webhook signature
        if (!this.verifyPaystackSignature(req.rawBody, signature)) {
            this.logger.warn('Invalid Paystack webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        this.logger.log(`Paystack webhook received: ${payload.event}`);

        // 2. Handle different event types
        switch (payload.event) {
            case 'charge.success':
                return this.handleChargeSuccess(payload.data);

            case 'transfer.success':
                return this.handleTransferSuccess(payload.data);

            case 'transfer.failed':
                return this.handleTransferFailed(payload.data);

            case 'transfer.reversed':
                return this.handleTransferReversed(payload.data);

            default:
                this.logger.debug(`Unhandled webhook event: ${payload.event}`);
                return { received: true };
        }
    }

    /**
     * Verify Paystack webhook signature using HMAC SHA512.
     */
    private verifyPaystackSignature(rawBody: Buffer | undefined, signature: string): boolean {
        if (!rawBody || !signature || !this.paystackSecret) {
            return false;
        }

        const hash = crypto
            .createHmac('sha512', this.paystackSecret)
            .update(rawBody)
            .digest('hex');

        return hash === signature;
    }

    /**
     * Handle successful charge (top-up).
     * Uses the exchange rate from payment metadata for accurate conversion.
     */
    private async handleChargeSuccess(data: PaystackWebhookPayload['data']) {
        const userId = data.metadata?.user_id || data.customer.metadata?.user_id;

        if (!userId) {
            this.logger.error(`No user_id found in charge metadata: ${data.reference}`);
            throw new BadRequestException('Missing user_id in payment metadata');
        }

        // Use the exchange rate from metadata if available (stored during initialization)
        // This ensures consistency between what user saw and what we credit
        const exchangeRate = (data.metadata as any)?.exchange_rate || 1500;
        const usdAmountFromMetadata = (data.metadata as any)?.usd_amount;

        // Prefer the original USD amount if stored, otherwise calculate
        let amountUsd: number;
        if (usdAmountFromMetadata && typeof usdAmountFromMetadata === 'number') {
            amountUsd = usdAmountFromMetadata;
            this.logger.debug(`Using stored USD amount: $${amountUsd} from metadata`);
        } else {
            // Fallback: Convert kobo to USD using exchange rate
            const amountNaira = data.amount / 100;
            amountUsd = amountNaira / exchangeRate;
            this.logger.debug(`Calculated USD amount: $${amountUsd} (rate: ${exchangeRate})`);
        }

        try {
            await this.paymentService.creditTopUp(
                userId,
                amountUsd,
                data.reference,
                data.currency,
            );

            this.logger.log(`Top-up successful: ${userId} credited $${amountUsd.toFixed(2)} (ref: ${data.reference})`);
            return { success: true, userId, amount: amountUsd };
        } catch (error) {
            this.logger.error(`Failed to process top-up: ${error}`);
            throw error;
        }
    }

    /**
     * Handle successful transfer (withdrawal payout).
     * Clears the locked/pending balance.
     */
    private async handleTransferSuccess(data: any) {
        const reference = data.reference;

        try {
            // Try new payout request system first, falls back to legacy
            await this.paymentService.completePayoutRequest(reference);
            this.logger.log(`Transfer completed: ${reference}`);
            return { success: true, reference };
        } catch (error) {
            this.logger.error(`Failed to process transfer completion: ${error}`);
            throw error;
        }
    }

    /**
     * Handle failed transfer (withdrawal failed).
     * Refunds the locked funds back to available balance.
     */
    private async handleTransferFailed(data: any) {
        const reference = data.reference;
        const reason = data.reason || data.message || 'Unknown error';

        try {
            // Try new payout request system first, falls back to legacy
            await this.paymentService.failPayoutRequest(reference, reason);
            this.logger.log(`Transfer failed and refunded: ${reference} - ${reason}`);
            return { success: true, reference, refunded: true };
        } catch (error) {
            this.logger.error(`Failed to process transfer failure: ${error}`);
            throw error;
        }
    }

    /**
     * Handle reversed transfer (manual reversal by Paystack).
     */
    private async handleTransferReversed(data: any) {
        const reference = data.reference;
        const reason = 'Transfer reversed by payment provider';

        try {
            await this.paymentService.failPayoutRequest(reference, reason);
            this.logger.log(`Transfer reversed and refunded: ${reference}`);
            return { success: true, reference, refunded: true };
        } catch (error) {
            this.logger.error(`Failed to process transfer reversal: ${error}`);
            throw error;
        }
    }
}
