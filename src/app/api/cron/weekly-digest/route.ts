import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';
import Users from '@/app/models/user.model';
import connectDB from '@/app/lib/mongoose';

/**
 * Cron Job: Weekly Digest
 *
 * Schedule: Monday 13:00 UTC (Monday 9am ET)
 * Purpose: Send weekly digest emails to active users with digest preference enabled
 *
 * Finds users active in last 30 days and triggers Customer.io weekly_digest_triggered event.
 * Note: This assumes Agent 4 has implemented Customer.io integration utilities.
 */
export const GET = withCronAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Find active users with digest preference enabled
    // Limit to 1000 users per batch to avoid overwhelming the system
    const users = await Users.find({
      last_prediction_at: { $gte: thirtyDaysAgo },
      'email_preferences.digests': true,
      isActive: true,
      isBanned: false,
    })
      .select('_id email username total_points current_streak ladder_tier createdAt')
      .limit(1000);

    let triggered = 0;
    let failed = 0;

    // Check if Customer.io utilities exist
    let identifyUser: any;
    let trackCustomerIOEvent: any;

    try {
      const customerIO = await import('@/app/lib/customerio');
      identifyUser = customerIO.identifyUser;
      trackCustomerIOEvent = customerIO.trackCustomerIOEvent;
    } catch (error) {
      console.warn('Customer.io utilities not found. Weekly digest will be logged but not sent.');
      console.warn('Expected utilities from Agent 4: identifyUser, trackCustomerIOEvent');

      return NextResponse.json(
        {
          message: 'Weekly digest job executed but Customer.io integration not available',
          users_found: users.length,
          triggered: 0,
          note: 'Customer.io utilities from Agent 4 are required',
        },
        { status: 200 }
      );
    }

    // Process each user
    for (const user of users) {
      try {
        // Update user attributes in Customer.io
        await identifyUser(user._id.toString(), {
          email: user.email,
          username: user.username,
          created_at: Math.floor(user.createdAt.getTime() / 1000),
          total_points: user.total_points,
          current_streak: user.current_streak,
          ladder_tier: user.ladder_tier,
        });

        // Fire weekly_digest_triggered event
        await trackCustomerIOEvent(user._id.toString(), 'weekly_digest_triggered', {
          user_id: user._id.toString(),
          total_points: user.total_points,
          current_streak: user.current_streak,
        });

        triggered++;
      } catch (error) {
        console.error(`Failed to trigger digest for user ${user._id}:`, error);
        failed++;
      }
    }

    return NextResponse.json(
      {
        message: 'Weekly digest job completed',
        users_found: users.length,
        triggered,
        failed,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Weekly digest cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
