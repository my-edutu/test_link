import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

/**
 * Auth Module
 * 
 * Provides JWT authentication using Supabase tokens.
 * This module is global so guards can be used anywhere.
 * 
 * Required environment variables:
 * - SUPABASE_JWT_SECRET: The JWT secret from your Supabase project settings
 * - ALLOW_LEGACY_AUTH: Set to 'true' to allow x-user-id header (deprecated)
 */
@Global()
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('SUPABASE_JWT_SECRET'),
                signOptions: { expiresIn: '7d' },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        AdminGuard,
    ],
    exports: [
        JwtStrategy,
        JwtAuthGuard,
        AdminGuard,
        PassportModule,
        JwtModule,
    ],
})
export class AuthModule { }
