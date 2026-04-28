import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import PolygonMarket from '@/app/models/PolygonMarket.model';
import Auctions from '@/app/models/auction.model';
import { createAuditLog, AuditActions, AuditResources } from '@/app/lib/auditLogger';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * POST /api/admin/polygon-markets/create
 *
 * Create a new Polygon prediction market linked to an auction
 *
 * Authorization: Admin only
 * Rate limit: STANDARD preset (10 req/min)
 */

const createMarketSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  question: z.string().min(1, 'Question is required').max(200, 'Question must be 200 characters or less'),
  endDate: z.string().datetime('Invalid date format'),
  initialLiquidity: z.number().optional().default(0),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // 2. Authorization check (admin or owner)
    if (session.user.role !== 'admin' && session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const validation = createMarketSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { auctionId, question, endDate, initialLiquidity } = validation.data;

    // 4. Validate auction exists
    const auction = await Auctions.findById(auctionId);

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // 5. Validate market end date is before auction deadline (if available)
    const marketEndDate = new Date(endDate);

    if (auction.sort?.deadline) {
      const auctionEndDate = new Date(auction.sort.deadline);

      if (marketEndDate >= auctionEndDate) {
        return NextResponse.json(
          { error: 'Market end date must be before auction end date' },
          { status: 400 }
        );
      }
    }

    // 6. Generate mock contract address and token IDs
    // In production, this would call smart contract to create market
    const marketId = crypto.randomBytes(16).toString('hex');
    const contractAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
    const yesTokenId = `token-yes-${marketId}`;
    const noTokenId = `token-no-${marketId}`;

    // 7. Create market in database
    const market = await PolygonMarket.create({
      auctionId,
      contractAddress,
      yesTokenId,
      noTokenId,
      status: 'PENDING',
      predictedPrice: auction.avg_predicted_price || 0,
      totalVolume: 0,
      totalLiquidity: initialLiquidity,
      totalFees: 0,
      makerRebatesPaid: 0,
      adminId: session.user.id,
    });

    // 8. Create audit log entry
    await createAuditLog({
      userId: session.user.id,
      username: session.user.email || 'unknown',
      userRole: session.user.role || 'admin',
      action: 'polygon_market.created',
      resource: 'PolygonMarket',
      resourceId: market._id.toString(),
      method: 'POST',
      endpoint: '/api/admin/polygon-markets/create',
      status: 'success',
      metadata: {
        auctionId,
        question,
        endDate,
        marketId: market._id.toString(),
        contractAddress,
      },
      req,
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        marketId: market._id.toString(),
        contractAddress,
        yesTokenId,
        noTokenId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle duplicate key error (market already exists for auction)
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Market already exists for this auction' },
        { status: 409 }
      );
    }

    console.error('[Market Creation Error]', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
