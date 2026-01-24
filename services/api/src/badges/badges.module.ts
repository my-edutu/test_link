import { Module } from '@nestjs/common';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeAwarderService } from './badge-awarder.service';
import { CertificateService } from './certificate.service';

@Module({
    controllers: [BadgesController],
    providers: [BadgesService, BadgeAwarderService, CertificateService],
    exports: [BadgesService, BadgeAwarderService, CertificateService],
})
export class BadgesModule {}
