import connectToDB from "@/app/lib/mongoose";
import Tournaments, { Tournament } from "@/app/models/tournament.model";
import { AggregatePaginateModel, PaginateModel } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 5;
    const searchedKeyword = req.nextUrl.searchParams.get("search");

    const options = {
      offset: offset,
      limit: limit,
    };
    if (searchedKeyword) {
      const regex = new RegExp(searchedKeyword, "i"); // Case-insensitive partial match

      const aggregate = Tournaments.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: regex } },
              { description: { $regex: regex } },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            tournament_id: 1,
            name: 1,
            description: 1,
            type: 1,
            prizePool: 1,
            buyInFee: 1,
            isActive: 1,
            startTime: 1,
            endTime: 1,
            auction_ids: 1,
            users: 1,
            maxUsers: 1,
            createdAt: 1,
          },
        },
      ]);

      const searchedTournaments = await (
        Tournaments as AggregatePaginateModel<Tournament>
      ).aggregatePaginate(aggregate, {
        ...options,
        sort: { createdAt: -1 },
      });
      return NextResponse.json({
        total: searchedTournaments.totalDocs,
        totalPages: searchedTournaments.totalPages,
        tournaments: searchedTournaments.docs,
      });
    }
    let query: any = {};

    const filteredTournaments = await (
      Tournaments as PaginateModel<Tournament>
    ).paginate(query, {
      ...options,
      sort: { createdAt: -1 },
    });

    return NextResponse.json({
      total: filteredTournaments.totalDocs,
      totalPages: filteredTournaments.totalPages,
      tournaments: filteredTournaments.docs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
