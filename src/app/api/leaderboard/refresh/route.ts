import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { verifyCronRequest } from "@/app/lib/cronAuth";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import Predictions from "@/app/models/prediction.model";
import connectToDB from "@/app/lib/mongoose";

/**
 * POST /api/leaderboard/refresh
 *
 * Refresh leaderboard snapshots for a given period.
 * Requires admin authentication or cron secret.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    // Auth: admin or cron
    const session = await getServerSession(authOptions);
    const isCron = verifyCronRequest(req);

    if (!isCron && session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "weekly";

    // Validate period
    if (!["weekly", "monthly", "alltime"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be weekly, monthly, or alltime." },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "alltime":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Aggregate predictions
    const results = await Predictions.aggregate([
      {
        $match: {
          scored_at: { $gte: startDate },
          score: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$user.userId",
          total_score: { $sum: "$score" },
          predictions_count: { $sum: 1 },
          high_accuracy_count: {
            $sum: { $cond: [{ $gte: ["$score", 800] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          user_id: "$_id",
          score: "$total_score",
          predictions_count: 1,
          accuracy_pct: {
            $multiply: [
              { $divide: ["$high_accuracy_count", "$predictions_count"] },
              100,
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 10000 }, // Process max 10k users
    ]);

    // Delete old snapshots for this period
    const deleteResult = await LeaderboardSnapshots.deleteMany({ period });

    // Create new snapshots
    const snapshotDocs = results.map((result, index) => ({
      period,
      user_id: result.user_id,
      rank: index + 1,
      score: result.score,
      accuracy_pct: Math.round(result.accuracy_pct || 0),
      predictions_count: result.predictions_count,
      snapshot_at: now,
    }));

    if (snapshotDocs.length > 0) {
      await LeaderboardSnapshots.insertMany(snapshotDocs);
    }

    return NextResponse.json(
      {
        message: `Leaderboard refreshed for ${period}`,
        users_ranked: snapshotDocs.length,
        top_score: snapshotDocs[0]?.score || 0,
        snapshot_at: now,
        old_snapshots_deleted: deleteResult.deletedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Leaderboard refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh leaderboard", details: error.message },
      { status: 500 }
    );
  }
}
