import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RateLimitPresets } from "@/app/lib/rateLimiter";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import connectToDB from "@/app/lib/mongoose";

/**
 * GET /api/leaderboard
 *
 * Query leaderboard snapshots by period.
 * Returns top N users and optionally a specific user's position.
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      await connectToDB();

      const { searchParams } = new URL(req.url);
      const period = searchParams.get("period") || "weekly";
      const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
      const userId = searchParams.get("userId");

      // Validate period
      if (!["weekly", "monthly", "alltime"].includes(period)) {
        return NextResponse.json(
          { error: "Invalid period. Must be weekly, monthly, or alltime." },
          { status: 400 }
        );
      }

      // Get latest snapshot for period
      const latestSnapshot = await LeaderboardSnapshots.findOne({ period })
        .sort({ snapshot_at: -1 })
        .lean();

      if (!latestSnapshot) {
        return NextResponse.json({
          leaderboard: [],
          user_position: null,
          snapshot_at: null,
          period,
          message: "No snapshot available yet",
        });
      }

      // Get top N users from latest snapshot
      const leaderboard = await LeaderboardSnapshots.find({
        period,
        snapshot_at: latestSnapshot.snapshot_at,
      })
        .sort({ rank: 1 })
        .limit(limit)
        .populate("user_id", "username fullName")
        .lean();

      // If userId provided, get their position
      let userPosition = null;
      if (userId) {
        userPosition = await LeaderboardSnapshots.findOne({
          period,
          user_id: userId,
          snapshot_at: latestSnapshot.snapshot_at,
        })
          .populate("user_id", "username fullName")
          .lean();
      }

      return NextResponse.json({
        leaderboard,
        user_position: userPosition,
        snapshot_at: latestSnapshot.snapshot_at,
        period,
        total_users: leaderboard.length,
      });
    } catch (error: any) {
      console.error("Leaderboard GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard", details: error.message },
        { status: 500 }
      );
    }
  }
);
