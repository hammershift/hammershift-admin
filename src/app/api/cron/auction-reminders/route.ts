import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';
import Auctions from '@/app/models/auction.model';
import Predictions from '@/app/models/prediction.model';
import connectDB from '@/app/lib/mongoose';

/**
 * Cron Job: Auction Ending Reminders
 *
 * Schedule: Every 6 hours
 * Purpose: Send reminders to users who viewed auctions but haven't predicted yet
 *
 * Finds auctions ending in next 24 hours, identifies users who viewed but didn't predict,
 * and triggers Customer.io auction_ending_soon event.
 *
 * Frequency caps prevent spamming (max 1 reminder per 24h per user).
 * Note: This requires Agent 1's user_events model and Agent 4's Customer.io integration.
 */
export const GET = withCronAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const now = Date.now();
    const in24h = new Date(now + 24 * 60 * 60 * 1000);
    const nowDate = new Date(now);

    // Find active auctions ending in next 24 hours
    const endingAuctions = await Auctions.find({
      $or: [
        { status_display: 'active' },
        { status_display: { $exists: false } },
        { status_display: null },
      ],
      ended: false,
      'sort.deadline': { $gte: nowDate, $lte: in24h },
    }).limit(100); // Limit to avoid overwhelming the system

    let remindersSent = 0;
    let errors = 0;

    // Check if required utilities exist
    let UserEvents: any;
    let EmailLogs: any;
    let trackCustomerIOEvent: any;

    try {
      UserEvents = (await import('@/app/models/userEvent.model')).default;
    } catch (error) {
      console.warn('UserEvents model not found. Cannot identify viewers.');
      UserEvents = null;
    }

    try {
      EmailLogs = (await import('@/app/models/emailLog.model')).default;
    } catch (error) {
      console.warn('EmailLogs model not found. Cannot check frequency caps.');
      EmailLogs = null;
    }

    try {
      const customerIO = await import('@/app/lib/customerio');
      trackCustomerIOEvent = customerIO.trackCustomerIOEvent;
    } catch (error) {
      console.warn('Customer.io utilities not found. Auction reminders will be logged but not sent.');
      trackCustomerIOEvent = null;
    }

    // If critical dependencies are missing, return early
    if (!UserEvents || !trackCustomerIOEvent) {
      return NextResponse.json(
        {
          message: 'Auction reminders job executed but required dependencies not available',
          auctions_ending: endingAuctions.length,
          reminders_sent: 0,
          note: 'UserEvents model (Agent 1) and Customer.io integration (Agent 4) are required',
        },
        { status: 200 }
      );
    }

    for (const auction of endingAuctions) {
      try {
        // Find users who viewed this auction
        const viewers = await UserEvents.distinct('user_id', {
          event_type: 'auction_viewed',
          'event_data.auction_id': auction._id.toString(),
        });

        // Find users who already predicted on this auction
        const predictors = await Predictions.distinct('user.userId', {
          auction_id: auction._id,
        });

        // Filter to get viewers without predictions
        const viewersWithoutPredictions = viewers.filter(
          (viewerId: any) => !predictors.some((predictorId: any) => predictorId.equals(viewerId))
        );

        // Send reminders to viewers without predictions
        for (const userId of viewersWithoutPredictions) {
          try {
            // Check frequency cap - only send if no reminder sent in last 24h
            let recentReminder = null;
            if (EmailLogs) {
              recentReminder = await EmailLogs.findOne({
                user_id: userId,
                email_type: 'reminder',
                sent_at: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
              });
            }

            if (!recentReminder) {
              // Calculate hours remaining (sort.deadline is guaranteed by the query filter)
              const deadline = auction.sort?.deadline?.getTime() ?? now;
              const hoursRemaining = Math.round(
                (deadline - now) / (1000 * 60 * 60)
              );

              // Build auction title
              const auctionTitle = auction.title || 'Auction';

              // Trigger Customer.io event
              await trackCustomerIOEvent(userId.toString(), 'auction_ending_soon', {
                auction_id: auction._id.toString(),
                auction_title: auctionTitle,
                hours_remaining: hoursRemaining,
                page_url: auction.page_url,
              });

              remindersSent++;
            }
          } catch (error) {
            console.error(`Failed to send reminder to user ${userId}:`, error);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Failed to process auction ${auction._id}:`, error);
        errors++;
      }
    }

    return NextResponse.json(
      {
        message: 'Auction reminders job completed',
        auctions_ending: endingAuctions.length,
        reminders_sent: remindersSent,
        errors,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auction reminders cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
