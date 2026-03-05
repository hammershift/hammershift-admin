export const dynamic = 'force-dynamic';
import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import PolygonOrderModel from "@/app/models/PolygonOrder.model";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const marketId = req.nextUrl.searchParams.get("marketId");
    const userId = req.nextUrl.searchParams.get("userId");
    const status = req.nextUrl.searchParams.get("status");
    const side = req.nextUrl.searchParams.get("side");
    const outcome = req.nextUrl.searchParams.get("outcome");

    // Build query
    const query: any = {};

    if (marketId) {
      query.marketId = marketId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (status) {
      query.status = status;
    }

    if (side) {
      if (!['BUY', 'SELL'].includes(side)) {
        return NextResponse.json(
          { error: "Invalid side parameter" },
          { status: 400 }
        );
      }
      query.side = side;
    }

    if (outcome) {
      if (!['YES', 'NO'].includes(outcome)) {
        return NextResponse.json(
          { error: "Invalid outcome parameter" },
          { status: 400 }
        );
      }
      query.outcome = outcome;
    }

    // Fetch orders sorted by price (best first) and creation time
    const orders = await PolygonOrderModel.find(query)
      .sort({ price: -1, createdAt: 1 })
      .limit(100)
      .lean();

    // Group by side and outcome for order book display
    const orderBook = {
      buy: {
        YES: orders.filter(o => o.side === 'BUY' && o.outcome === 'YES'),
        NO: orders.filter(o => o.side === 'BUY' && o.outcome === 'NO'),
      },
      sell: {
        YES: orders.filter(o => o.side === 'SELL' && o.outcome === 'YES'),
        NO: orders.filter(o => o.side === 'SELL' && o.outcome === 'NO'),
      },
    };

    return NextResponse.json(
      {
        success: true,
        total: orders.length,
        orders,
        orderBook,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
