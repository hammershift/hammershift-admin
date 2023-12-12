// import connectToDB from "@/lib/mongoose";
import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/cars?auction_id=213123 to get a single car
    if (auction_id) {
      const car = await Auctions.findOne({ auction_id: auction_id });
      return NextResponse.json(car);
    }
    // api/cars to get all cars
    const cars = await Auctions.find().limit(limit).skip(offset);
    return NextResponse.json({ total: cars.length, cars: cars });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
