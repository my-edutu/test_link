import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import { IsNumber, Min, Max, IsEmail } from 'class-validator';

/**
 * Validated DTO for top-up requests
 */
class TopUpDto {
    @IsNumber()
    @Min(1, { message: 'Minimum top-up amount is $1.00' })
    @Max(10000, { message: 'Maximum top-up amount is $10,000.00' })
    amount: number;

    @IsEmail({}, { message: 'Valid email is required for receipt' })
    email: string;
}

/**
 * Top-Up Controller
 * Handles wallet top-up via Paystack.
 * All endpoints require JWT authentication.
 */
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class TopUpController {
    private readonly logger = new Logger(TopUpController.name);

    constructor(
        private readonly paymentService: PaymentService,
    ) { }

    /**
     * Initialize a Top-Up transaction.
     * POST /payments/top-up
     * Rate limited: 10 requests per minute
     */
    @Post('top-up')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
    async initializeTopUp(
        @Body() dto: TopUpDto,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Top-up initialization from ${user.id}: $${dto.amount}`);

        const result = await this.paymentService.initializeTopUp(user.id, dto.amount, dto.email);

        return {
            success: true,
            data: result, // { authorization_url, access_code, reference }
        };
    }
}
