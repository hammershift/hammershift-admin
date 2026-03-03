import { NextRequest, NextResponse } from 'next/server';
import { authenticateMM, checkMMRateLimit } from '@/app/middleware/mmAuth';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import mongoose from 'mongoose';

/**
 * DELETE /api/mm/orders/cancel-all
 *
 * Cancel all open orders for authenticated user
 * Optional query param: ?marketId=X to cancel only for specific market
 *
 * Authentication: MM API Key
 * Rate Limit: 100 requests/minute
 */

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await authenticateMM(req);
    if (!auth.authenticated || !auth.userId || !auth.apiKeyId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit check
    const rateLimit = checkMMRateLimit(auth.apiKeyId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 3. Parse query params
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get('marketId');

    // 4. Build query
    const query: any = {
      userId: new mongoose.Types.ObjectId(auth.userId),
      status: { $in: ['OPEN', 'PARTIAL'] },
    };

    if (marketId) {
      query.marketId = marketId;
    }

    // 5. Update all matching orders to CANCELLED
    const result = await PolygonOrder.updateMany(query, {
      $set: { status: 'CANCELLED' },
    });

    return NextResponse.json(
      {
        success: true,
        cancelledCount: result.modifiedCount,
        marketId: marketId || 'all',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[MM Cancel All Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
