import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that the request is authorized to trigger cron jobs
 *
 * Checks for Bearer token in Authorization header matching CRON_SECRET.
 * In development (no CRON_SECRET set), allows all requests.
 *
 * @param req - Next.js request object
 * @returns true if request is authorized, false otherwise
 */
export function verifyCronRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not set - cron endpoints unprotected');
    return true; // Allow in development
  }

  // Check for Bearer token format
  const expectedAuth = `Bearer ${cronSecret}`;
  return authHeader === expectedAuth;
}

/**
 * Higher-order function to wrap cron job handlers with authentication
 *
 * Usage:
 * ```typescript
 * export const GET = withCronAuth(async (req: NextRequest) => {
 *   // Your cron job logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 *
 * @param handler - The actual cron job handler function
 * @returns Wrapped handler with authentication check
 */
export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Verify cron authorization
    if (!verifyCronRequest(req)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing cron secret'
        },
        { status: 401 }
      );
    }

    // Call the actual handler
    try {
      return await handler(req);
    } catch (error) {
      console.error('Cron job execution error:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  };
}
