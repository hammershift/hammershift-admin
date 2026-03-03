import { NextRequest, NextResponse } from 'next/server';
import { authenticateMM, checkMMRateLimit } from '@/app/middleware/mmAuth';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * POST /api/mm/orders/batch
 *
 * Place multiple orders in a single atomic transaction
 *
 * Authentication: MM API Key (X-MM-API-Key header)
 * Rate Limit: 100 requests/minute per API key
 * Max Orders: 50 per batch
 */

const orderSchema = z.object({
  marketId: z.string(),
  side: z.enum(['BUY', 'SELL']),
  outcome: z.enum(['YES', 'NO']),
  price: z.number().min(0).max(1),
  size: z.number().positive(),
});

const batchSchema = z.object({
  orders: z.array(orderSchema).min(1).max(50, 'Maximum 50 orders per batch'),
});

export async function POST(req: NextRequest) {
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
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 3. Parse and validate request
    const body = await req.json();
    const validation = batchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { orders } = validation.data;

    // 4. Start MongoDB session for atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdOrders = [];
      const errors = [];

      // 5. Create all orders within transaction
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        try {
          const createdOrder = await PolygonOrder.create(
            [
              {
                marketId: order.marketId,
                auctionId: `auction-${order.marketId}`, // TODO: Lookup actual auctionId
                userId: new mongoose.Types.ObjectId(auth.userId),
                walletAddress: '0x0000000000000000000000000000000000000000', // TODO: Get from user
                side: order.side,
                outcome: order.outcome,
                price: order.price,
                size: order.size,
                remainingSize: order.size,
                status: 'OPEN',
                orderType: 'LIMIT',
                makerFee: 0,
                takerFee: 0,
              },
            ],
            { session }
          );

          createdOrders.push({
            index: i,
            orderId: createdOrder[0]._id.toString(),
            success: true,
          });
        } catch (error: any) {
          errors.push({
            index: i,
            error: error.message,
          });
        }
      }

      // 6. If any errors, rollback all
      if (errors.length > 0) {
        await session.abortTransaction();
        return NextResponse.json(
          {
            success: false,
            error: 'Batch order creation failed - all orders rolled back',
            errors,
          },
          { status: 400 }
        );
      }

      // 7. Commit transaction
      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          ordersCreated: createdOrders.length,
          orders: createdOrders,
        },
        {
          status: 201,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: any) {
    console.error('[MM Batch Order Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
