import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';

export interface AmbassadorApplication {
    region: string;
    motivation: string;
    experienceDetails: string;
}

export interface AmbassadorDashboard {
    userRole: string;
    region: string;
    totalUsers: number;
    activeValidators: number;
    monthlyStipend: number;
    topContributors: any[]; // schema.profiles[]
}

@Injectable()
export class AmbassadorService {
    private readonly logger = new Logger(AmbassadorService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Submit an application to become an ambassador.
     */
    async applyForAmbassador(userId: string, application: AmbassadorApplication): Promise<void> {
        this.logger.log(`User ${userId} applying for Ambassador of ${application.region}`);

        // Check if already applied or is ambassador
        const [existing] = await this.db
            .select()
            .from(schema.ambassadorApplications)
            .where(
                and(
                    eq(schema.ambassadorApplications.userId, userId),
                    eq(schema.ambassadorApplications.status, 'pending')
                )
            );

        if (existing) {
            throw new Error('You already have a pending ambassador application.');
        }

        // Create application record
        await this.db.insert(schema.ambassadorApplications).values({
            userId,
            region: application.region,
            motivation: application.motivation,
            experienceDetails: application.experienceDetails,
            status: 'pending',
        });

        // Notify admins (implementation depends on admin notification system)
        this.logger.log(`Ambassador application submitted for ${application.region}`);
    }

    /**
     * Admin approves an ambassador application.
     */
    async approveAmbassador(
        userId: string,
        region: string,
        monthlyStipend: number,
        approvedByAdminId: string
    ): Promise<void> {
        await this.db.transaction(async (tx) => {
            // 1. Promote user to ambassador
            await tx
                .update(schema.profiles)
                .set({
                    userRole: 'ambassador',
                    ambassadorRegion: region,
                    ambassadorMonthlyStipend: monthlyStipend.toString(),
                    ambassadorApprovedBy: approvedByAdminId,
                    promotedToAmbassadorAt: sql`now()`,
                })
                .where(eq(schema.profiles.id, userId));

            // 2. Update application status
            await tx
                .update(schema.ambassadorApplications)
                .set({ status: 'approved', processedAt: sql`now()`, processedBy: approvedByAdminId })
                .where(eq(schema.ambassadorApplications.userId, userId));

            // 3. Send notification
            await tx.insert(schema.notificationOutbox).values({
                eventType: 'ambassador.approved', // Custom event string or add to enum
                payload: {
                    userId,
                    region,
                    stipend: monthlyStipend,
                    title: 'Welcome to the Ambassador Team! 🌟',
                    body: `You are now the official Ambassador for ${region}.`,
                },
            });

            this.logger.log(`User ${userId} approved as Ambassador for ${region}`);
        });
    }

    /**
     * Get dashboard data for an ambassador.
     * Shows regional stats: total users, validators, and leaderboard.
     */
    async getAmbassadorDashboard(userId: string): Promise<AmbassadorDashboard> {
        const [user] = await this.db
            .select()
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        if (!user || user.userRole !== 'ambassador') {
            throw new UnauthorizedException('Access denied: You are not an Ambassador.');
        }

        const region = user.ambassadorRegion;

        const regionalUsers = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.profiles)
            // .where(sql`region = ${region} OR ambassador_region = ${region}`) // Placeholder logic
            .where(sql`TRUE`); // Placeholder for now

        const regionalValidators = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.profiles)
            .where(
                and(
                    eq(schema.profiles.userRole, 'validator'),
                    // sql`region = ${region}`
                    sql`TRUE`
                )
            );

        const topContributors = await this.db
            .select()
            .from(schema.profiles)
            // .where(sql`region = ${region}`)
            .orderBy(desc(schema.profiles.totalEarned))
            .limit(10);

        return {
            userRole: 'ambassador',
            region: region || 'Global',
            totalUsers: Number(regionalUsers[0]?.count || 0),
            activeValidators: Number(regionalValidators[0]?.count || 0),
            monthlyStipend: Number(user.ambassadorMonthlyStipend || 0),
            topContributors: topContributors,
        };
    }

    /**
     * Get basic ambassador stats (Referrals, Conversions, Earnings)
     */
    async getStats(userId: string) {
        const [user] = await this.db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
        if (!user) throw new Error('User not found');

        const referralCode = '@' + user.username;

        // Count referrals (users who have this user's username as referredBy)
        const [referrals] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.profiles)
            .where(eq(schema.profiles.referredBy, referralCode));

        // Count conversions (referrals who have validated at least 1 clip)
        const [conversions] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.profiles)
            .where(and(
                eq(schema.profiles.referredBy, referralCode),
                sql`total_validations_count > 0`
            ));

        return {
            totalReferrals: Number(referrals?.count || 0),
            totalConversions: Number(conversions?.count || 0),
            totalEarnings: Number(user.totalEarned || 0),
        };
    }

    /**
     * Get global ambassador leaderboard
     */
    async getLeaderboard() {
        // Return top earners among ambassadors
        const topAmbassadors = await this.db
            .select()
            .from(schema.profiles)
            .where(eq(schema.profiles.userRole, 'ambassador'))
            .orderBy(desc(schema.profiles.totalEarned))
            .limit(10);

        return topAmbassadors.map(p => ({
            ambassadorId: p.username || p.id,
            totalConversions: p.totalValidationsCount || 0, // Using val count as proxy for now
            totalEarnings: Number(p.totalEarned || 0)
        }));
    }

    /**
     * Track a new referral
     */
    async trackReferral(userId: string, code: string) {
        // Basic implementation: updates profile.referredBy
        await this.db
            .update(schema.profiles)
            .set({ referredBy: code })
            .where(eq(schema.profiles.id, userId));
    }

    /**
     * Claim a vanity code for the ambassador.
     */
    async claimVanityCode(userId: string, code: string): Promise<void> {
        // Check if code is taken by anyone else
        const [existing] = await this.db.select().from(schema.profiles).where(eq(schema.profiles.vanityCode, code));

        if (existing) {
            if (existing.id === userId) return; // already claimed by this user
            throw new Error('Code already taken');
        }

        await this.db
            .update(schema.profiles)
            .set({ vanityCode: code })
            .where(eq(schema.profiles.id, userId));

        this.logger.log(`User ${userId} claimed vanity code ${code}`);
    }
}
