import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * JWT Authentication Guard
 * 
 * Protects endpoints by requiring a valid Supabase JWT token.
 * Use @UseGuards(JwtAuthGuard) on controllers or endpoints.
 * 
 * For public endpoints, use @Public() decorator to bypass authentication.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Check if endpoint is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();

        // Log authentication attempts in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(
                `Auth attempt: ${request.method} ${request.url} - User: ${user?.id || 'none'}`,
            );
        }

        // SECURITY: Strict JWT authentication required
        // Legacy x-user-id header authentication has been removed for security
        if (err || !user) {
            // Log failed authentication attempts
            this.logger.warn(
                `Authentication failed for ${request.method} ${request.url}: ${info?.message || 'No valid token'}`,
            );

            throw new UnauthorizedException(
                info?.message || 'Authentication required. Please provide a valid JWT token.',
            );
        }

        return user;
    }
}
