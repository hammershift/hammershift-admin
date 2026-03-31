import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    await connectToDB();
    const db = mongoose.connection.db!;

    const { searchParams } = new URL(req.url);
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10)
    );
    const limit = Math.min(
      50,
      parseInt(searchParams.get("limit") ?? "20", 10)
    );

    const [
      totalGamesResult,
      activeGamesResult,
      totalGuessesResult,
      prizeSummaryResult,
      rakeSummaryResult,
    ] = await Promise.all([
      db.collection("guesstehammers").distinct("auction"),
      db
        .collection("guesstehammers")
        .distinct("auction", { status: "pending" }),
      db.collection("guesstehammers").countDocuments(),
      db
        .collection("guesstehammers")
        .aggregate([
          { $group: { _id: null, total: { $sum: "$prizePaid" } } },
        ])
        .toArray(),
      db
        .collection("guesstehammers")
        .aggregate([
          { $match: { isVirtual: false } },
          {
            $group: {
              _id: null,
              totalEntryFees: { $sum: "$entryFee" },
              totalPrizes: { $sum: "$prizePaid" },
            },
          },
        ])
        .toArray(),
    ]);

    const totalRake = rakeSummaryResult[0]
      ? rakeSummaryResult[0].totalEntryFees - rakeSummaryResult[0].totalPrizes
      : 0;

    const activeAuctions = await db
      .collection("guesstehammers")
      .aggregate([
        { $match: { status: "pending" } },
        {
          $group: {
            _id: "$auction",
            guessCount: { $sum: 1 },
            totalEntryFees: { $sum: "$entryFee" },
            latestGuess: { $max: "$createdAt" },
            entryFees: { $push: "$entryFee" },
          },
        },
        {
          $lookup: {
            from: "auctions",
            localField: "_id",
            foreignField: "_id",
            as: "auctionDoc",
          },
        },
        {
          $unwind: { path: "$auctionDoc", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            guessCount: 1,
            totalEntryFees: 1,
            latestGuess: 1,
            prizePool: { $multiply: ["$totalEntryFees", 0.9] },
            auctionTitle: {
              $ifNull: [
                "$auctionDoc.title",
                {
                  $concat: [
                    { $ifNull: ["$auctionDoc.year", ""] },
                    " ",
                    { $ifNull: ["$auctionDoc.make", ""] },
                    " ",
                    { $ifNull: ["$auctionDoc.model", ""] },
                  ],
                },
              ],
            },
            auctionEndTime: {
              $ifNull: [
                "$auctionDoc.deadline",
                "$auctionDoc.endDate",
                "$auctionDoc.end_date",
              ],
            },
            auctionStatus: "$auctionDoc.status",
            auctionImage: {
              $ifNull: [
                "$auctionDoc.image",
                "$auctionDoc.imageUrl",
                "$auctionDoc.thumbnail",
              ],
            },
          },
        },
        { $sort: { auctionEndTime: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .toArray();

    const gradedAuctions = await db
      .collection("guesstehammers")
      .aggregate([
        { $match: { status: { $in: ["graded", "paid"] } } },
        {
          $group: {
            _id: "$auction",
            guessCount: { $sum: 1 },
            actualPrice: { $first: "$actualPrice" },
            totalPrizes: { $sum: "$prizePaid" },
            gradedAt: { $max: "$updatedAt" },
            winner: {
              $first: {
                $cond: [
                  { $eq: ["$rank", 1] },
                  {
                    user: "$user",
                    guessedPrice: "$guessedPrice",
                    penalizedError: "$penalizedError",
                    prizePaid: "$prizePaid",
                  },
                  null,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "auctions",
            localField: "_id",
            foreignField: "_id",
            as: "auctionDoc",
          },
        },
        {
          $unwind: { path: "$auctionDoc", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            guessCount: 1,
            actualPrice: 1,
            totalPrizes: 1,
            gradedAt: 1,
            winner: 1,
            auctionTitle: {
              $ifNull: [
                "$auctionDoc.title",
                {
                  $concat: [
                    { $ifNull: ["$auctionDoc.year", ""] },
                    " ",
                    { $ifNull: ["$auctionDoc.make", ""] },
                    " ",
                    { $ifNull: ["$auctionDoc.model", ""] },
                  ],
                },
              ],
            },
          },
        },
        { $sort: { gradedAt: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    return NextResponse.json({
      summary: {
        totalGames: totalGamesResult.length,
        activeGames: activeGamesResult.length,
        totalGuesses: totalGuessesResult,
        totalPrizePaid: prizeSummaryResult[0]?.total ?? 0,
        totalRakeRevenue: totalRake,
        totalEntryFees: rakeSummaryResult[0]?.totalEntryFees ?? 0,
      },
      activeAuctions,
      gradedAuctions,
    });
  } catch (error) {
    console.error("GTH dashboard error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
