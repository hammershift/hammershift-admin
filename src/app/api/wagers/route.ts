import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const wager_id = req.nextUrl.searchParams.get("wager_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 5;

    // api/wagers?wager_id=213123 to get a specific wager
    if (wager_id) {
      const wager = await Wagers.findOne({ _id: wager_id });
      return NextResponse.json(wager);
    }
    // api/wagers to get all users
    const wagers = await Wagers.find().limit(limit).skip(offset);
    return NextResponse.json({ total: wagers.length, wagers: wagers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
