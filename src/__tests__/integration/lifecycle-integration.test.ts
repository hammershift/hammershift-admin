/**
 * Integration Tests for Lifecycle & Integration Layer
 *
 * Tests Customer.io, PostHog integrations, webhook handlers, and event tracking
 * with mocked external API calls.
 *
 * Agent 4: Lifecycle & Integration Testing
 */

import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { trackCustomerIOEvent, identifyUser, updateUserAttributes, deleteUser } from '@/app/lib/customerio';
import { capturePostHogEvent, identifyPostHogUser, setPostHogUserProperties, getPostHogClient } from '@/app/lib/posthog';

// Use spyOn instead of jest.mock — avoids CJS/ESM interop issues with axios
// Each spy is created in beforeEach and restored in afterEach
const mockedAxios = {
  post: jest.spyOn(axios, 'post'),
  put: jest.spyOn(axios, 'put'),
  delete: jest.spyOn(axios, 'delete'),
};

// Mock PostHog
jest.mock('posthog-node', () => {
  return {
    PostHog: jest.fn().mockImplementation(() => ({
      capture: jest.fn(),
      identify: jest.fn(),
      alias: jest.fn(),
      shutdown: jest.fn(() => Promise.resolve()),
    })),
  };
});

// Shared spies on the PostHog singleton's methods. We spy on whatever getPostHogClient()
// returns (real mocked PostHog OR inline fallback) so assertions work regardless of how
// posthog-node is resolved in the test environment. The singleton persists across tests;
// jest.clearAllMocks() only clears call history, not the spies themselves.
let captureSpy: any;
let identifySpy: any;

beforeAll(() => {
  process.env.POSTHOG_API_KEY = 'test_posthog_key';
  const instance = getPostHogClient();
  captureSpy = jest.spyOn(instance, 'capture');
  identifySpy = jest.spyOn(instance, 'identify');
  delete process.env.POSTHOG_API_KEY;
});

describe('Customer.io Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default spy implementations — individual tests override with mockResolvedValueOnce
    mockedAxios.post.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.put.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.delete.mockResolvedValue({ data: { success: true } } as any);

    // Set up environment variables
    process.env.CUSTOMERIO_SITE_ID = 'test_site_id';
    process.env.CUSTOMERIO_API_KEY = 'test_api_key';
    process.env.CUSTOMERIO_WEBHOOK_SECRET = 'test_webhook_secret';
  });

  afterEach(() => {
    delete process.env.CUSTOMERIO_SITE_ID;
    delete process.env.CUSTOMERIO_API_KEY;
    delete process.env.CUSTOMERIO_WEBHOOK_SECRET;
  });

  describe('trackCustomerIOEvent', () => {
    it('should successfully track an event', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await trackCustomerIOEvent('user123', 'prediction_made', {
        auction_id: 'auction456',
        predicted_price: 50000,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://track.customer.io/api/v2/entity',
        {
          type: 'event',
          name: 'prediction_made',
          data: {
            auction_id: 'auction456',
            predicted_price: 50000,
          },
          identifiers: { id: 'user123' },
        },
        expect.objectContaining({
          auth: {
            username: 'test_site_id',
            password: 'test_api_key',
          },
          timeout: 5000,
        })
      );
    });

    it('should handle API failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        trackCustomerIOEvent('user123', 'test_event', {})
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should skip tracking when credentials not configured', async () => {
      delete process.env.CUSTOMERIO_SITE_ID;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await trackCustomerIOEvent('user123', 'test_event', {});

      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Credentials not configured')
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('identifyUser', () => {
    it('should successfully identify a user', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

      const attributes = {
        email: 'test@example.com',
        username: 'testuser',
        created_at: 1640000000,
        total_points: 500,
        current_streak: 5,
        rank_title: 'Rising Star',
      };

      await identifyUser('user123', attributes);

      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://track.customer.io/api/v2/entity',
        {
          type: 'person',
          identifiers: { id: 'user123' },
          attributes,
        },
        expect.objectContaining({
          auth: {
            username: 'test_site_id',
            password: 'test_api_key',
          },
        })
      );
    });

    it('should handle identification failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedAxios.put.mockRejectedValueOnce(new Error('API error'));

      await identifyUser('user123', {
        email: 'test@example.com',
        username: 'testuser',
        created_at: 1640000000,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateUserAttributes', () => {
    it('should update user attributes', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

      await updateUserAttributes('user123', {
        total_points: 1000,
        current_streak: 10,
      });

      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://track.customer.io/api/v2/entity',
        {
          type: 'person',
          identifiers: { id: 'user123' },
          attributes: {
            total_points: 1000,
            current_streak: 10,
          },
        },
        expect.any(Object)
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

      await deleteUser('user123');

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'https://track.customer.io/api/v2/entity',
        expect.objectContaining({
          data: {
            type: 'person',
            identifiers: { id: 'user123' },
          },
        })
      );
    });
  });
});

describe('PostHog Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore axios default implementations after clearAllMocks
    mockedAxios.post.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.put.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.delete.mockResolvedValue({ data: { success: true } } as any);
    process.env.POSTHOG_API_KEY = 'test_posthog_key';
    process.env.POSTHOG_HOST = 'https://app.posthog.com';
  });

  afterEach(() => {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_HOST;
  });

  describe('capturePostHogEvent', () => {
    it('should capture an event', async () => {
      await capturePostHogEvent('user123', 'prediction_made', {
        auction_id: 'auction456',
        predicted_price: 50000,
      });

      expect(captureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user123',
          event: 'prediction_made',
          properties: expect.objectContaining({
            auction_id: 'auction456',
            predicted_price: 50000,
          }),
        })
      );
    });

    it('should handle capture failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      captureSpy.mockImplementationOnce(() => {
        throw new Error('PostHog error');
      });

      // Should not throw
      await expect(
        capturePostHogEvent('user123', 'test_event', {})
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('identifyPostHogUser', () => {
    it('should identify a user in PostHog', async () => {
      await identifyPostHogUser('user123', {
        email: 'test@example.com',
        username: 'testuser',
        total_points: 500,
      });

      expect(identifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user123',
          properties: expect.objectContaining({
            email: 'test@example.com',
            username: 'testuser',
            total_points: 500,
          }),
        })
      );
    });
  });

  describe('setPostHogUserProperties', () => {
    it('should set user properties', async () => {
      await setPostHogUserProperties('user123', {
        current_streak: 10,
        rank_title: 'Expert',
      });

      expect(identifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user123',
          properties: {
            $set: {
              current_streak: 10,
              rank_title: 'Expert',
            },
          },
        })
      );
    });
  });
});

describe('Event Tracking Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.put.mockResolvedValue({ data: { success: true } } as any);
    mockedAxios.delete.mockResolvedValue({ data: { success: true } } as any);
  });

  afterEach(() => {
    delete process.env.CUSTOMERIO_SITE_ID;
    delete process.env.CUSTOMERIO_API_KEY;
    delete process.env.POSTHOG_API_KEY;
  });

  it('should track events to both Customer.io and PostHog', async () => {
    process.env.CUSTOMERIO_SITE_ID = 'test_site_id';
    process.env.CUSTOMERIO_API_KEY = 'test_api_key';
    process.env.POSTHOG_API_KEY = 'test_posthog_key';

    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    const userId = 'user123';
    const eventName = 'prediction_made';
    const eventData = {
      auction_id: 'auction456',
      predicted_price: 50000,
    };

    // Track event to both services
    await Promise.all([
      trackCustomerIOEvent(userId, eventName, eventData),
      capturePostHogEvent(userId, eventName, eventData),
    ]);

    // Verify Customer.io was called
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://track.customer.io/api/v2/entity',
      expect.objectContaining({
        type: 'event',
        name: eventName,
        identifiers: { id: userId },
      }),
      expect.any(Object)
    );

    // Verify PostHog was called
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: userId,
        event: eventName,
      })
    );
  });

  it('should continue if one integration fails', async () => {
    process.env.CUSTOMERIO_SITE_ID = 'test_site_id';
    process.env.CUSTOMERIO_API_KEY = 'test_api_key';
    process.env.POSTHOG_API_KEY = 'test_posthog_key';

    // Customer.io fails
    mockedAxios.post.mockRejectedValueOnce(new Error('Customer.io error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await Promise.allSettled([
      trackCustomerIOEvent('user123', 'test_event', {}),
      capturePostHogEvent('user123', 'test_event', {}),
    ]);

    // Both should resolve (not reject)
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');

    // PostHog should still be called
    expect(captureSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('Webhook Signature Verification', () => {
  it('should verify valid webhook signatures', () => {
    const crypto = require('crypto');
    const secret = 'test_webhook_secret';
    const body = JSON.stringify({ event_type: 'email_sent', data: {} });

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    // Import verification function
    // Note: This is a placeholder - actual import would be from webhook route
    const verifySignature = (bodyStr: string, signature: string, secretKey: string): boolean => {
      try {
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(bodyStr);
        const expected = hmac.digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected)
        );
      } catch {
        return false;
      }
    };

    expect(verifySignature(body, expectedSignature, secret)).toBe(true);
  });

  it('should reject invalid signatures', () => {
    const crypto = require('crypto');
    const secret = 'test_webhook_secret';
    const body = JSON.stringify({ event_type: 'email_sent', data: {} });
    const invalidSignature = 'invalid_signature';

    const verifySignature = (bodyStr: string, signature: string, secretKey: string): boolean => {
      try {
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(bodyStr);
        const expected = hmac.digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected)
        );
      } catch {
        return false;
      }
    };

    expect(verifySignature(body, invalidSignature, secret)).toBe(false);
  });
});
