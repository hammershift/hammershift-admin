import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const body = await req.json();
    const { tournament_id } = body;

    if (!tournament_id) {
      return NextResponse.json(
        { message: "tournament_id is required" },
        { status: 400 }
      );
    }

    console.log("tournament_id");
    console.log(tournament_id);
    const tournament = await Tournaments.findOne({
      tournament_id: parseInt(tournament_id),
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    tournament.isActive = !tournament.isActive;
    await tournament.save();

    return NextResponse.json(
      {
        message: "Tournament status updated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Toggle Tournament Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
