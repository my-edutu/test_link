// services/api/src/analytics/analytics.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

export interface CaptureEventOptions {
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface IdentifyUserOptions {
  distinctId: string;
  properties?: Record<string, any>;
}

// Server-side analytics event names
export const ServerAnalyticsEvents = {
  // Financial events (sensitive, must be server-side)
  PAYOUT_CREDITED: 'payout_credited',
  WITHDRAWAL_COMPLETED: 'withdrawal_completed',
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',

  // Validation events
  CONSENSUS_REACHED: 'consensus_reached',
  VALIDATION_PROCESSED: 'validation_processed',

  // Content moderation
  CONTENT_FLAGGED: 'content_flagged',
  CONTENT_REVIEWED: 'content_reviewed',

  // API events
  API_REQUEST: 'api_request',
  API_ERROR: 'api_error',
} as const;

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;
  private isEnabled: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host = this.configService.get<string>('POSTHOG_HOST') || 'https://app.posthog.com';

    if (!apiKey) {
      this.logger.warn('PostHog API key not configured. Analytics disabled.');
      return;
    }

    try {
      this.client = new PostHog(apiKey, {
        host,
        flushAt: 20,
        flushInterval: 10000, // 10 seconds
      });
      this.isEnabled = true;
      this.logger.log('PostHog analytics initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PostHog:', error);
    }
  }

  /**
   * Capture a custom event
   * @param options Event capture options
   */
  capture(options: CaptureEventOptions): void {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      this.client.capture({
        distinctId: options.distinctId,
        event: options.event,
        properties: {
          ...options.properties,
          source: 'server',
          timestamp: options.timestamp || new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to capture event ${options.event}:`, error);
    }
  }

  /**
   * Identify a user with their properties
   * @param options Identify options
   */
  identify(options: IdentifyUserOptions): void {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      this.client.identify({
        distinctId: options.distinctId,
        properties: options.properties,
      });
    } catch (error) {
      this.logger.error(`Failed to identify user ${options.distinctId}:`, error);
    }
  }

  /**
   * Track a payout credited event
   */
  trackPayoutCredited(
    userId: string,
    amount: number,
    currency: string,
    reason: string,
    clipId?: string,
  ): void {
    this.capture({
      distinctId: userId,
      event: ServerAnalyticsEvents.PAYOUT_CREDITED,
      properties: {
        amount,
        currency,
        reason,
        clip_id: clipId,
      },
    });
  }

  /**
   * Track a withdrawal completed event
   */
  trackWithdrawalCompleted(
    userId: string,
    amount: number,
    currency: string,
    method: string,
    transactionId?: string,
  ): void {
    this.capture({
      distinctId: userId,
      event: ServerAnalyticsEvents.WITHDRAWAL_COMPLETED,
      properties: {
        amount,
        currency,
        method,
        transaction_id: transactionId,
      },
    });
  }

  /**
   * Track a withdrawal requested event
   */
  trackWithdrawalRequested(
    userId: string,
    amount: number,
    currency: string,
    method: string,
  ): void {
    this.capture({
      distinctId: userId,
      event: ServerAnalyticsEvents.WITHDRAWAL_REQUESTED,
      properties: {
        amount,
        currency,
        method,
      },
    });
  }

  /**
   * Track consensus reached event
   */
  trackConsensusReached(
    clipId: string,
    validatorCount: number,
    consensusResult: 'correct' | 'incorrect',
    language: string,
  ): void {
    this.capture({
      distinctId: clipId, // Use clip ID as distinct ID for clip-level events
      event: ServerAnalyticsEvents.CONSENSUS_REACHED,
      properties: {
        clip_id: clipId,
        validator_count: validatorCount,
        consensus_result: consensusResult,
        language,
      },
    });
  }

  /**
   * Track API request for analytics
   */
  trackApiRequest(
    userId: string | null,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    userAgent?: string,
  ): void {
    this.capture({
      distinctId: userId || 'anonymous',
      event: ServerAnalyticsEvents.API_REQUEST,
      properties: {
        method,
        path,
        status_code: statusCode,
        duration_ms: durationMs,
        user_agent: userAgent,
      },
    });
  }

  /**
   * Track API error
   */
  trackApiError(
    userId: string | null,
    method: string,
    path: string,
    errorMessage: string,
    errorCode?: string,
  ): void {
    this.capture({
      distinctId: userId || 'anonymous',
      event: ServerAnalyticsEvents.API_ERROR,
      properties: {
        method,
        path,
        error_message: errorMessage,
        error_code: errorCode,
      },
    });
  }

  /**
   * Flush any pending events
   */
  async flush(): Promise<void> {
    if (this.client) {
      await this.client.flush();
    }
  }

  /**
   * Shutdown the analytics client
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.logger.log('PostHog analytics shutdown complete');
    }
  }
}
