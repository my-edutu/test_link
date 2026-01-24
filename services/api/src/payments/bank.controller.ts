import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    HttpCode,
    HttpStatus,
    Logger,
    UseGuards,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { JwtAuthGuard, CurrentUser, Public, AuthUser } from '../auth';
import { IsString, Length } from 'class-validator';

/**
 * Validated DTO for bank resolution
 */
class ResolveBankDto {
    @IsString()
    @Length(10, 10, { message: 'Account number must be 10 digits' })
    accountNumber: string;

    @IsString()
    @Length(3, 10, { message: 'Bank code required' })
    bankCode: string;
}

/**
 * Validated DTO for bank linking
 */
class LinkBankDto {
    @IsString()
    @Length(10, 10, { message: 'Account number must be 10 digits' })
    accountNumber: string;

    @IsString()
    @Length(3, 10, { message: 'Bank code required' })
    bankCode: string;
}

/**
 * Bank Controller
 * Handles bank account verification and linking.
 * All endpoints require JWT authentication except bank list.
 */
@Controller('bank')
@UseGuards(JwtAuthGuard)
export class BankController {
    private readonly logger = new Logger(BankController.name);

    constructor(private readonly bankService: BankService) { }

    /**
     * Resolve/verify a bank account.
     * POST /bank/resolve
     * Returns the verified account holder's name.
     */
    @Post('resolve')
    @HttpCode(HttpStatus.OK)
    async resolveAccount(
        @Body() dto: ResolveBankDto,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Bank resolve request from ${user.id}: ${dto.bankCode} - ${dto.accountNumber.substring(0, 3)}****`);

        const result = await this.bankService.resolveAccount(
            dto.accountNumber,
            dto.bankCode,
        );

        return {
            success: true,
            data: {
                accountNumber: result.accountNumber,
                accountName: result.accountName,
                bankCode: result.bankCode,
                bankName: result.bankName,
            },
        };
    }

    /**
     * Get list of supported Nigerian banks.
     * GET /bank/list
     * Public endpoint - no auth required.
     */
    @Get('list')
    @Public()
    async getBankList() {
        const banks = await this.bankService.getBankList();
        return {
            success: true,
            data: banks,
        };
    }

    /**
     * Link a verified bank account to user's profile.
     * POST /bank/link
     */
    @Post('link')
    @HttpCode(HttpStatus.OK)
    async linkBankAccount(
        @Body() dto: LinkBankDto,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Bank link request from ${user.id}`);

        const result = await this.bankService.linkBankAccount(
            user.id,
            dto.accountNumber,
            dto.bankCode,
        );

        return {
            success: true,
            data: {
                accountName: result.accountName,
                bankName: result.bankName,
                message: 'Bank account linked successfully',
            },
        };
    }

    /**
     * Get user's linked bank account.
     * GET /bank/linked
     */
    @Get('linked')
    async getLinkedBank(@CurrentUser() user: AuthUser) {
        const linkedBank = await this.bankService.getLinkedBank(user.id);

        if (!linkedBank) {
            return {
                success: true,
                data: null,
                message: 'No bank account linked',
            };
        }

        return {
            success: true,
            data: {
                bankName: linkedBank.bankName,
                bankCode: linkedBank.bankCode,
                accountNumberLast4: linkedBank.accountNumberLast4,
                accountName: linkedBank.accountName,
            },
        };
    }

    /**
     * Unlink bank account from profile.
     * DELETE /bank/unlink
     */
    @Delete('unlink')
    @HttpCode(HttpStatus.OK)
    async unlinkBankAccount(@CurrentUser() user: AuthUser) {
        this.logger.log(`Bank unlink request from ${user.id}`);

        await this.bankService.unlinkBankAccount(user.id);

        return {
            success: true,
            message: 'Bank account unlinked successfully',
        };
    }
}
