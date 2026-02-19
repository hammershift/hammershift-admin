import axios from 'axios';

/**
 * Customer.io Integration Utility
 *
 * Provides functions for tracking events and identifying users in Customer.io.
 * All API calls are non-blocking and failures are logged without throwing errors.
 *
 * Environment Variables Required:
 * - CUSTOMERIO_SITE_ID: Your Customer.io Site ID (Track API Key)
 * - CUSTOMERIO_API_KEY: Your Customer.io Track API Secret
 * - CUSTOMERIO_WEBHOOK_SECRET: Secret for verifying webhook signatures
 */

const CUSTOMERIO_API_BASE = 'https://track.customer.io/api/v2';

// Read credentials lazily at call time so tests can inject env vars after module load
function getCredentials() {
  return {
    key: process.env.CUSTOMERIO_SITE_ID,
    secret: process.env.CUSTOMERIO_API_KEY,
  };
}

/**
 * Track an event in Customer.io
 *
 * @param userId - The unique identifier for the user
 * @param eventName - The name of the event to track
 * @param eventData - Additional data associated with the event
 * @returns Promise<void> - Resolves when tracking is complete or fails silently
 */
export async function trackCustomerIOEvent(
  userId: string,
  eventName: string,
  eventData: object
): Promise<void> {
  const { key, secret } = getCredentials();
  if (!key || !secret) {
    console.warn('[Customer.io] Credentials not configured - skipping event tracking');
    return;
  }

  try {
    await axios.post(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        type: 'event',
        name: eventName,
        data: eventData,
        identifiers: { id: userId }
      },
      {
        auth: {
          username: key,
          password: secret
        },
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Customer.io] Event tracked successfully: ${eventName} for user ${userId}`);
  } catch (error: any) {
    // Log error but don't throw - tracking failures should not break the main flow
    console.error('[Customer.io] Tracking failed:', {
      event: eventName,
      userId,
      error: error.message,
      response: error.response?.data
    });

    // In production, send to error monitoring service (e.g., Sentry)
    // Sentry.captureException(error, { contexts: { customerio: { eventName, userId } } });
  }
}

/**
 * Identify/update a user in Customer.io
 *
 * Creates or updates a user profile in Customer.io with the provided attributes.
 * This should be called on user signup and when important user attributes change.
 *
 * @param userId - The unique identifier for the user
 * @param attributes - User attributes to store in Customer.io
 * @returns Promise<void> - Resolves when identification is complete or fails silently
 */
export async function identifyUser(
  userId: string,
  attributes: {
    email: string;
    username: string;
    created_at: number; // Unix timestamp in seconds
    total_points?: number;
    current_streak?: number;
    rank_title?: string;
    full_name?: string;
    is_active?: boolean;
    last_prediction_at?: number; // Unix timestamp in seconds
  }
): Promise<void> {
  const { key, secret } = getCredentials();
  if (!key || !secret) {
    console.warn('[Customer.io] Credentials not configured - skipping user identification');
    return;
  }

  try {
    await axios.put(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        type: 'person',
        identifiers: { id: userId },
        attributes
      },
      {
        auth: {
          username: key,
          password: secret
        },
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Customer.io] User identified successfully: ${userId}`);
  } catch (error: any) {
    console.error('[Customer.io] Identification failed:', {
      userId,
      error: error.message,
      response: error.response?.data
    });

    // In production, send to error monitoring service
    // Sentry.captureException(error, { contexts: { customerio: { userId } } });
  }
}

/**
 * Update user attributes in Customer.io
 *
 * Convenience function to update specific attributes without needing all required fields.
 *
 * @param userId - The unique identifier for the user
 * @param attributes - Partial attributes to update
 * @returns Promise<void>
 */
export async function updateUserAttributes(
  userId: string,
  attributes: Record<string, any>
): Promise<void> {
  const { key, secret } = getCredentials();
  if (!key || !secret) {
    console.warn('[Customer.io] Credentials not configured - skipping attribute update');
    return;
  }

  try {
    await axios.put(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        type: 'person',
        identifiers: { id: userId },
        attributes
      },
      {
        auth: {
          username: key,
          password: secret
        },
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Customer.io] User attributes updated: ${userId}`);
  } catch (error: any) {
    console.error('[Customer.io] Attribute update failed:', {
      userId,
      error: error.message,
      response: error.response?.data
    });
  }
}

/**
 * Delete a user from Customer.io
 *
 * Removes a user profile from Customer.io (for GDPR compliance, etc.)
 *
 * @param userId - The unique identifier for the user to delete
 * @returns Promise<void>
 */
export async function deleteUser(userId: string): Promise<void> {
  const { key, secret } = getCredentials();
  if (!key || !secret) {
    console.warn('[Customer.io] Credentials not configured - skipping user deletion');
    return;
  }

  try {
    await axios.delete(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        data: {
          type: 'person',
          identifiers: { id: userId }
        },
        auth: {
          username: key,
          password: secret
        },
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Customer.io] User deleted: ${userId}`);
  } catch (error: any) {
    console.error('[Customer.io] User deletion failed:', {
      userId,
      error: error.message,
      response: error.response?.data
    });
  }
}
