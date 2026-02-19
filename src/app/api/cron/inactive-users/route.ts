import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';
import Users from '@/app/models/user.model';
import connectDB from '@/app/lib/mongoose';

/**
 * Cron Job: Inactive User Detection
 *
 * Schedule: Daily 02:00 UTC
 * Purpose: Detect users inactive for 7 or 14 days and trigger reactivation campaigns
 *
 * Finds users who last predicted exactly 7 or 14 days ago and triggers
 * Customer.io user_inactive event for reactivation campaigns.
 *
 * Frequency caps ensure users receive at most one email per inactive window.
 */
export const GET = withCronAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const now = Date.now();

    // Define time windows (with 1-day buffer to catch users in the window)
    const d7Start = new Date(now - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const d7End = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const d14Start = new Date(now - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const d14End = new Date(now - 14 * 24 * 60 * 60 * 1000); // 14 days ago

    // Find users inactive for 7 days (last prediction between 7-8 days ago)
    const d7Users = await Users.find({
      last_prediction_at: { $lte: d7End, $gt: d7Start },
      isActive: true,
      isBanned: false,
    }).select('_id email username');

    // Find users inactive for 14 days (last prediction between 14-15 days ago)
    const d14Users = await Users.find({
      last_prediction_at: { $lte: d14End, $gt: d14Start },
      isActive: true,
      isBanned: false,
    }).select('_id email username');

    let d7Triggered = 0;
    let d14Triggered = 0;
    let d7Failed = 0;
    let d14Failed = 0;

    // Check if Customer.io utilities exist
    let trackCustomerIOEvent: any;

    try {
      const customerIO = await import('@/app/lib/customerio');
      trackCustomerIOEvent = customerIO.trackCustomerIOEvent;
    } catch (error) {
      console.warn('Customer.io utilities not found. Inactive user detection will be logged but events not sent.');
      console.warn('Expected utilities from Agent 4: trackCustomerIOEvent');

      return NextResponse.json(
        {
          message: 'Inactive user detection completed but Customer.io integration not available',
          d7_inactive: d7Users.length,
          d14_inactive: d14Users.length,
          note: 'Customer.io utilities from Agent 4 are required',
        },
        { status: 200 }
      );
    }

    // Process 7-day inactive users
    for (const user of d7Users) {
      try {
        await trackCustomerIOEvent(user._id.toString(), 'user_inactive', {
          days_inactive: 7,
          user_id: user._id.toString(),
          username: user.username,
        });
        d7Triggered++;
      } catch (error) {
        console.error(`Failed to track d7 inactive event for user ${user._id}:`, error);
        d7Failed++;
      }
    }

    // Process 14-day inactive users
    for (const user of d14Users) {
      try {
        await trackCustomerIOEvent(user._id.toString(), 'user_inactive', {
          days_inactive: 14,
          user_id: user._id.toString(),
          username: user.username,
        });
        d14Triggered++;
      } catch (error) {
        console.error(`Failed to track d14 inactive event for user ${user._id}:`, error);
        d14Failed++;
      }
    }

    return NextResponse.json(
      {
        message: 'Inactive user detection completed',
        d7_inactive: d7Users.length,
        d7_triggered: d7Triggered,
        d7_failed: d7Failed,
        d14_inactive: d14Users.length,
        d14_triggered: d14Triggered,
        d14_failed: d14Failed,
        total_triggered: d7Triggered + d14Triggered,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Inactive users cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
