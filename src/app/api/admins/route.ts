// import connectToDB from "@/lib/mongoose";
import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const admin_id = req.nextUrl.searchParams.get("_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/cars?auction_id=213123 to get a single admin
    if (admin_id) {
      const admin = await Admins.findOne({ _id: admin_id });
      return NextResponse.json(admin);
    }
    // api/cars to get all admins
    const admins = await Admins.find().limit(limit).skip(offset);
    return NextResponse.json({ total: admins.length, admins: admins });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
