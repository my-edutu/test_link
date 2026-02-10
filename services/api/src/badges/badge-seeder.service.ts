import { Injectable, Inject, Logger } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class BadgeSeederService {
    private readonly logger = new Logger(BadgeSeederService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    private readonly badges = [
        {
            name: 'Voice Pioneer',
            description: 'You are among the first voices shaping LinguaLink.',
            imageUrl: 'https://img.icons8.com/color/96/micro.png',
            category: 'social',
            tier: 'bronze',
            requirementType: 'followers_count',
            requirementValue: 100,
            criteria: { unlock_reward: 'Early Access features', motivation: 'Shaping the future' }
        },
        {
            name: 'Cultural Connector',
            description: 'You helped connect communities through voice.',
            imageUrl: 'https://img.icons8.com/color/96/world-map.png',
            category: 'social',
            tier: 'silver',
            requirementType: 'followers_count',
            requirementValue: 500,
            criteria: { unlock_reward: 'Featured on regional leaderboard', motivation: 'Connecting communities' }
        },
        {
            name: 'Language Influencer',
            description: 'Your voice inspires others to speak their mother tongue.',
            imageUrl: 'https://img.icons8.com/color/96/campaign.png',
            category: 'social',
            tier: 'gold',
            requirementType: 'followers_count',
            requirementValue: 1000,
            criteria: { unlock_reward: 'Eligibility for mini-campaigns', motivation: 'Inspiring others' }
        },
        {
            name: 'Community Validator',
            description: 'Recognized for accuracy, impact, and community leadership.',
            imageUrl: 'https://img.icons8.com/color/96/verified-account.png',
            category: 'validator',
            tier: 'silver',
            requirementType: 'followers_count',
            requirementValue: 2000,
            criteria: { unlock_reward: 'Validation privileges & higher visibility', motivation: 'Accuracy & Leadership' }
        },
        {
            name: 'Lingua Ambassador',
            description: 'Your network is empowering voices across borders.',
            imageUrl: 'https://img.icons8.com/color/96/handshake.png',
            category: 'social',
            tier: 'gold',
            requirementType: 'followers_count',
            requirementValue: 5000,
            criteria: { unlock_reward: 'Ambassador title + benefits', motivation: 'Empowering voices' }
        },
        {
            name: 'AI Voice Leader',
            description: 'Your voice helped build the world\'s largest language AI.',
            imageUrl: 'https://img.icons8.com/color/96/artificial-intelligence.png',
            category: 'social',
            tier: 'gold',
            requirementType: 'followers_count',
            requirementValue: 10000,
            criteria: { unlock_reward: 'Early Monetization Unlock', motivation: 'Building the future of AI' }
        }
    ];

    async seed() {
        this.logger.log('Starting badge seeding...');

        for (const badge of this.badges) {
            const existing = await this.db.query.badges.findFirst({
                where: eq(schema.badges.name, badge.name)
            });

            if (!existing) {
                await this.db.insert(schema.badges).values({
                    name: badge.name,
                    description: badge.description,
                    imageUrl: badge.imageUrl,
                    category: badge.category as any,
                    tier: badge.tier as any,
                    requirementType: badge.requirementType,
                    requirementValue: badge.requirementValue,
                    criteria: badge.criteria
                });
                this.logger.log(`Inserted badge: ${badge.name}`);
            } else {
                this.logger.debug(`Badge already exists: ${badge.name}`);
            }
        }

        this.logger.log('Badge seeding completed.');
    }
}
