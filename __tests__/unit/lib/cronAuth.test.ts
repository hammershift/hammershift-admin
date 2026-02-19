/**
 * Unit Tests: Cron Auth Middleware
 *
 * Tests for verifyCronRequest() and withCronAuth() functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest, withCronAuth } from '@/app/lib/cronAuth';

describe('Cron Auth Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('verifyCronRequest', () => {
    it('should return true if CRON_SECRET is not set (development mode)', () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {},
      });

      const result = verifyCronRequest(req);
      expect(result).toBe(true);
    });

    it('should return true with valid Bearer token matching CRON_SECRET', () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'Bearer test-secret-123',
        },
      });

      const result = verifyCronRequest(req);
      expect(result).toBe(true);
    });

    it('should return false with invalid Bearer token', () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const result = verifyCronRequest(req);
      expect(result).toBe(false);
    });

    it('should return false with missing authorization header', () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {},
      });

      const result = verifyCronRequest(req);
      expect(result).toBe(false);
    });

    it('should return false with malformed authorization header (no Bearer prefix)', () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'test-secret-123',
        },
      });

      const result = verifyCronRequest(req);
      expect(result).toBe(false);
    });
  });

  describe('withCronAuth', () => {
    it('should call handler when auth is valid', async () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const mockHandler = jest.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withCronAuth(mockHandler);

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'Bearer test-secret-123',
        },
      });

      const response = await wrappedHandler(req);

      expect(mockHandler).toHaveBeenCalledWith(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ success: true });
    });

    it('should return 401 when auth is invalid', async () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const mockHandler = jest.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withCronAuth(mockHandler);

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const response = await wrappedHandler(req);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Unauthorized',
        message: 'Invalid or missing cron secret',
      });
    });

    it('should return 500 when handler throws an error', async () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const mockHandler = jest.fn(async (req: NextRequest) => {
        throw new Error('Test error');
      });

      const wrappedHandler = withCronAuth(mockHandler);

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {
          authorization: 'Bearer test-secret-123',
        },
      });

      const response = await wrappedHandler(req);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Internal Server Error',
        message: 'Test error',
      });
    });

    it('should work in development mode (no CRON_SECRET)', async () => {
      delete process.env.CRON_SECRET;

      const mockHandler = jest.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withCronAuth(mockHandler);

      const req = new NextRequest('http://localhost:3000/api/cron/test', {
        headers: {},
      });

      const response = await wrappedHandler(req);

      expect(mockHandler).toHaveBeenCalledWith(req);
      expect(response.status).toBe(200);
    });
  });
});
