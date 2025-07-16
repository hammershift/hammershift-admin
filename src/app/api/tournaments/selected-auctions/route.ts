import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const auctionIdQuery = req.nextUrl.searchParams.get("auction_ids");
    if (!auctionIdQuery) {
      return NextResponse.json({ auctions: [], total: 0 });
    }

    const auctionIds = auctionIdQuery.split(",");

    const auctions = await Auctions.find({ _id: { $in: auctionIds } })
      .sort({ "sort.deadline": -1 })
      .lean();

    return NextResponse.json({
      total: auctions.length,
      auctions,
    });
  } catch (error) {
    console.error("Auction fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
