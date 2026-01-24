import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public endpoints
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public Decorator
 * 
 * Marks an endpoint as public, bypassing JWT authentication.
 * Use sparingly - only for endpoints that truly need to be public.
 * 
 * Usage:
 * @Public()
 * @Get('health')
 * healthCheck() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
