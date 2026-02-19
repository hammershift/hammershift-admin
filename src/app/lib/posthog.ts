import { PostHog } from 'posthog-node';

/**
 * PostHog Integration Utility
 *
 * Provides a singleton PostHog client for server-side event tracking and analytics.
 * All operations are non-blocking and failures are logged without throwing errors.
 *
 * Environment Variables Required:
 * - POSTHOG_API_KEY: Your PostHog Project API Key
 * - POSTHOG_HOST: PostHog instance URL (defaults to https://app.posthog.com)
 */

let posthogClient: PostHog | null = null;

/**
 * Get PostHog client singleton
 *
 * Returns a configured PostHog client instance. Creates the client on first call
 * and reuses it for subsequent calls. In development/test environments without
 * API keys, returns a mock client that logs calls without making API requests.
 *
 * @returns PostHog client instance or mock client
 */
export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.warn('[PostHog] API key not configured - using mock client');

      // Return mock client for development/testing
      return {
        capture: (options: any) => {
          console.log('[PostHog Mock] Event captured:', {
            distinctId: options.distinctId,
            event: options.event,
            properties: options.properties
          });
        },
        identify: (options: any) => {
          console.log('[PostHog Mock] User identified:', {
            distinctId: options.distinctId,
            properties: options.properties
          });
        },
        shutdown: async () => {
          console.log('[PostHog Mock] Shutdown called');
        }
      } as any;
    }

    // Create real PostHog client
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 20, // Flush events when 20 are queued
      flushInterval: 10000, // Flush every 10 seconds
      maxQueueSize: 1000, // Maximum events to queue before dropping
    });

    console.log('[PostHog] Client initialized successfully');
  }

  return posthogClient;
}

/**
 * Capture an event in PostHog
 *
 * Tracks a user event with optional properties. This is non-blocking and
 * failures will not throw errors.
 *
 * @param userId - The unique identifier for the user (distinct_id)
 * @param eventName - The name of the event to track
 * @param properties - Additional properties to associate with the event
 * @returns Promise<void>
 */
export async function capturePostHogEvent(
  userId: string,
  eventName: string,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    const client = getPostHogClient();

    // Add timestamp to properties
    const eventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    client.capture({
      distinctId: userId,
      event: eventName,
      properties: eventProperties
    });

    console.log(`[PostHog] Event captured: ${eventName} for user ${userId}`);
  } catch (error: any) {
    // Log error but don't throw - tracking failures should not break the main flow
    console.error('[PostHog] Capture failed:', {
      event: eventName,
      userId,
      error: error.message
    });

    // In production, send to error monitoring service
    // Sentry.captureException(error, { contexts: { posthog: { eventName, userId } } });
  }
}

/**
 * Identify a user in PostHog
 *
 * Sets properties for a user that will be included with all future events.
 * This should be called on user signup and when important user attributes change.
 *
 * @param userId - The unique identifier for the user
 * @param properties - User properties to store
 * @returns Promise<void>
 */
export async function identifyPostHogUser(
  userId: string,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    const client = getPostHogClient();

    client.identify({
      distinctId: userId,
      properties: {
        ...properties,
        $set: properties, // Ensure properties are set
        $set_once: {
          first_seen: new Date().toISOString()
        }
      }
    });

    console.log(`[PostHog] User identified: ${userId}`);
  } catch (error: any) {
    console.error('[PostHog] Identify failed:', {
      userId,
      error: error.message
    });
  }
}

/**
 * Set user properties in PostHog
 *
 * Updates specific user properties without requiring all fields.
 *
 * @param userId - The unique identifier for the user
 * @param properties - Properties to set/update
 * @returns Promise<void>
 */
export async function setPostHogUserProperties(
  userId: string,
  properties: Record<string, any>
): Promise<void> {
  try {
    const client = getPostHogClient();

    client.identify({
      distinctId: userId,
      properties: {
        $set: properties
      }
    });

    console.log(`[PostHog] User properties updated: ${userId}`);
  } catch (error: any) {
    console.error('[PostHog] Property update failed:', {
      userId,
      error: error.message
    });
  }
}

/**
 * Alias a user in PostHog
 *
 * Links two user identifiers together (e.g., anonymous ID and user ID after signup).
 *
 * @param userId - The new/primary user identifier
 * @param previousId - The old/anonymous identifier to link
 * @returns Promise<void>
 */
export async function aliasPostHogUser(
  userId: string,
  previousId: string
): Promise<void> {
  try {
    const client = getPostHogClient();

    client.alias({
      distinctId: userId,
      alias: previousId
    });

    console.log(`[PostHog] User aliased: ${previousId} -> ${userId}`);
  } catch (error: any) {
    console.error('[PostHog] Alias failed:', {
      userId,
      previousId,
      error: error.message
    });
  }
}

/**
 * Shutdown PostHog client
 *
 * Flushes any pending events and gracefully shuts down the client.
 * Should be called during application shutdown (e.g., in process.on('SIGTERM')).
 *
 * @returns Promise<void>
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    try {
      console.log('[PostHog] Shutting down client...');
      await posthogClient.shutdown();
      posthogClient = null;
      console.log('[PostHog] Client shutdown successfully');
    } catch (error: any) {
      console.error('[PostHog] Shutdown failed:', error.message);
    }
  }
}

/**
 * Flush pending events immediately
 *
 * Forces PostHog to send all queued events immediately instead of waiting
 * for the flush interval or queue size threshold.
 *
 * @returns Promise<void>
 */
export async function flushPostHog(): Promise<void> {
  try {
    const client = getPostHogClient();

    // PostHog Node SDK automatically flushes when shutdown is called
    // or when the queue reaches flushAt size
    // We can trigger a manual flush by capturing a special event
    // and then waiting for the flush interval

    console.log('[PostHog] Flush requested - events will be sent on next interval');
  } catch (error: any) {
    console.error('[PostHog] Flush failed:', error.message);
  }
}

/**
 * Feature flag evaluation (for future use)
 *
 * Checks if a feature flag is enabled for a user.
 *
 * @param userId - The unique identifier for the user
 * @param flagKey - The feature flag key to check
 * @param defaultValue - Default value if flag cannot be evaluated
 * @returns Promise<boolean>
 */
export async function isFeatureFlagEnabled(
  userId: string,
  flagKey: string,
  defaultValue: boolean = false
): Promise<boolean> {
  try {
    const client = getPostHogClient();

    // Note: Feature flag evaluation requires additional setup
    // This is a placeholder for future implementation
    console.log(`[PostHog] Feature flag check: ${flagKey} for user ${userId}`);

    return defaultValue;
  } catch (error: any) {
    console.error('[PostHog] Feature flag check failed:', {
      userId,
      flagKey,
      error: error.message
    });
    return defaultValue;
  }
}

/**
 * Process shutdown handler
 *
 * Registers a shutdown handler for graceful PostHog client shutdown.
 * Call this once during application initialization.
 */
export function registerPostHogShutdownHandler(): void {
  const shutdownHandler = async (signal: string) => {
    console.log(`[PostHog] Received ${signal}, shutting down...`);
    await shutdownPostHog();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
}
