import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint for Cron Jobs
 *
 * Returns the status and schedule of all configured cron jobs.
 * Does not require authentication - this is a public health check.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'Velocity Markets Cron Jobs',
      timestamp: new Date().toISOString(),
      cron_jobs: [
        {
          name: 'leaderboard-refresh',
          path: '/api/cron/leaderboard-refresh',
          schedule: '0 0 * * 1',
          description: 'Monday 00:00 UTC - Refresh weekly/monthly/alltime leaderboards',
        },
        {
          name: 'weekly-digest',
          path: '/api/cron/weekly-digest',
          schedule: '0 13 * * 1',
          description: 'Monday 13:00 UTC (9am ET) - Send weekly digest emails',
        },
        {
          name: 'inactive-users',
          path: '/api/cron/inactive-users',
          schedule: '0 2 * * *',
          description: 'Daily 02:00 UTC - Detect inactive users (7d, 14d)',
        },
        {
          name: 'stale-auctions',
          path: '/api/cron/stale-auctions',
          schedule: '0 3 * * *',
          description: 'Daily 03:00 UTC - Score ended auctions, mark unsuccessful',
        },
        {
          name: 'auction-reminders',
          path: '/api/cron/auction-reminders',
          schedule: '0 */6 * * *',
          description: 'Every 6 hours - Send reminders for auctions ending soon',
        },
        {
          name: 'auto-markets',
          path: '/api/cron/auto-markets',
          schedule: '0 */4 * * *',
          description: 'Every 4 hours - Auto-generate prediction markets from trending auctions',
        },
      ],
      dependencies: {
        required: [
          'CRON_SECRET - Authentication token for cron endpoints',
          'NEXT_PUBLIC_APP_URL - Base URL for internal API calls',
          'MongoDB connection - Database access',
        ],
        optional: [
          'Agent 2: scoringEngine.ts (scoreAuctionPredictions)',
          'Agent 3: /api/leaderboard/refresh endpoint',
          'Agent 4: customerio.ts (identifyUser, trackCustomerIOEvent)',
          'Agent 1: userEvent.model.ts, emailLog.model.ts',
        ],
      },
    },
    { status: 200 }
  );
}
