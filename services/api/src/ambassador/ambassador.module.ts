import { Module } from '@nestjs/common';
import { AmbassadorService } from './ambassador.service';
import { AmbassadorController } from './ambassador.controller';
import { MonetizationModule } from '../monetization/monetization.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [
        DatabaseModule,
        MonetizationModule,
    ],
    controllers: [AmbassadorController],
    providers: [AmbassadorService],
})
export class AmbassadorModule { }
