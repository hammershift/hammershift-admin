import { NextRequest, NextResponse } from 'next/server';
import MMApiKey from '@/app/models/MMApiKey.model';

/**
 * Market Maker API Authentication Middleware
 *
 * Validates X-MM-API-Key header and attaches user info to request
 */

export interface MMAuthenticatedRequest extends NextRequest {
  mmUser?: {
    userId: string;
    apiKeyId: string;
    keyName: string;
  };
}

/**
 * Authenticate Market Maker API request
 *
 * Validates API key from X-MM-API-Key header
 * Returns user info if valid, error response if invalid
 */
export async function authenticateMM(
  req: NextRequest
): Promise<{ authenticated: boolean; userId?: string; apiKeyId?: string; keyName?: string; error?: NextResponse }> {
  // Extract API key from header
  const apiKey = req.headers.get('x-mm-api-key');

  if (!apiKey) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Missing X-MM-API-Key header' },
        { status: 401 }
      ),
    };
  }

  // Validate key format (must start with "mm_")
  if (!apiKey.startsWith('mm_')) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      ),
    };
  }

  try {
    // Find all active API keys (we need to hash and compare)
    const activeKeys = await MMApiKey.find({ isActive: true });

    if (!activeKeys || activeKeys.length === 0) {
      return {
        authenticated: false,
        error: NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        ),
      };
    }

    // Check each key until we find a match
    let matchedKey = null;
    for (const keyDoc of activeKeys) {
      const isValid = await MMApiKey.validateKey(apiKey, keyDoc.apiKey);
      if (isValid) {
        matchedKey = keyDoc;
        break;
      }
    }

    if (!matchedKey) {
      return {
        authenticated: false,
        error: NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        ),
      };
    }

    // Update last used timestamp (async, don't await)
    matchedKey.updateLastUsed().catch((err: Error) => {
      console.error('Failed to update API key last used:', err);
    });

    return {
      authenticated: true,
      userId: matchedKey.userId.toString(),
      apiKeyId: matchedKey._id.toString(),
      keyName: matchedKey.name,
    };
  } catch (error) {
    console.error('[MM Auth Error]', error);
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Rate limit map for Market Maker API
 * Key: apiKeyId, Value: { count, resetAt }
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for Market Maker API
 *
 * Limit: 100 requests per minute per API key
 */
export function checkMMRateLimit(apiKeyId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = 100; // requests per minute
  const window = 60 * 1000; // 1 minute in ms

  const entry = rateLimitMap.get(apiKeyId);

  // No entry or window expired - create new
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + window;
    rateLimitMap.set(apiKeyId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
