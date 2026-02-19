import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';
import Auctions from '@/app/models/auction.model';
import Predictions from '@/app/models/prediction.model';
import connectDB from '@/app/lib/mongoose';

/**
 * Cron Job: Stale Auction Cleanup
 *
 * Schedule: Daily 03:00 UTC
 * Purpose: Score predictions for ended auctions and mark unsuccessful auctions
 *
 * Finds auctions that have ended but haven't been scored yet.
 * If hammer price exists, scores all predictions using the scoring engine.
 * If no hammer price after 48h, marks auction as unsuccessful.
 *
 * Note: This assumes Agent 2 has implemented the scoring engine.
 */
export const GET = withCronAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find auctions that have ended but status is still active
    // Using sort.deadline field which represents end_time based on design doc
    const staleAuctions = await Auctions.find({
      'sort.deadline': { $lt: now },
      $or: [
        { status_display: { $exists: false } },
        { status_display: 'active' },
        { status_display: null },
        { status_display: '' },
      ],
    });

    let auctionsClosed = 0;
    let auctionsMarkedUnsuccessful = 0;
    let predictionsScored = 0;
    let errors = 0;

    // Check if scoring engine exists
    let scoreAuctionPredictions: any;

    try {
      const scoringEngine = await import('@/app/lib/scoringEngine');
      scoreAuctionPredictions = scoringEngine.scoreAuctionPredictions;
    } catch (error) {
      console.warn('Scoring engine not found. Stale auction cleanup will mark statuses but not score predictions.');
      console.warn('Expected utilities from Agent 2: scoreAuctionPredictions');
      scoreAuctionPredictions = null;
    }

    for (const auction of staleAuctions) {
      try {
        // Get hammer price from attributes[0].value
        const hammerPrice = auction.attributes?.[0]?.value;

        if (hammerPrice && hammerPrice > 0) {
          // Hammer price exists - score predictions
          if (scoreAuctionPredictions) {
            const scored = await scoreAuctionPredictions(auction._id, hammerPrice);
            predictionsScored += scored;
          } else {
            // Fallback: just count predictions that would be scored
            const count = await Predictions.countDocuments({
              auction_id: auction._id,
              isActive: true,
            });
            predictionsScored += count;

            // Deactivate predictions manually
            await Predictions.updateMany(
              { auction_id: auction._id, isActive: true },
              { $set: { isActive: false } }
            );
          }

          // Update auction status to closed
          await Auctions.updateOne(
            { _id: auction._id },
            { $set: { status_display: 'closed', ended: true } }
          );

          auctionsClosed++;
        } else {
          // No hammer price - check how long it's been
          const endTime = auction.sort?.deadline;
          if (endTime && endTime < fortyEightHoursAgo) {
            // More than 48h past end time - mark as unsuccessful
            await Auctions.updateOne(
              { _id: auction._id },
              { $set: { status_display: 'unsuccessful', ended: true } }
            );

            // Deactivate predictions for unsuccessful auction
            await Predictions.updateMany(
              { auction_id: auction._id, isActive: true },
              { $set: { isActive: false } }
            );

            auctionsMarkedUnsuccessful++;
          }
          // If < 48h, do nothing - wait for hammer price to appear
        }
      } catch (error) {
        console.error(`Failed to process auction ${auction._id}:`, error);
        errors++;
      }
    }

    return NextResponse.json(
      {
        message: 'Stale auction cleanup completed',
        stale_auctions_found: staleAuctions.length,
        auctions_closed: auctionsClosed,
        auctions_unsuccessful: auctionsMarkedUnsuccessful,
        predictions_scored: predictionsScored,
        errors,
        timestamp: new Date().toISOString(),
        note: scoreAuctionPredictions
          ? undefined
          : 'Scoring engine not available - predictions deactivated but not scored',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Stale auctions cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
