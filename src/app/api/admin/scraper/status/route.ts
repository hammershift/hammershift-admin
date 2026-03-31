import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import connectToDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const db = mongoose.connection.db!;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const terminalStatuses = ['sold', 'completed', 'ended', 'cancelled'];

    const [
      lastAuction,
      processedLast24h,
      staleAuctions,
      statusBreakdownRaw,
      gradingQueueRaw,
      recentErrors,
    ] = await Promise.all([
      // Last scrape detection
      db.collection('auctions').findOne(
        {},
        { sort: { updatedAt: -1 }, projection: { updatedAt: 1, updated_at: 1, lastSeen: 1 } }
      ),

      // Auctions processed in last 24h
      db.collection('auctions').countDocuments({
        $or: [
          { updatedAt: { $gte: twentyFourHoursAgo } },
          { updated_at: { $gte: twentyFourHoursAgo } },
        ],
      }),

      // Stale auctions
      db.collection('auctions').countDocuments({
        status: { $nin: terminalStatuses },
        $or: [
          { updatedAt: { $lt: sixHoursAgo } },
          { updated_at: { $lt: sixHoursAgo } },
        ],
      }),

      // Status breakdown
      db.collection('auctions').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),

      // GTH grading queue - auctions that are closed with GTH enabled
      db.collection('auctions').find(
        {
          status: { $in: ['sold', 'completed', 'ended'] },
          gthEnabled: true,
        },
        { projection: { _id: 1, title: 1, updatedAt: 1, updated_at: 1 } }
      ).toArray(),

      // Error logs
      (async () => {
        try {
          const collections = await db.listCollections().toArray();
          const logCollectionName = collections.find(
            (c) => c.name === 'scraper_logs' || c.name === 'logs'
          )?.name;
          if (!logCollectionName) return [];
          return db.collection(logCollectionName).find(
            {
              $and: [
                {
                  $or: [
                    { timestamp: { $gte: twentyFourHoursAgo } },
                    { createdAt: { $gte: twentyFourHoursAgo } },
                  ],
                },
                {
                  $or: [
                    { level: 'error' },
                    { level: 'ERROR' },
                    { type: 'error' },
                  ],
                },
              ],
            },
            { sort: { timestamp: -1, createdAt: -1 }, limit: 20 }
          ).toArray();
        } catch {
          return [];
        }
      })(),
    ]);

    // Health score calculation
    const lastScrapeTime = lastAuction?.updatedAt || lastAuction?.updated_at || lastAuction?.lastSeen || null;
    let status = 'down';
    let score = 0;
    let message = 'No scrape data available';

    if (lastScrapeTime) {
      const lastScrapeDate = new Date(lastScrapeTime);
      if (lastScrapeDate >= twoHoursAgo) {
        status = 'healthy';
        score = 100;
        message = 'Scraper is running normally';
      } else if (lastScrapeDate >= twelveHoursAgo) {
        status = 'degraded';
        score = 50;
        message = 'Scraper may be delayed — last activity over 2 hours ago';
      } else {
        status = 'down';
        score = 0;
        message = 'Scraper appears down — no activity in over 12 hours';
      }
    }

    // Status breakdown map
    const statusBreakdown: Record<string, number> = {};
    for (const row of statusBreakdownRaw) {
      statusBreakdown[row._id || 'unknown'] = row.count;
    }

    // GTH grading queue - count pending guesses per auction
    const gradingQueue: Array<{
      auctionId: string;
      title: string;
      closedAt: string | null;
      pendingGuesses: number;
    }> = [];

    for (const auction of gradingQueueRaw) {
      const pendingGuesses = await db.collection('gth_guesses').countDocuments({
        auctionId: auction._id.toString(),
        graded: { $ne: true },
      });
      if (pendingGuesses > 0) {
        gradingQueue.push({
          auctionId: auction._id.toString(),
          title: auction.title || 'Untitled',
          closedAt: (auction.updatedAt || auction.updated_at || null)?.toISOString?.() || null,
          pendingGuesses,
        });
      }
    }

    // Format error logs
    const formattedErrors = recentErrors.map((e: Record<string, unknown>) => ({
      message: (e.message as string) || (e.error as string) || 'Unknown error',
      timestamp: ((e.timestamp || e.createdAt) as Date)?.toISOString?.() || null,
      level: (e.level as string) || 'error',
    }));

    return NextResponse.json({
      health: { status, score, lastScrapeTime: lastScrapeTime?.toISOString?.() || null, message },
      stats: {
        processedLast24h,
        staleAuctions,
        ungradedGth: gradingQueue.length,
        statusBreakdown,
      },
      gradingQueue,
      recentErrors: formattedErrors,
    });
  } catch (error) {
    console.error('Scraper status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
