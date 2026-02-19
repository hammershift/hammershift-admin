import { Types } from "mongoose";
import Badges, { BadgeType } from "@/app/models/badge.model";
import Predictions from "@/app/models/prediction.model";
import Streaks from "@/app/models/streak.model";
import Users from "@/app/models/user.model";
import { trackEvent, EventTypes } from "./eventTracking";
import connectToDB from "./mongoose";

/**
 * Badge Checker Utility
 *
 * Defines badge conditions and awards badges to users.
 * Prevents duplicate badge awards.
 */

interface BadgeDefinition {
  type: BadgeType;
  condition: (userId: Types.ObjectId, context?: any) => Promise<boolean>;
  points_bonus: number;
  metadata?: (userId: Types.ObjectId, context?: any) => Promise<object>;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "first_prediction",
    condition: async (userId) => {
      const count = await Predictions.countDocuments({ "user.userId": userId });
      return count === 1;
    },
    points_bonus: 50,
  },
  {
    type: "first_win",
    condition: async (userId) => {
      const wins = await Predictions.countDocuments({
        "user.userId": userId,
        score: { $gte: 900 },
      });
      return wins === 1;
    },
    points_bonus: 100,
  },
  {
    type: "hot_start",
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 3;
    },
    points_bonus: 25,
    metadata: async () => ({ streak_days: 3 }),
  },
  {
    type: "on_fire",
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 7;
    },
    points_bonus: 50,
    metadata: async () => ({ streak_days: 7, freeze_tokens_awarded: 1 }),
  },
  {
    type: "unstoppable",
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 14;
    },
    points_bonus: 100,
    metadata: async () => ({ streak_days: 14 }),
  },
  {
    type: "legend",
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 30;
    },
    points_bonus: 200,
    metadata: async () => ({ streak_days: 30, freeze_tokens_awarded: 3 }),
  },
  {
    type: "sharpshooter",
    condition: async (userId) => {
      const highScores = await Predictions.countDocuments({
        "user.userId": userId,
        score: { $gte: 900 },
      });
      return highScores === 5;
    },
    points_bonus: 200,
  },
  {
    type: "centurion",
    condition: async (userId) => {
      const total = await Predictions.countDocuments({ "user.userId": userId });
      return total === 100;
    },
    points_bonus: 300,
  },
  {
    type: "tournament_rookie",
    condition: async (userId) => {
      const tournamentPredictions = await Predictions.countDocuments({
        "user.userId": userId,
        tournament_id: { $exists: true, $ne: null },
      });
      return tournamentPredictions === 1;
    },
    points_bonus: 75,
  },
  {
    type: "tournament_champion",
    condition: async (_userId, context) => {
      // This badge is awarded when user wins a tournament
      // Context shape: { event_type, data: { tournament_rank, tournament_id, ... } }
      return context?.data?.tournament_rank === 1;
    },
    points_bonus: 500,
    metadata: async (_userId, context) => ({
      tournament_id: context?.data?.tournament_id,
      tournament_name: context?.data?.tournament_name,
    }),
  },
];

/**
 * Check and award badges for a user based on event context
 */
export async function checkAndAwardBadges(
  userId: string | Types.ObjectId,
  context?: { event_type: string; data: any }
): Promise<any[]> {
  await connectToDB();

  const userIdObj = new Types.ObjectId(userId.toString());
  const newBadges: any[] = [];

  for (const def of BADGE_DEFINITIONS) {
    // Check if badge already awarded
    const existing = await Badges.findOne({
      user_id: userIdObj,
      badge_type: def.type,
    });

    if (existing) continue; // Already has this badge

    // Check condition
    const qualifies = await def.condition(userIdObj, context);

    if (qualifies) {
      // Get metadata if function provided
      const metadata = def.metadata
        ? await def.metadata(userIdObj, context)
        : {};

      // Award badge
      try {
        const badge = await Badges.create({
          user_id: userIdObj,
          badge_type: def.type,
          earned_at: new Date(),
          metadata,
        });

        // Award points bonus
        await Users.updateOne(
          { _id: userIdObj },
          { $inc: { total_points: def.points_bonus } }
        );

        // Fire badge_earned event
        await trackEvent(userIdObj, EventTypes.BADGE_EARNED, {
          badge_type: def.type,
          points_bonus: def.points_bonus,
          metadata,
        });

        newBadges.push(badge);
      } catch (error: any) {
        // Handle duplicate key error (race condition)
        if (error?.code !== 11000) {
          console.error(`Failed to award badge ${def.type}:`, error);
        }
      }
    }
  }

  return newBadges;
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(
  userId: string | Types.ObjectId
): Promise<any[]> {
  await connectToDB();

  const userIdObj = new Types.ObjectId(userId.toString());
  return Badges.find({ user_id: userIdObj }).sort({ earned_at: -1 });
}
