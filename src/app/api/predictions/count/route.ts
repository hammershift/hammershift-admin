import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import Predictions from "@/app/models/prediction.model";
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const total = await Predictions.countDocuments({ isActive: true });

    if (total) {
      return NextResponse.json({ total: total }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Cannot find Predictions" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
