import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WithdrawalController } from './withdrawal.controller';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { TopUpController } from './top-up.controller';

@Module({
    controllers: [PaymentController, WithdrawalController, BankController, TopUpController],
    providers: [PaymentService, BankService],
    exports: [PaymentService, BankService],
})
export class PaymentModule { }
