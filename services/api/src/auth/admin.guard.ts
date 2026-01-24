import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

/**
 * Admin Guard
 * 
 * Protects admin-only endpoints by checking if the authenticated user
 * has the is_admin flag set in their profile.
 * 
 * IMPORTANT: Must be used AFTER JwtAuthGuard to ensure user is authenticated.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * async myAdminEndpoint() { }
 */
@Injectable()
export class AdminGuard implements CanActivate {
    private readonly logger = new Logger(AdminGuard.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.id) {
            throw new ForbiddenException('Authentication required');
        }

        // Check if user is admin in the database
        const [profile] = await this.db
            .select({ isAdmin: schema.profiles.isAdmin })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, user.id))
            .limit(1);

        if (!profile || !profile.isAdmin) {
            this.logger.warn(`Non-admin user ${user.id} attempted to access admin endpoint`);
            throw new ForbiddenException('Admin access required');
        }

        this.logger.debug(`Admin access granted for user ${user.id}`);
        return true;
    }
}
