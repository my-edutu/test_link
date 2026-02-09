import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { WebhooksService } from './webhooks.service';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payments/payment.module';

@Module({
  imports: [UsersModule, PaymentModule],
  controllers: [WebhooksController, PaystackWebhookController],
  providers: [WebhooksService]
})
export class WebhooksModule { }
