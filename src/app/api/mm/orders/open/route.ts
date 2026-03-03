import { NextRequest, NextResponse } from 'next/server';
import { authenticateMM, checkMMRateLimit } from '@/app/middleware/mmAuth';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import mongoose from 'mongoose';

/**
 * GET /api/mm/orders/open
 *
 * Get all open orders for authenticated user
 * Optional query param: ?marketId=X to filter by market
 *
 * Authentication: MM API Key
 * Rate Limit: 100 requests/minute
 */

export async function GET(req: NextRequest) {
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // 4. Build query
    const query: any = {
      userId: new mongoose.Types.ObjectId(auth.userId),
      status: { $in: ['OPEN', 'PARTIAL'] },
    };

    if (marketId) {
      query.marketId = marketId;
    }

    // 5. Fetch orders with pagination
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      PolygonOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PolygonOrder.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        orders: orders.map((order) => ({
          orderId: order._id.toString(),
          marketId: order.marketId,
          side: order.side,
          outcome: order.outcome,
          price: order.price,
          size: order.size,
          remainingSize: order.remainingSize,
          status: order.status,
          createdAt: order.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[MM Open Orders Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
