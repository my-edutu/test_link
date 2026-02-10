import { BadgeSeederService } from './badge-seeder.service';

@Module({
    controllers: [BadgesController],
    providers: [BadgesService, BadgeAwarderService, CertificateService, BadgeSeederService],
    exports: [BadgesService, BadgeAwarderService, CertificateService, BadgeSeederService],
})
export class BadgesModule { }
