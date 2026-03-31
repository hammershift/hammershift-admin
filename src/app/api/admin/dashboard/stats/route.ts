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

    const [
      totalUsers,
      activeTournaments,
      pendingWithdrawals,
      totalAuctions,
      walletAgg,
      rakeAgg,
      activeGTHAuctions,
      activePredictions,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("tournaments").countDocuments({
        $or: [
          { isActive: true },
          { status: { $in: ["active", "upcoming"] } },
          { startDate: { $gte: new Date() } },
        ],
      }),
      db
        .collection("transactions")
        .aggregate([
          {
            $match: {
              type: "withdraw",
              status: { $in: ["pending", "requested"] },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              total: { $sum: "$amount" },
            },
          },
        ])
        .toArray(),
      db.collection("auctions").countDocuments(),
      db
        .collection("wallets")
        .aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }])
        .toArray(),
      db
        .collection("transactions")
        .aggregate([
          {
            $match: {
              type: { $in: ["rake", "platform_fee", "entry_fee"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      db
        .collection("guessthehammers")
        .distinct("auction", { status: "pending" })
        .then((ids: unknown[]) => ids.length),
      db
        .collection("wagers")
        .countDocuments({ status: { $in: ["active", "pending"] } }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeTournaments,
      pendingWithdrawals: {
        count: pendingWithdrawals[0]?.count ?? 0,
        total: pendingWithdrawals[0]?.total ?? 0,
      },
      totalAuctions,
      totalWalletBalance: walletAgg[0]?.total ?? 0,
      totalRakeRevenue: rakeAgg[0]?.total ?? 0,
      activeGTHGames: activeGTHAuctions,
      activePredictions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
