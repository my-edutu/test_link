import { Module } from '@nestjs/common';
import { MonetizationController } from './monetization.controller';
import { ValidationService } from './services/validation.service';
import { ConsensusService } from './services/consensus.service';
import { PayoutService } from './services/payout.service';
import { DisputeService } from './services/dispute.service';
import { RemixService } from './services/remix.service';

@Module({
    controllers: [MonetizationController],
    providers: [
        ValidationService,
        ConsensusService,
        PayoutService,
        DisputeService,
        RemixService,
    ],
    exports: [
        ValidationService,
        ConsensusService,
        PayoutService,
        DisputeService,
        RemixService,
    ],
})
export class MonetizationModule { }
