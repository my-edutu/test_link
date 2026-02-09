import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Logger,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Paystack's known IP addresses for webhook delivery.
 * These should be verified periodically against Paystack's documentation.
 * Last updated: January 2026
 *
 * Source: https://paystack.com/docs/payments/webhooks/#ip-whitelisting
 */
const PAYSTACK_IP_WHITELIST = [
    // Paystack production IPs
    '52.31.139.75',
    '52.49.173.169',
    '52.214.14.220',
    // Additional Paystack IPs (verify with their docs)
    '35.178.170.65',
    '52.56.107.238',
];

/**
 * Guard to verify that webhook requests originate from Paystack's servers.
 *
 * Security measures:
 * 1. Checks client IP against Paystack's known IP addresses
 * 2. Handles proxied requests (X-Forwarded-For header)
 * 3. Skips check in development mode for testing
 * 4. Logs all blocked attempts for security monitoring
 *
 * Usage:
 * @UseGuards(PaystackIpGuard)
 * @Post('webhook')
 * async handleWebhook() { ... }
 */
@Injectable()
export class PaystackIpGuard implements CanActivate {
    private readonly logger = new Logger(PaystackIpGuard.name);

    constructor(private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const clientIp = this.getClientIp(request);

        // Skip IP check in development/test mode
        const nodeEnv = this.configService.get<string>('NODE_ENV');
        if (nodeEnv === 'development' || nodeEnv === 'test') {
            this.logger.debug(`Skipping IP check in ${nodeEnv} mode. Client IP: ${clientIp}`);
            return true;
        }

        // Check if webhook IP verification is disabled (for testing with ngrok, etc.)
        const skipIpCheck = this.configService.get<string>('SKIP_WEBHOOK_IP_CHECK');
        if (skipIpCheck === 'true') {
            this.logger.warn(`Webhook IP check disabled via SKIP_WEBHOOK_IP_CHECK. Client IP: ${clientIp}`);
            return true;
        }

        // Verify IP is in whitelist
        const isAllowed = this.isIpWhitelisted(clientIp);

        if (!isAllowed) {
            this.logger.warn(
                `BLOCKED: Webhook request from unauthorized IP: ${clientIp}. ` +
                `Allowed IPs: ${PAYSTACK_IP_WHITELIST.join(', ')}`
            );
            throw new ForbiddenException('Unauthorized webhook source');
        }

        this.logger.debug(`Webhook request from authorized IP: ${clientIp}`);
        return true;
    }

    /**
     * Extract client IP from request, handling proxied requests.
     * Order of precedence:
     * 1. X-Forwarded-For header (first IP if multiple)
     * 2. X-Real-IP header
     * 3. request.ip (Express)
     * 4. connection.remoteAddress
     */
    private getClientIp(request: any): string {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        const forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
            const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
            return ips[0]; // First IP is the original client
        }

        // X-Real-IP is set by some proxies
        const realIp = request.headers['x-real-ip'];
        if (realIp) {
            return realIp;
        }

        // Express request.ip
        if (request.ip) {
            // Handle IPv6 localhost format
            if (request.ip === '::1') return '127.0.0.1';
            // Handle IPv6-mapped IPv4 addresses
            if (request.ip.startsWith('::ffff:')) {
                return request.ip.substring(7);
            }
            return request.ip;
        }

        // Fallback to connection remote address
        const remoteAddress = request.connection?.remoteAddress ||
                              request.socket?.remoteAddress ||
                              '';

        // Handle IPv6-mapped IPv4 addresses
        if (remoteAddress.startsWith('::ffff:')) {
            return remoteAddress.substring(7);
        }
        if (remoteAddress === '::1') return '127.0.0.1';

        return remoteAddress;
    }

    /**
     * Check if IP is in the Paystack whitelist.
     * Also allows localhost for development.
     */
    private isIpWhitelisted(ip: string): boolean {
        // Always allow localhost in any environment for testing
        const localhostIps = ['127.0.0.1', 'localhost', '::1'];
        if (localhostIps.includes(ip)) {
            this.logger.debug('Allowing localhost IP for testing');
            return true;
        }

        // Check against Paystack IPs
        return PAYSTACK_IP_WHITELIST.some(allowedIp => {
            // Exact match
            if (ip === allowedIp) return true;

            // Handle CIDR notation if needed in the future
            // For now, we only support exact IP matches
            return false;
        });
    }
}

/**
 * Export the whitelist for reference in documentation or tests
 */
export { PAYSTACK_IP_WHITELIST };
