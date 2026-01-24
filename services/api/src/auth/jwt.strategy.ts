import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Payload structure from Supabase Auth tokens
 */
export interface JwtPayload {
    sub: string; // User ID
    email?: string;
    phone?: string;
    role?: string;
    aal?: string; // Authenticator Assurance Level
    amr?: Array<{ method: string; timestamp: number }>;
    session_id?: string;
    iss?: string;
    iat?: number;
    exp?: number;
}

/**
 * Authenticated user object attached to requests
 */
export interface AuthUser {
    id: string;
    email?: string;
    role?: string;
}

/**
 * JWT Strategy for validating Supabase Auth tokens.
 * 
 * This strategy extracts the JWT from the Authorization Bearer header
 * and validates it using the SUPABASE_JWT_SECRET.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

        if (!jwtSecret) {
            console.warn('⚠️  SUPABASE_JWT_SECRET not configured. Using fallback mode.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret || 'fallback-secret-for-development',
            algorithms: ['HS256'],
        });
    }

    /**
     * Validate the JWT payload and return the authenticated user.
     * This user object will be attached to the request.
     */
    async validate(payload: JwtPayload): Promise<AuthUser> {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token: missing user ID');
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
