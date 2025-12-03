import { NextRequest, NextResponse } from "next/server";

/**
 * Rate Limiter - Sliding Window Algorithm
 *
 * Prevents API abuse by limiting requests per time window.
 * Uses in-memory storage (suitable for single-instance deployments).
 * For production with multiple instances, consider Redis.
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean;     // Only count successful requests
  keyGenerator?: (req: NextRequest) => string; // Custom key function
}

interface RequestLog {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamps of requests for sliding window
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const requestStore = new Map<string, RequestLog>();

// Cleanup old entries every 10 minutes
// Use unref() to allow Node.js to exit if this is the only thing running
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, log] of requestStore.entries()) {
    if (now > log.resetTime) {
      requestStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Allow Node.js to exit even if interval is running (for tests)
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Get client identifier (IP address or user ID)
 */
function getClientKey(req: NextRequest): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return `ratelimit:${ip}`;
}

/**
 * Sliding window rate limiter
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = getClientKey,
  } = config;

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create request log
    let log = requestStore.get(key);

    if (!log || now > log.resetTime) {
      // Create new log or reset expired one
      log = {
        count: 0,
        resetTime: now + windowMs,
        requests: [],
      };
      requestStore.set(key, log);
    }

    // Remove requests outside the sliding window
    log.requests = log.requests.filter((timestamp) => timestamp > now - windowMs);

    // Check if limit exceeded
    if (log.requests.length >= maxRequests) {
      const retryAfter = Math.ceil((log.resetTime - now) / 1000);

      return NextResponse.json(
        {
          message,
          retryAfter: `${retryAfter}s`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": log.resetTime.toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Add current request timestamp
    log.requests.push(now);
    log.count++;

    // Execute the handler
    const response = await handler();

    // Remove request if we're skipping certain types
    if (
      (skipSuccessfulRequests && response.status < 400) ||
      (skipFailedRequests && response.status >= 400)
    ) {
      log.requests.pop();
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - log.requests.length);
    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", log.resetTime.toString());

    return response;
  };
}

/**
 * Preset configurations for common use cases
 */
export const RateLimitPresets = {
  // Strict rate limit for authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: "Too many authentication attempts, please try again later.",
  },

  // Standard rate limit for general API endpoints
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: "Too many requests, please slow down.",
  },

  // Lenient rate limit for read-only endpoints
  READONLY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Very strict for sensitive operations (withdrawals, refunds)
  STRICT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: "Too many sensitive operations, please try again later.",
  },

  // For expensive operations (reports, exports)
  EXPENSIVE: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5,
    message: "Too many report requests, please wait before trying again.",
  },
};

/**
 * Helper to apply rate limiting to route handlers
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const limiter = rateLimit(config);
    return limiter(req, () => handler(req, context));
  };
}

/**
 * User-specific rate limiter (requires authentication)
 */
export function rateLimitByUser(config: RateLimitConfig) {
  return rateLimit({
    ...config,
    keyGenerator: (req: NextRequest) => {
      // Extract user ID from session/token
      // This is a placeholder - implement based on your auth system
      const userId = req.headers.get("x-user-id") || getClientKey(req);
      return `ratelimit:user:${userId}`;
    },
  });
}

/**
 * Clear rate limit for a specific key (admin override)
 */
export function clearRateLimit(key: string): boolean {
  return requestStore.delete(key);
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string): RequestLog | null {
  return requestStore.get(key) || null;
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearAllRateLimits(): void {
  requestStore.clear();
}
