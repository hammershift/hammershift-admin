import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
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
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Internal server error" });
  }
}