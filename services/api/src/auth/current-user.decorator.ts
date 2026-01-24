import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './jwt.strategy';

/**
 * Current User Decorator
 * 
 * Extracts the authenticated user from the request object.
 * Must be used with JwtAuthGuard to ensure user is authenticated.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * async myEndpoint(@CurrentUser() user: AuthUser) {
 *   console.log(user.id); // Secure user ID from verified JWT
 * }
 * 
 * Can also extract specific properties:
 * @CurrentUser('id') userId: string
 * @CurrentUser('email') email: string
 */
export const CurrentUser = createParamDecorator(
    (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as AuthUser;

        // If a specific property is requested, return just that
        if (data) {
            return user?.[data];
        }

        return user;
    },
);
