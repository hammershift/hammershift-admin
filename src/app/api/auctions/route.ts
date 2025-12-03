import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, updateAuctionSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import Wagers from "@/app/models/wager.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

    // Get a specific auction by auction_id (string field, not ObjectId)
    if (auction_id) {
      const auction = await Auctions.findOne({ auction_id: auction_id });

      if (!auction) {
        return NextResponse.json(
          { message: "Auction not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(auction, { status: 200 });
    }

    // Get all active auctions with pagination
    const auctions = await Auctions.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Auctions.countDocuments({ isActive: true });

    return NextResponse.json(
      {
        total,
        cars: auctions,
        offset,
        limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const auction_id = req.nextUrl.searchParams.get("auction_id");

    if (!auction_id) {
      return NextResponse.json(
        { message: "Auction ID is required" },
        { status: 400 }
      );
    }

    // For this route, auction_id is the MongoDB _id, so validate as ObjectId
    if (!isValidObjectId(auction_id)) {
      return NextResponse.json(
        { message: "Invalid auction ID format" },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req.clone(), updateAuctionSchema);
    if ("error" in validation) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if auction exists
    const existingAuction = await Auctions.findById(toObjectId(auction_id));
    if (!existingAuction) {
      return NextResponse.json(
        { message: "Auction not found" },
        { status: 404 }
      );
    }

    // If pot is being updated, use transaction
    const needsTransaction = updateData.pot !== undefined;

    if (needsTransaction) {
      const result = await withTransaction(async (session) => {
        const updatedAuction = await Auctions.findByIdAndUpdate(
          toObjectId(auction_id),
          { $set: updateData },
          { new: true, session }
        );

        return updatedAuction;
      });

      return NextResponse.json(
        {
          message: "Auction updated successfully",
          auction: result,
        },
        { status: 200 }
      );
    } else {
      // Simple update without transaction
      const updatedAuction = await Auctions.findByIdAndUpdate(
        toObjectId(auction_id),
        { $set: updateData },
        { new: true }
      );

      return NextResponse.json(
        {
          message: "Auction updated successfully",
          auction: updatedAuction,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}
