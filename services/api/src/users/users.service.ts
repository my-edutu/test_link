import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { AmbassadorService } from '../ambassador/ambassador.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private ambassadorService: AmbassadorService,
    ) { }

    private generateReferralCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude easily confused chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return code;
    }

    async createProfileFromAuth(userData: {
        id: string;
        email: string;
        full_name?: string;
        username?: string;
        avatar_url?: string;
        primary_language?: string;
        country?: string;
        state?: string;
        city?: string;
        lga?: string;
        invite_code_input?: string;
    }) {
        const { id, email, full_name, username, avatar_url, primary_language, country, state, city, lga, invite_code_input } = userData;

        this.logger.log(`Creating/Syncing profile for user: ${id} (${email})`);

        return await this.db.transaction(async (tx) => {
            // 1. Check if profile exists
            const existing = await tx.query.profiles.findFirst({
                where: eq(schema.profiles.id, id),
            });

            if (existing) {
                this.logger.log(`Profile already exists for ${id}, skipping creation.`);
                return existing;
            }

            // 2. Determine base username if not provided
            const baseUsername = username || email.split('@')[0] || `user_${id.substring(0, 5)}`;

            // 3. Generate a unique vanity code for the user
            const vanityCode = this.generateReferralCode();

            // 4. Insert profile
            const [newProfile] = await tx.insert(schema.profiles).values({
                id,
                email,
                fullName: full_name || '',
                username: baseUsername,
                avatarUrl: avatar_url || '',
                primaryLanguage: primary_language || 'English',
                country: country || null,
                state: state || null,
                city: city || null,
                lga: lga || null,
                vanityCode,
                updatedAt: new Date(),
            }).returning();

            this.logger.log(`Profile created for ${id} with vanity code: ${vanityCode}`);

            // 5. Handle referral if invite code provided
            if (invite_code_input) {
                try {
                    this.logger.log(`Processing referral for ${id} with code: ${invite_code_input}`);
                    // We call the service method. Note: trackReferral currently doesn't 
                    // take a database transaction, but it's idempotent-ish.
                    // Ideally we'd pass 'tx' to ambassadorService, but let's keep it simple for now as it's a side-effect.
                    await this.ambassadorService.trackReferral(id, invite_code_input);
                } catch (err) {
                    this.logger.error(`Failed to track referral for ${id}: ${err.message}`);
                }
            }

            return newProfile;
        });
    }

    async findByUsername(username: string) {
        return await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.username, username),
        });
    }

    async updateProfile(userId: string, data: Partial<typeof schema.profiles.$inferInsert>) {
        return await this.db
            .update(schema.profiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.profiles.id, userId))
            .returning();
    }
}
