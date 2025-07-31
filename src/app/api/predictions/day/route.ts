import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import Predictions from "@/app/models/prediction.model";
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const date = req.nextUrl.searchParams.get("predictionDate");

    if (!date) {
      return NextResponse.error();
    }
    return NextResponse.json({ date: date });
    //date string for end of day
    // const endOfToday = new Date(date as string);
    // endOfToday.setHours(23, 59, 59, 999);

    // const predictions = await Predictions.find({
    //   createdAt: {
    //     $gte: startOfToday,
    //     $lt: endOfToday,
    //   },
    // });

    // return NextResponse.json(
    //   { total: predictions.length, predictions: predictions },
    //   { status: 200 }
    // );
  } catch (error) {
    console.error("Failed to fetch predictions:", error);
    return NextResponse.error();
  }
}
