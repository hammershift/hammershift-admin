import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, createTournamentSchema, updateTournamentSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import Users from "@/app/models/user.model";
import Transaction from "@/app/models/transaction.model";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const tournament_id = req.nextUrl.searchParams.get("tournament_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

    // Get a specific tournament by tournament_id (numeric field)
    if (tournament_id) {
      const tournamentIdNum = parseInt(tournament_id);
      if (isNaN(tournamentIdNum)) {
        return NextResponse.json(
          { message: "Invalid tournament ID format" },
          { status: 400 }
        );
      }

      const tournament = await Tournaments.findOne({ tournament_id: tournamentIdNum });

      if (!tournament) {
        return NextResponse.json(
          { message: "Tournament not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(tournament, { status: 200 });
    }

    // Get all tournaments with pagination
    const tournaments = await Tournaments.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Tournaments.countDocuments();

    return NextResponse.json(
      {
        total,
        tournaments,
        offset,
        limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    // Validate request body
    const validation = await validateRequestBody(req.clone(), createTournamentSchema);
    if ("error" in validation) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const tournamentData = validation.data;

    // Validate all auction IDs exist
    const invalidAuctionIds = tournamentData.auction_ids.filter(id => !isValidObjectId(id));
    if (invalidAuctionIds.length > 0) {
      return NextResponse.json(
        { message: `Invalid auction IDs: ${invalidAuctionIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Create tournament in a transaction
    const result = await withTransaction(async (session) => {
      // Get the next tournament_id
      const latestTournament = await Tournaments.findOne()
        .sort({ tournament_id: -1 })
        .select("tournament_id")
        .session(session);

      const nextTournamentId = (latestTournament?.tournament_id || 0) + 1;

      // Convert auction_ids to ObjectIds
      const auctionObjectIds = tournamentData.auction_ids.map(id => new Types.ObjectId(id));

      // Create new tournament
      const newTournament = new Tournaments({
        ...tournamentData,
        tournament_id: nextTournamentId,
        _id: new Types.ObjectId(),
        auction_ids: auctionObjectIds,
        users: [],
        createdAt: new Date(),
      });

      await newTournament.save({ session });

      return newTournament;
    });

    return NextResponse.json(
      {
        message: "Tournament created successfully",
        tournament: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const tournament_id = req.nextUrl.searchParams.get("tournament_id");

    if (!tournament_id) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const tournamentIdNum = parseInt(tournament_id);
    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { message: "Invalid tournament ID format" },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req.clone(), updateTournamentSchema);
    if ("error" in validation) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if tournament exists
    const existingTournament = await Tournaments.findOne({ tournament_id: tournamentIdNum });
    if (!existingTournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // If prize pool is being updated, use transaction
    const needsTransaction = false; // Tournaments don't have direct financial updates in this route

    if (needsTransaction) {
      const result = await withTransaction(async (session) => {
        const updatedTournament = await Tournaments.findOneAndUpdate(
          { tournament_id: tournamentIdNum },
          { $set: updateData },
          { new: true, session }
        );

        return updatedTournament;
      });

      return NextResponse.json(
        {
          message: "Tournament updated successfully",
          tournament: result,
        },
        { status: 200 }
      );
    } else {
      // Simple update without transaction
      const updatedTournament = await Tournaments.findOneAndUpdate(
        { tournament_id: tournamentIdNum },
        { $set: updateData },
        { new: true }
      );

      return NextResponse.json(
        {
          message: "Tournament updated successfully",
          tournament: updatedTournament,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const body = await req.json();
    const { tournament_id } = body;

    if (!tournament_id) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const tournamentIdNum = parseInt(tournament_id);
    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { message: "Invalid tournament ID format" },
        { status: 400 }
      );
    }

    // Check if tournament exists
    const existingTournament = await Tournaments.findOne({
      tournament_id: tournamentIdNum,
    });

    if (!existingTournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if tournament has users (consider refunding them)
    if (existingTournament.users && existingTournament.users.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot delete tournament with active users. Please refund users first or end the tournament.",
        },
        { status: 400 }
      );
    }

    // Delete the tournament
    await Tournaments.deleteOne({ tournament_id: tournamentIdNum });

    return NextResponse.json(
      { message: "Tournament deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
