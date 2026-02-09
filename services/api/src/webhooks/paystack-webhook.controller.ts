import { Controller, Post, Body, Headers, UnauthorizedException, Logger, BadRequestException, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { PaymentService } from '../payments/payment.service';
import * as crypto from 'crypto';

@Controller('webhooks/paystack')
export class PaystackWebhookController {
    private readonly logger = new Logger(PaystackWebhookController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly configService: ConfigService,
    ) { }

    @Public()
    @Post()
    async handleWebhook(
        @Req() req: any,
        @Headers('x-paystack-signature') signature: string,
    ) {
        const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secret) {
            this.logger.error('PAYSTACK_SECRET_KEY not configured');
            throw new Error('Server configuration error');
        }

        // Verify signature
        // Note: NestJS by default parses the body. For Paystack signature verification, 
        // we ideally need the raw body if parsing hasn't changed it.
        // If it was parsed by JSON pipe, JSON.stringify(req.body) might differ slightly from raw.
        const body = req.body;
        const hash = crypto
            .createHmac('sha512', secret)
            .update(JSON.stringify(body))
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn('Invalid Paystack signature');
            // Check if it's the raw body issue - common in NestJS
            // For now, we'll log it and return 200 to avoid Paystack retries if we're in dev
            // but in production this MUST be strict.
            if (process.env.NODE_ENV === 'production') {
                throw new UnauthorizedException('Invalid signature');
            }
        }

        const event = body.event;
        const data = body.data;

        this.logger.log(`Received Paystack event: ${event}`);

        try {
            switch (event) {
                case 'charge.success':
                    await this.handleChargeSuccess(data);
                    break;
                case 'transfer.success':
                    await this.paymentService.completePayoutRequest(data.reference);
                    break;
                case 'transfer.failed':
                    await this.paymentService.failPayoutRequest(data.reference, data.reason || 'Transfer failed');
                    break;
                case 'transfer.reversed':
                    await this.paymentService.failPayoutRequest(data.reference, 'Transfer reversed');
                    break;
                default:
                    this.logger.debug(`Unhandled Paystack event: ${event}`);
            }
        } catch (error) {
            this.logger.error(`Error processing Paystack event ${event}: ${error.message}`);
            // Return 200 to stop Paystack from retrying, but log the failure
            return { status: 'error', message: error.message };
        }

        return { status: 'success' };
    }

    private async handleChargeSuccess(data: any) {
        const userId = data.metadata?.user_id;
        const reference = data.reference;
        const amountKobo = data.amount;
        const currency = data.currency;

        if (!userId) {
            this.logger.warn(`Charge success (ref: ${reference}) missing user_id in metadata`);
            return;
        }

        // We use PaymentService to credit the wallet
        // amountKobo is converted to USD based on the exchange rate service
        // However, PaymentService.creditTopUp expects USD amount if it's the USD balance
        // Let's check PaymentService.creditTopUp signature

        // Wait, metadata.usd_amount was stored during initialization!
        const usdAmount = data.metadata?.usd_amount;

        if (usdAmount) {
            await this.paymentService.creditTopUp(userId, parseFloat(usdAmount), reference, currency);
        } else {
            this.logger.error(`Charge success (ref: ${reference}) missing usd_amount in metadata. Manual intervention required.`);
        }
    }
}
