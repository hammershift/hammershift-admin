import connectToDB from "@/app/lib/mongoose";
import Predictions from "@/app/models/prediction.model";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const auction_id = req.nextUrl.searchParams.get("auction_id");
    //const prediction_type = req.nextUrl.searchParams.get("prediction_type");
    const tournament_id = req.nextUrl.searchParams.get("tournament_id");
    // const username = req.nextUrl.searchParams.get("username");
    // const latest = req.nextUrl.searchParams.get("latest");
    //get all predictions with the same auction_id

    if (tournament_id) {
      const predictions = await Predictions.find({
        tournament_id: tournament_id,
      }).sort({ createdAt: -1 });
      return NextResponse.json(predictions);
    }

    if (auction_id) {
      const predictions = await Predictions.find({
        auction_id: auction_id,
      });
      return NextResponse.json(predictions);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    await connectToDB();

    const prediction_id = req.nextUrl.searchParams.get("prediction_id");

    if (prediction_id) {
      await Predictions.deleteOne({
        _id: new Types.ObjectId(prediction_id),
      });
      return NextResponse.json({
        message: `Successfully deleted prediction ${prediction_id}`,
      });
    } else {
      return NextResponse.json({ message: "Missing prediction_id" });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Internal server error" });
  }
}
