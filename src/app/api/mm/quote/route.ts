import { NextRequest, NextResponse } from 'next/server';
import { authenticateMM, checkMMRateLimit } from '@/app/middleware/mmAuth';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * POST /api/mm/quote
 *
 * Post two-sided quote (buy + sell at different prices)
 * Creates 2 orders in a single atomic transaction
 *
 * Authentication: MM API Key
 * Rate Limit: 100 requests/minute
 */

const quoteSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(['YES', 'NO']),
  buyPrice: z.number().min(0).max(1),
  sellPrice: z.number().min(0).max(1),
  size: z.number().positive(),
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
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await req.json();
    const validation = quoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { marketId, outcome, buyPrice, sellPrice, size } = validation.data;

    // 4. Validate quote (buy price must be < sell price)
    if (buyPrice >= sellPrice) {
      return NextResponse.json(
        { error: 'Buy price must be less than sell price' },
        { status: 400 }
      );
    }

    // 5. Start MongoDB session for atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId(auth.userId);
      const walletAddress = '0x0000000000000000000000000000000000000000'; // TODO: Get from user
      const auctionId = `auction-${marketId}`; // TODO: Lookup actual auctionId

      // Create buy order
      const buyOrder = await PolygonOrder.create(
        [
          {
            marketId,
            auctionId,
            userId,
            walletAddress,
            side: 'BUY',
            outcome,
            price: buyPrice,
            size,
            remainingSize: size,
            status: 'OPEN',
            orderType: 'LIMIT',
            makerFee: 0,
            takerFee: 0,
          },
        ],
        { session }
      );

      // Create sell order
      const sellOrder = await PolygonOrder.create(
        [
          {
            marketId,
            auctionId,
            userId,
            walletAddress,
            side: 'SELL',
            outcome,
            price: sellPrice,
            size,
            remainingSize: size,
            status: 'OPEN',
            orderType: 'LIMIT',
            makerFee: 0,
            takerFee: 0,
          },
        ],
        { session }
      );

      // 6. Commit transaction
      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          buyOrderId: buyOrder[0]._id.toString(),
          sellOrderId: sellOrder[0]._id.toString(),
          spread: sellPrice - buyPrice,
        },
        {
          status: 201,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
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
    console.error('[MM Quote Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
