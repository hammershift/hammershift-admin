import { Types } from "mongoose";
import Streaks from "@/app/models/streak.model";
import Users from "@/app/models/user.model";
import { trackEvent, EventTypes } from "./eventTracking";
import connectToDB from "./mongoose";

/**
 * Streak Manager Utility
 *
 * Handles user streak tracking with UTC date-only comparison.
 * Awards freeze tokens at milestones.
 */

export interface StreakResult {
  streak: number;
  updated: boolean;
  milestone_reached: boolean;
}

export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  freeze_tokens: number;
  at_risk: boolean;
}

/**
 * Calculate days between two dates (UTC, date-only comparison)
 */
function dateDiffInDays(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Update user's streak after making a prediction
 */
export async function updateStreak(
  userId: string | Types.ObjectId
): Promise<StreakResult> {
  await connectToDB();

  const userIdObj = new Types.ObjectId(userId.toString());

  // Get or create streak document
  let streak = await Streaks.findOne({ user_id: userIdObj });

  if (!streak) {
    streak = await Streaks.create({
      user_id: userIdObj,
      current_streak: 0,
      longest_streak: 0,
      last_prediction_date: null,
      freeze_tokens: 0,
    });
  }

  // Get today's date (UTC, date-only)
  const today = new Date().toISOString().split("T")[0];
  const lastDate = streak.last_prediction_date?.toISOString().split("T")[0];

  let wasUpdated = false;
  let milestoneReached = false;

  if (!lastDate) {
    // First ever prediction
    streak.current_streak = 1;
    streak.longest_streak = 1;
    wasUpdated = true;
  } else if (lastDate === today) {
    // Already predicted today - no change
    return {
      streak: streak.current_streak,
      updated: false,
      milestone_reached: false,
    };
  } else {
    const daysSince = dateDiffInDays(lastDate, today);

    if (daysSince === 1) {
      // Consecutive day - increment
      streak.current_streak++;
      if (streak.current_streak > streak.longest_streak) {
        streak.longest_streak = streak.current_streak;
      }
      wasUpdated = true;
    } else if (daysSince > 1) {
      // Gap detected
      if (streak.freeze_tokens > 0) {
        // Use freeze token - preserve streak (do NOT trigger milestone awards)
        streak.freeze_tokens--;
        wasUpdated = true;
        streak.last_prediction_date = new Date(today);
        await streak.save();
        if (wasUpdated) {
          await trackEvent(userIdObj, EventTypes.STREAK_UPDATED, {
            current_streak: streak.current_streak,
            is_new_high: false,
            milestone_reached: false,
          });
        }
        await Users.updateOne(
          { _id: userIdObj },
          {
            current_streak: streak.current_streak,
            longest_streak: streak.longest_streak,
            last_prediction_at: new Date(),
          }
        );
        return { streak: streak.current_streak, updated: true, milestone_reached: false };
      } else {
        // Streak broken
        streak.current_streak = 1;
        wasUpdated = true;
      }
    }
  }

  // Update last prediction date
  streak.last_prediction_date = new Date(today);
  await streak.save();

  // Check for milestone badges (only when streak was genuinely incremented)
  const milestones = [3, 7, 14, 30];
  if (milestones.includes(streak.current_streak)) {
    milestoneReached = true;

    // Award freeze tokens at certain milestones
    if (streak.current_streak === 7) {
      streak.freeze_tokens += 1;
      await streak.save();
    }
    if (streak.current_streak === 30) {
      streak.freeze_tokens += 3;
      await streak.save();
    }

    // Fire streak milestone event
    await trackEvent(userIdObj, EventTypes.STREAK_MILESTONE, {
      streak: streak.current_streak,
    });
  }

  // Fire streak_updated event
  if (wasUpdated) {
    await trackEvent(userIdObj, EventTypes.STREAK_UPDATED, {
      current_streak: streak.current_streak,
      is_new_high: streak.current_streak === streak.longest_streak,
      milestone_reached: milestoneReached,
    });
  }

  // Sync to user model
  await Users.updateOne(
    { _id: userIdObj },
    {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_prediction_at: new Date(),
    }
  );

  return {
    streak: streak.current_streak,
    updated: wasUpdated,
    milestone_reached: milestoneReached,
  };
}

/**
 * Get streak status for a user
 */
export async function getStreak(
  userId: string | Types.ObjectId
): Promise<StreakStatus> {
  await connectToDB();

  const userIdObj = new Types.ObjectId(userId.toString());
  const streak = await Streaks.findOne({ user_id: userIdObj });

  if (!streak) {
    return {
      current_streak: 0,
      longest_streak: 0,
      freeze_tokens: 0,
      at_risk: false,
    };
  }

  // Check if streak is at risk (no prediction today yet)
  const today = new Date().toISOString().split("T")[0];
  const lastDate = streak.last_prediction_date?.toISOString().split("T")[0];

  return {
    current_streak: streak.current_streak,
    longest_streak: streak.longest_streak,
    freeze_tokens: streak.freeze_tokens,
    at_risk: lastDate !== today && streak.current_streak > 0,
  };
}
