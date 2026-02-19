import { Types } from "mongoose";
import UserEvents from "@/app/models/userEvent.model";
import connectToDB from "./mongoose";

/**
 * Event Tracking Utility
 *
 * Centralized event tracking for user actions.
 * Used by streak manager, badge checker, and external integrations.
 */

/**
 * Track an event for a user
 */
export async function trackEvent(
  userId: string | Types.ObjectId,
  eventType: string,
  eventData: any = {}
): Promise<void> {
  try {
    await connectToDB();

    await UserEvents.create({
      user_id: new Types.ObjectId(userId.toString()),
      event_type: eventType,
      event_data: eventData,
      created_at: new Date(),
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

/**
 * Event type constants for consistency
 */
export const EventTypes = {
  PREDICTION_MADE: "prediction_made",
  PREDICTION_SCORED: "prediction_scored",
  TOURNAMENT_JOINED: "tournament_joined",
  STREAK_UPDATED: "streak_updated",
  STREAK_MILESTONE: "streak_milestone",
  BADGE_EARNED: "badge_earned",
  SIGNUP_COMPLETED: "signup_completed",
  AUCTION_VIEWED: "auction_viewed",
  USER_INACTIVE: "user_inactive",
  WEEKLY_DIGEST_TRIGGERED: "weekly_digest_triggered",
  AUCTION_ENDING_SOON: "auction_ending_soon",
  AUCTION_CLOSED: "auction_closed",
};
