import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import connectToDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const db = mongoose.connection.db!;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'recent';

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const terminalStatuses = ['sold', 'completed', 'ended', 'cancelled'];

    let query: Record<string, unknown> = {};

    switch (filter) {
      case 'recent':
        query = {
          $or: [
            { updatedAt: { $gte: twentyFourHoursAgo } },
            { updated_at: { $gte: twentyFourHoursAgo } },
          ],
        };
        break;
      case 'stale':
        query = {
          status: { $nin: terminalStatuses },
          $or: [
            { updatedAt: { $lt: sixHoursAgo } },
            { updated_at: { $lt: sixHoursAgo } },
          ],
        };
        break;
      case 'active':
        query = { status: { $in: ['active', 'live', 'open'] } };
        break;
      case 'completed':
        query = { status: { $in: ['sold', 'completed', 'ended'] } };
        break;
      default:
        query = {
          $or: [
            { updatedAt: { $gte: twentyFourHoursAgo } },
            { updated_at: { $gte: twentyFourHoursAgo } },
          ],
        };
    }

    const raw = await db
      .collection('auctions')
      .find(query, {
        projection: {
          _id: 1,
          title: 1,
          make: 1,
          model: 1,
          year: 1,
          status: 1,
          updatedAt: 1,
          updated_at: 1,
          lastSeen: 1,
          currentBid: 1,
          gthEnabled: 1,
          image: 1,
        },
      })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();

    const auctions = raw.map((a: Record<string, unknown>) => ({
      ...a,
      _id: String(a._id),
      lastUpdated:
        (a.updatedAt as string) || (a.updated_at as string) || (a.lastSeen as string) || null,
    }));

    return NextResponse.json({ auctions, total: auctions.length, filter });
  } catch (error) {
    console.error('Scraper pipeline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
