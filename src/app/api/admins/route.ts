<<<<<<< Updated upstream
import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/wager.model";
=======
// import connectToDB from "@/lib/mongoose";
import Auctions from "@/app/models/auction.model";
>>>>>>> Stashed changes
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
<<<<<<< Updated upstream
    const admin_id = req.nextUrl.searchParams.get('admin_id');
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 5;

    // api/admins?admin_id=213123 to get a specific admin
    if (admin_id) {
      const wager = await Admins.findOne({ _id: admin_id });
      return NextResponse.json(wager);
    }
    // api/admins to get all admins
    const admins = await Admins.find().limit(limit).skip(offset);
    return NextResponse.json({ total: admins.length, admins: admins  });
=======
    const auction_id = req.nextUrl.searchParams.get('auction_id');
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit'));

    // api/cars?auction_id=213123 to get a single car
    if (auction_id) {
      const car = await Auctions.findOne({ auction_id: auction_id });
      return NextResponse.json(car);
    }
    // api/cars to get all cars
    const cars = await Auctions.find().limit(limit).skip(offset);
    return NextResponse.json({ total: cars.length, cars: cars });
>>>>>>> Stashed changes
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Internal server error" });
  }
<<<<<<< Updated upstream
}
=======
}
>>>>>>> Stashed changes
