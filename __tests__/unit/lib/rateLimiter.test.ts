import { NextRequest, NextResponse } from "next/server";
import {
  rateLimit,
  RateLimitPresets,
  withRateLimit,
  clearAllRateLimits,
  clearRateLimit,
  getRateLimitStatus,
} from "@/app/lib/rateLimiter";

describe("Rate Limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe("rateLimit", () => {
    it("should allow requests within limit", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 3,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Make 3 requests - all should succeed
      for (let i = 0; i < 3; i++) {
        const response = await limiter(req, handler);
        expect(response.status).toBe(200);

        const remaining = response.headers.get("X-RateLimit-Remaining");
        expect(remaining).toBe((2 - i).toString());
      }
    });

    it("should block requests exceeding limit", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        message: "Rate limit exceeded",
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Make 2 requests - should succeed
      await limiter(req, handler);
      await limiter(req, handler);

      // Third request should be blocked
      const response = await limiter(req, handler);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.message).toBe("Rate limit exceeded");
      expect(response.headers.get("Retry-After")).toBeTruthy();
    });

    it("should add rate limit headers to responses", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      const response = await limiter(req, handler);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("should reset after window expires", async () => {
      const limiter = rateLimit({
        windowMs: 100, // 100ms window for testing
        maxRequests: 2,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Use up the limit
      await limiter(req, handler);
      await limiter(req, handler);

      // Should be blocked
      const blockedResponse = await limiter(req, handler);
      expect(blockedResponse.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should work again
      const response = await limiter(req, handler);
      expect(response.status).toBe(200);
    });

    it("should use custom key generator", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req) => {
          const userId = req.headers.get("x-user-id") || "anonymous";
          return `custom:${userId}`;
        },
      });

      const handler = async () => NextResponse.json({ success: true });

      // User 1 makes 2 requests
      const req1 = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-user-id": "user1" },
      });
      await limiter(req1, handler);
      await limiter(req1, handler);

      // User 1 should be blocked
      const blocked = await limiter(req1, handler);
      expect(blocked.status).toBe(429);

      // User 2 should still be allowed
      const req2 = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-user-id": "user2" },
      });
      const allowed = await limiter(req2, handler);
      expect(allowed.status).toBe(200);
    });

    it("should skip successful requests if configured", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const successHandler = async () => NextResponse.json({ success: true });
      const errorHandler = async () =>
        NextResponse.json({ error: true }, { status: 400 });

      // Make 3 successful requests - shouldn't count
      await limiter(req, successHandler);
      await limiter(req, successHandler);
      await limiter(req, successHandler);

      // Make 2 error requests - should count
      await limiter(req, errorHandler);
      await limiter(req, errorHandler);

      // Third error should be blocked
      const response = await limiter(req, errorHandler);
      expect(response.status).toBe(429);
    });

    it("should skip failed requests if configured", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        skipFailedRequests: true,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const successHandler = async () => NextResponse.json({ success: true });
      const errorHandler = async () =>
        NextResponse.json({ error: true }, { status: 400 });

      // Make 3 error requests - shouldn't count
      await limiter(req, errorHandler);
      await limiter(req, errorHandler);
      await limiter(req, errorHandler);

      // Make 2 successful requests - should count
      await limiter(req, successHandler);
      await limiter(req, successHandler);

      // Third success should be blocked
      const response = await limiter(req, successHandler);
      expect(response.status).toBe(429);
    });
  });

  describe("withRateLimit", () => {
    it("should wrap handler with rate limiting", async () => {
      const handler = async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      };

      const limitedHandler = withRateLimit(
        { windowMs: 60000, maxRequests: 2 },
        handler
      );

      const req = new NextRequest("http://localhost:3000/api/test");

      // First two should work
      const response1 = await limitedHandler(req);
      expect(response1.status).toBe(200);

      const response2 = await limitedHandler(req);
      expect(response2.status).toBe(200);

      // Third should be blocked
      const response3 = await limitedHandler(req);
      expect(response3.status).toBe(429);
    });
  });

  describe("RateLimitPresets", () => {
    it("should have AUTH preset with strict limits", () => {
      expect(RateLimitPresets.AUTH.maxRequests).toBe(5);
      expect(RateLimitPresets.AUTH.windowMs).toBe(15 * 60 * 1000);
    });

    it("should have STANDARD preset", () => {
      expect(RateLimitPresets.STANDARD.maxRequests).toBe(60);
      expect(RateLimitPresets.STANDARD.windowMs).toBe(60 * 1000);
    });

    it("should have READONLY preset", () => {
      expect(RateLimitPresets.READONLY.maxRequests).toBe(100);
    });

    it("should have STRICT preset", () => {
      expect(RateLimitPresets.STRICT.maxRequests).toBe(10);
      expect(RateLimitPresets.STRICT.windowMs).toBe(60 * 60 * 1000);
    });

    it("should have EXPENSIVE preset", () => {
      expect(RateLimitPresets.EXPENSIVE.maxRequests).toBe(5);
      expect(RateLimitPresets.EXPENSIVE.windowMs).toBe(5 * 60 * 1000);
    });
  });

  describe("clearRateLimit", () => {
    it("should clear rate limit for specific key", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: () => "test-key",
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Use up the limit
      await limiter(req, handler);

      // Should be blocked
      const blocked = await limiter(req, handler);
      expect(blocked.status).toBe(429);

      // Clear the rate limit
      clearRateLimit("test-key");

      // Should work again
      const response = await limiter(req, handler);
      expect(response.status).toBe(200);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return rate limit status", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: () => "status-key",
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Make some requests
      await limiter(req, handler);
      await limiter(req, handler);

      const status = getRateLimitStatus("status-key");
      expect(status).not.toBeNull();
      expect(status?.requests).toHaveLength(2);
      expect(status?.count).toBeGreaterThanOrEqual(2);
    });

    it("should return null for non-existent key", () => {
      const status = getRateLimitStatus("non-existent");
      expect(status).toBeNull();
    });
  });

  describe("clearAllRateLimits", () => {
    it("should clear all rate limits", async () => {
      const limiter1 = rateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: () => "key1",
      });

      const limiter2 = rateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: () => "key2",
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Use up both limits
      await limiter1(req, handler);
      await limiter2(req, handler);

      // Clear all
      clearAllRateLimits();

      // Both should work again
      const response1 = await limiter1(req, handler);
      const response2 = await limiter2(req, handler);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe("Sliding window algorithm", () => {
    it("should use sliding window instead of fixed window", async () => {
      const limiter = rateLimit({
        windowMs: 200, // 200ms window
        maxRequests: 3,
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const handler = async () => NextResponse.json({ success: true });

      // Make 3 requests immediately
      await limiter(req, handler);
      await limiter(req, handler);
      await limiter(req, handler);

      // Should be blocked
      const blocked = await limiter(req, handler);
      expect(blocked.status).toBe(429);

      // Wait for first request to expire (150ms)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still be blocked (only 150ms passed, need 200ms)
      const stillBlocked = await limiter(req, handler);
      expect(stillBlocked.status).toBe(429);

      // Wait another 60ms (total 210ms from first request)
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Now should work (first request expired from sliding window)
      const allowed = await limiter(req, handler);
      expect(allowed.status).toBe(200);
    });
  });
});
