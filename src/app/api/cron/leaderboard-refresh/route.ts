import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';

/**
 * Cron Job: Leaderboard Refresh
 *
 * Schedule: Monday 00:00 UTC (weekly)
 * Purpose: Refresh leaderboard snapshots for weekly, monthly, and all-time periods
 *
 * Calls the leaderboard refresh API endpoint for each period.
 * Note: This assumes Agent 3 has implemented /api/leaderboard/refresh
 */
export const GET = withCronAuth(async (req: NextRequest) => {
  const results: any[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Refresh all periods: weekly, monthly, alltime
  const periods = ['weekly', 'monthly', 'alltime'];

  for (const period of periods) {
    try {
      // Call the leaderboard refresh endpoint
      const response = await fetch(
        `${baseUrl}/api/leaderboard/refresh?period=${period}`,
        {
          method: 'POST',
          headers: {
            'authorization': req.headers.get('authorization') || '',
            'content-type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        results.push({
          period,
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
        });
        continue;
      }

      const data = await response.json();
      results.push({
        period,
        success: true,
        ...data,
      });
    } catch (error) {
      results.push({
        period,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Determine overall success
  const allSucceeded = results.every(r => r.success);
  const anySucceeded = results.some(r => r.success);

  return NextResponse.json(
    {
      message: allSucceeded
        ? 'All leaderboard periods refreshed successfully'
        : anySucceeded
        ? 'Some leaderboard periods refreshed successfully'
        : 'All leaderboard refresh operations failed',
      results,
      timestamp: new Date().toISOString(),
    },
    { status: allSucceeded ? 200 : 207 } // 207 = Multi-Status
  );
});
