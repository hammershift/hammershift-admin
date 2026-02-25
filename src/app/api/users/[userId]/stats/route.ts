import { NextRequest, NextResponse } from "next/server";
import { getStreak } from "@/app/lib/streakManager";
import { getUserBadges } from "@/app/lib/badgeChecker";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import connectToDB from "@/app/lib/mongoose";
import { Types } from "mongoose";

/**
 * GET /api/users/[userId]/stats
 *
 * Returns aggregated user statistics including:
 * - Predictions count
 * - Average accuracy
 * - Current rank
 * - Badges earned
 * - Streak information
 * - Total points
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectToDB();

    const { userId } = params;

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const userIdObj = new Types.ObjectId(userId);

    // Fetch user data
    const user = await Users.findById(userIdObj).lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get predictions statistics
    const predictionStats = await Predictions.aggregate([
      {
        $match: {
          "user.userId": userIdObj,
        },
      },
      {
        $group: {
          _id: null,
          total_predictions: { $sum: 1 },
          scored_predictions: {
            $sum: { $cond: [{ $ne: ["$score", null] }, 1, 0] },
          },
          avg_score: {
            $avg: { $cond: [{ $ne: ["$score", null] }, "$score", 0] },
          },
          high_accuracy_count: {
            $sum: { $cond: [{ $gte: ["$score", 800] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = predictionStats[0] || {
      total_predictions: 0,
      scored_predictions: 0,
      avg_score: 0,
      high_accuracy_count: 0,
    };

    // Calculate accuracy percentage
    const accuracy_pct =
      stats.scored_predictions > 0
        ? Math.round(
            (stats.high_accuracy_count / stats.scored_predictions) * 100
          )
        : 0;

    // Get leaderboard rank (weekly)
    const weeklyRank = await LeaderboardSnapshots.findOne({
      period: "weekly",
      user_id: userIdObj,
    })
      .sort({ snapshot_at: -1 })
      .lean() as { rank?: number; score?: number; [key: string]: any } | null;

    // Get badges
    const badges = await getUserBadges(userId);

    // Get streak status
    const streakStatus = await getStreak(userId);

    return NextResponse.json({
      user_id: userId,
      username: user.username,
      full_name: user.fullName,
      total_points: user.total_points || 0,
      ladder_tier: user.ladder_tier || "rookie",
      predictions: {
        total: stats.total_predictions,
        scored: stats.scored_predictions,
        avg_score: Math.round(stats.avg_score),
        accuracy_pct,
      },
      leaderboard: {
        weekly_rank: weeklyRank?.rank || null,
        weekly_score: weeklyRank?.score || 0,
      },
      streak: streakStatus,
      badges: {
        total: badges.length,
        recent: badges.slice(0, 5), // Show 5 most recent
      },
    });
  } catch (error: any) {
    console.error("Get user stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats", details: error.message },
      { status: 500 }
    );
  }
}
