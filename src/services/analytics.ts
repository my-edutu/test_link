// src/services/analytics.ts
// PostHog Analytics service for tracking user events and identification

import { usePostHog, PostHog } from 'posthog-react-native';

let posthogClient: PostHog | null = null;

export function setPostHogClient(client: PostHog) {
  posthogClient = client;
  console.log('[Analytics] PostHog client set externally');
}

/**
 * Initialize PostHog analytics
 * Should be called once at app startup
 * Note: PostHog is initialized via PostHogProvider in App.tsx
 */
export async function initAnalytics(apiKey: string, host?: string): Promise<PostHog | null> {
  if (posthogClient) {
    return posthogClient;
  }
  // Deprecated: initialization should happen in App.tsx and passed via setPostHogClient
  return null;
}

/**
 * Get the PostHog client instance
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

/**
 * Track a custom event
 * @param eventName - Name of the event (e.g., 'clip_recorded', 'validation_submitted')
 * @param properties - Optional properties to attach to the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!posthogClient) {
    console.warn('[Analytics] PostHog not initialized, skipping event:', eventName);
    return;
  }

  try {
    posthogClient.capture(eventName, properties);
    console.log('[Analytics] Event tracked:', eventName, properties);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', eventName, error);
  }
}

/**
 * Identify a user with their traits
 * Should be called after successful login
 * @param userId - Unique user identifier
 * @param traits - User properties like email, language, etc.
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  if (!posthogClient) {
    console.warn('[Analytics] PostHog not initialized, skipping identify');
    return;
  }

  try {
    posthogClient.identify(userId, traits);
    console.log('[Analytics] User identified:', userId);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Reset the current user (on logout)
 */
export function resetUser(): void {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.reset();
    console.log('[Analytics] User reset');
  } catch (error) {
    console.error('[Analytics] Failed to reset user:', error);
  }
}

/**
 * Set user properties without identifying
 * @param properties - Properties to set on the current user
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.capture('$set', { $set: properties });
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Track screen view manually
 * @param screenName - Name of the screen being viewed
 * @param properties - Optional additional properties
 */
export function trackScreenView(screenName: string, properties?: Record<string, any>): void {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.screen(screenName, properties);
  } catch (error) {
    console.error('[Analytics] Failed to track screen view:', error);
  }
}

/**
 * Flush any pending events immediately
 */
export async function flushEvents(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.flush();
    console.log('[Analytics] Events flushed');
  } catch (error) {
    console.error('[Analytics] Failed to flush events:', error);
  }
}

/**
 * Shutdown PostHog (call on app close)
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.flush();
    posthogClient = null;
    console.log('[Analytics] PostHog shutdown complete');
  } catch (error) {
    console.error('[Analytics] Failed to shutdown PostHog:', error);
  }
}

// Analytics event names for consistency
export const AnalyticsEvents = {
  // Recording events
  CLIP_RECORDED: 'clip_recorded',
  CLIP_UPLOADED: 'clip_uploaded',
  CLIP_DELETED: 'clip_deleted',

  // Validation events
  VALIDATION_SUBMITTED: 'validation_submitted',
  VALIDATION_SKIPPED: 'validation_skipped',

  // Financial events
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  PAYOUT_RECEIVED: 'payout_received',

  // Live streaming events
  LIVE_STREAM_STARTED: 'live_stream_started',
  LIVE_STREAM_ENDED: 'live_stream_ended',
  LIVE_STREAM_JOINED: 'live_stream_joined',

  // Call events
  VIDEO_CALL_STARTED: 'video_call_started',
  VIDEO_CALL_ENDED: 'video_call_ended',
  VOICE_CALL_STARTED: 'voice_call_started',
  VOICE_CALL_ENDED: 'voice_call_ended',

  // Auth events
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // Profile events
  PROFILE_UPDATED: 'profile_updated',
  LANGUAGE_CHANGED: 'language_changed',

  // Story events
  STORY_CREATED: 'story_created',
  STORY_VIEWED: 'story_viewed',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
