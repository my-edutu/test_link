import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

/**
 * JWT Payload structure from Clerk Auth tokens
 */
export interface JwtPayload {
    sub: string; // User ID (Clerk user ID)
    email?: string;
    phone?: string;
    role?: string;
    aal?: string; // Authenticator Assurance Level
    amr?: Array<{ method: string; timestamp: number }>;
    session_id?: string;
    sid?: string; // Clerk session ID
    iss?: string;
    iat?: number;
    exp?: number;
    azp?: string; // Authorized party (Clerk)
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
 * JWT Strategy for validating Clerk Auth tokens.
 *
 * This strategy extracts the JWT from the Authorization Bearer header
 * and validates it using Clerk's JWKS endpoint (RS256).
 * Falls back to Supabase JWT secret (HS256) if CLERK_JWKS_URL not configured.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        const options = JwtStrategy.getStrategyOptions(configService);
        super(options);
    }

    private static getStrategyOptions(configService: ConfigService): any {
        const clerkJwksUrl = configService.get<string>('CLERK_JWKS_URL');
        const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

        // Prioritize Supabase JWT Secret (HS256) because the frontend sends 
        // tokens generated with the 'supabase' template (HS256).
        if (jwtSecret) {
            return {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKey: jwtSecret,
                algorithms: ['HS256'],
            };
        } else if (clerkJwksUrl) {
            console.warn('⚠️  SUPABASE_JWT_SECRET not configured. Using Clerk JWKS (RS256).');
            return {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKeyProvider: passportJwtSecret({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: clerkJwksUrl,
                }),
                algorithms: ['RS256'],
            };
        } else {
            console.warn('⚠️  No JWT configuration found. Using fallback mode.');
            return {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKey: 'fallback-secret-for-development',
                algorithms: ['HS256'],
            };
        }
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
