import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AmbassadorModule } from '../ambassador/ambassador.module';

@Module({
  imports: [AmbassadorModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
