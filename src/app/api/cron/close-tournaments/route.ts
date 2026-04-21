export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/app/lib/cronAuth';
import connectDB from '@/app/lib/mongoose';
import Tournaments from '@/app/models/tournament.model';
import Auctions from '@/app/models/auction.model';
import Predictions from '@/app/models/prediction.model';
import { createAuditLog } from '@/app/lib/auditLogger';

const FORCE_SETTLE_AFTER_MS = 48 * 60 * 60 * 1000;

export const GET = withCronAuth(async (req: NextRequest) => {
  try {
    await connectDB();

    const now = new Date();
    const forceSettleCutoff = new Date(now.getTime() - FORCE_SETTLE_AFTER_MS);

    const expired = await Tournaments.find({
      isActive: true,
      endTime: { $lt: now },
      haveWinners: { $ne: true },
    }).lean();

    const results = {
      found: expired.length,
      settled: 0,
      forceSettled: 0,
      waitingForAuctions: 0,
      predictionsDeactivated: 0,
      errors: [] as any[],
    };

    for (const t of expired) {
      try {
        const auctions = await Auctions.find({
          _id: { $in: t.auction_ids },
        }).lean();

        const allSettled =
          auctions.length > 0 &&
          auctions.every(
            (a: any) =>
              a.status_display === 'closed' || a.status_display === 'unsuccessful'
          );

        const forceSettle = !allSettled && t.endTime < forceSettleCutoff;

        if (!allSettled && !forceSettle) {
          // Auctions still resolving, within 48h grace window — skip.
          results.waitingForAuctions++;
          continue;
        }

        await Tournaments.updateOne(
          { _id: t._id },
          {
            $set: {
              isActive: false,
              haveWinners: true,
              status: 'completed',
              settledAt: now,
            },
          }
        );
        results.settled++;
        if (forceSettle) results.forceSettled++;

        const deactivation = await Predictions.updateMany(
          { tournament_id: t._id, isActive: true },
          { $set: { isActive: false } }
        );
        results.predictionsDeactivated += deactivation.modifiedCount || 0;

        // TODO (scoring): call scoreTournament(t._id) once a tournament-level
        // scoring helper exists. The per-auction scoreAuctionPredictions in
        // src/app/lib/scoringEngine.ts already runs via the stale-auctions
        // cron — tournament aggregation + prize distribution currently only
        // happens via the admin-triggered PUT /api/tournaments/[id]/compute.

        await createAuditLog({
          userId: 'system',
          username: 'cron:close-tournaments',
          userRole: 'system',
          action: 'tournament.auto_closed',
          resource: 'Tournament',
          resourceId: t._id.toString(),
          method: 'GET',
          endpoint: '/api/cron/close-tournaments',
          status: 'success',
          metadata: {
            endTime: t.endTime,
            userCount: t.users?.length ?? 0,
            auctionCount: t.auction_ids?.length ?? 0,
            forceSettled: forceSettle,
          },
          req,
        });
      } catch (e: any) {
        results.errors.push({
          tournament_id: t._id.toString(),
          error: e.message || String(e),
        });
      }
    }

    return NextResponse.json({
      message: 'Tournament closure completed',
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[close-tournaments cron error]', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
