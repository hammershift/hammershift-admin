import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/auctions?auction_id=213123 to get a single car
    if (auction_id) {
      const car = await Auctions.findOne({ auction_id: auction_id });
      return NextResponse.json(car);
    }
    // api/auctions to get all cars
    const cars = await Auctions.find().limit(limit).skip(offset);
    return NextResponse.json({ total: cars.length, cars: cars });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const newAuctionDetails = await req.json();

    const updatedAuction = await Auctions.findOneAndUpdate(
      { auction_id: auction_id },
      newAuctionDetails,
      { new: true }
    );

    if (!updatedAuction) {
      return NextResponse.json({ message: "Auction not found" });
    }

    return NextResponse.json(updatedAuction);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
