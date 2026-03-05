import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import PolygonOrderModel from "@/app/models/PolygonOrder.model";
import PolygonMarketModel from "@/app/models/PolygonMarket.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      marketId,
      auctionId,
      walletAddress,
      side,
      outcome,
      price,
      size,
      orderType = 'LIMIT',
      timeInForce = 'GTC',
      postOnly = false,
      stopPrice,
      triggerCondition,
    } = body;

    // Validation: Required fields
    if (!marketId || !auctionId || !walletAddress || !side || !outcome || price === undefined || size === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validation: Price between 0 and 1
    if (price < 0 || price > 1) {
      return NextResponse.json(
        { error: "Price must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Validation: Size must be positive
    if (size <= 0) {
      return NextResponse.json(
        { error: "Size must be greater than 0" },
        { status: 400 }
      );
    }

    // Validation: Valid side
    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json(
        { error: "Side must be BUY or SELL" },
        { status: 400 }
      );
    }

    // Validation: Valid outcome
    if (!['YES', 'NO'].includes(outcome)) {
      return NextResponse.json(
        { error: "Outcome must be YES or NO" },
        { status: 400 }
      );
    }

    // Validation: Valid order type
    if (!['LIMIT', 'MARKET', 'STOP_LOSS'].includes(orderType)) {
      return NextResponse.json(
        { error: "Order type must be LIMIT, MARKET, or STOP_LOSS" },
        { status: 400 }
      );
    }

    // Validation: Valid time in force
    if (timeInForce && !['GTC', 'FOK', 'IOC'].includes(timeInForce)) {
      return NextResponse.json(
        { error: "Time in force must be GTC, FOK, or IOC" },
        { status: 400 }
      );
    }

    // Validation: Stop-loss specific fields
    if (orderType === 'STOP_LOSS') {
      if (stopPrice === undefined || triggerCondition === undefined) {
        return NextResponse.json(
          { error: "Stop-loss orders require stopPrice and triggerCondition" },
          { status: 400 }
        );
      }

      if (stopPrice < 0 || stopPrice > 1) {
        return NextResponse.json(
          { error: "Stop price must be between 0 and 1" },
          { status: 400 }
        );
      }

      if (!['GTE', 'LTE'].includes(triggerCondition)) {
        return NextResponse.json(
          { error: "Trigger condition must be GTE or LTE" },
          { status: 400 }
        );
      }
    }

    // Validation: Post-only and FOK are mutually exclusive
    if (postOnly && timeInForce === 'FOK') {
      return NextResponse.json(
        { error: "Post-only orders cannot be Fill-or-Kill" },
        { status: 400 }
      );
    }

    // Validation: Post-only and IOC are mutually exclusive
    if (postOnly && timeInForce === 'IOC') {
      return NextResponse.json(
        { error: "Post-only orders cannot be Immediate-or-Cancel" },
        { status: 400 }
      );
    }

    // Check if market exists and is ACTIVE
    const market = await PolygonMarketModel.findOne({ _id: marketId });
    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    if (market.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Market is ${market.status}, not ACTIVE` },
        { status: 400 }
      );
    }

    // TODO: Check user has sufficient USDC balance
    // This would require integration with wallet/blockchain
    // For now, we'll create the order without balance check

    // Create order
    const orderData: any = {
      marketId,
      auctionId,
      userId: session.user.id,
      walletAddress: walletAddress.toLowerCase(),
      side,
      outcome,
      price,
      size,
      remainingSize: size,
      status: 'OPEN',
      orderType,
      timeInForce,
      postOnly,
      makerFee: 0, // TODO: Calculate fees
      takerFee: 0,
    };

    // Add stop-loss fields if applicable
    if (orderType === 'STOP_LOSS') {
      orderData.stopPrice = stopPrice;
      orderData.triggerCondition = triggerCondition;
      orderData.triggered = false;
    }

    const order = await PolygonOrderModel.create(orderData);

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order._id,
          marketId: order.marketId,
          auctionId: order.auctionId,
          side: order.side,
          outcome: order.outcome,
          price: order.price,
          size: order.size,
          remainingSize: order.remainingSize,
          status: order.status,
          orderType: order.orderType,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
