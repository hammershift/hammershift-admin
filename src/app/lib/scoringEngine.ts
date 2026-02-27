import { Types } from "mongoose";
import Predictions from "@/app/models/prediction.model";
import Auctions from "@/app/models/auction.model";
import Streaks from "@/app/models/streak.model";

/**
 * Scoring Engine v2
 *
 * Implements the new scoring algorithm with bonus modifiers
 * for predictions and tournaments.
 */

export interface BonusModifiers {
  early_bird: boolean;
  streak_bonus: boolean;
  bullseye: boolean;
  tournament_multiplier: boolean;
}

export interface ScoringResult {
  score: number;
  delta: number;
  rank: number | null;
  modifiers: BonusModifiers;
}

/**
 * Calculate base score using v2 formula
 * Score = max(0, round(1000 * (1 - |predicted - actual| / actual)))
 */
export function calculateBaseScore(
  predictedPrice: number,
  actualPrice: number
): number {
  if (actualPrice <= 0) return 0;

  const percentageOff = Math.abs(predictedPrice - actualPrice) / actualPrice;
  return Math.max(0, Math.round(1000 * (1 - percentageOff)));
}

/**
 * Check bonus conditions for a prediction
 */
export async function checkBonusConditions(
  prediction: any,
  auction: any,
  actualPrice: number
): Promise<BonusModifiers> {
  const modifiers: BonusModifiers = {
    early_bird: false,
    streak_bonus: false,
    bullseye: false,
    tournament_multiplier: false,
  };

  // Early bird: > 48h before auction end
  const auctionEndTime = auction.sort?.deadline || auction.end_time;
  const hoursBefore =
    (new Date(auctionEndTime).getTime() -
      new Date(prediction.createdAt).getTime()) /
    (1000 * 60 * 60);
  modifiers.early_bird = hoursBefore > 48;

  // Streak bonus: user has streak >= 5
  const streak = await Streaks.findOne({ user_id: prediction.user.userId });
  modifiers.streak_bonus = (streak?.current_streak || 0) >= 5;

  // Bullseye: within 1% of actual
  const percentageOff =
    Math.abs(prediction.predictedPrice - actualPrice) / actualPrice;
  modifiers.bullseye = percentageOff <= 0.01;

  // Tournament multiplier: in a tournament
  modifiers.tournament_multiplier = !!prediction.tournament_id;

  return modifiers;
}

/**
 * Apply bonus points and multipliers
 */
export function applyBonuses(
  baseScore: number,
  modifiers: BonusModifiers
): number {
  let finalScore = baseScore;
  let bonusPoints = 0;

  if (modifiers.early_bird) bonusPoints += 50;
  if (modifiers.streak_bonus) bonusPoints += 25;
  if (modifiers.bullseye) bonusPoints += 200;

  if (modifiers.tournament_multiplier) {
    finalScore = Math.round(finalScore * 1.5);
  }

  return finalScore + bonusPoints;
}

/**
 * Score a single prediction
 */
export async function scorePrediction(
  predictionId: Types.ObjectId,
  actualPrice: number
): Promise<ScoringResult> {
  // 1. Fetch prediction with related data
  const prediction = await Predictions.findById(predictionId);
  if (!prediction) {
    throw new Error(`Prediction ${predictionId} not found`);
  }

  const auction = await Auctions.findById(prediction.auction_id);
  if (!auction) {
    throw new Error(`Auction ${prediction.auction_id} not found`);
  }

  // 2. Calculate base score
  const baseScore = calculateBaseScore(prediction.predictedPrice, actualPrice);

  // 3. Check bonus conditions
  const modifiers = await checkBonusConditions(
    prediction,
    auction,
    actualPrice
  );

  // 4. Apply bonuses
  const finalScore = applyBonuses(baseScore, modifiers);

  // 5. Calculate delta
  const delta = Math.abs(prediction.predictedPrice - actualPrice);

  // 6. Update prediction document
  await Predictions.updateOne(
    { _id: predictionId },
    {
      $set: {
        score: finalScore,
        delta_from_actual: delta,
        scored_at: new Date(),
        bonus_modifiers: modifiers,
      },
    }
  );

  // 7. Fire prediction_scored event
  // Import dynamically to avoid circular dependencies
  const { trackEvent } = await import("./eventTracking");
  await trackEvent(prediction.user.userId.toString(), "prediction_scored", {
    prediction_id: predictionId.toString(),
    score: finalScore,
    delta,
    modifiers,
  });

  // 8. Check/award badges
  // Import dynamically to avoid circular dependencies
  const { checkAndAwardBadges } = await import("./badgeChecker");
  await checkAndAwardBadges(prediction.user.userId, {
    event_type: "prediction_scored",
    data: { score: finalScore },
  });

  return {
    score: finalScore,
    delta,
    rank: null, // Assigned during tournament compute
    modifiers,
  };
}

/**
 * Score all predictions for an auction
 */
export async function scoreAuctionPredictions(
  auctionId: Types.ObjectId,
  hammerPrice: number
): Promise<number> {
  const predictions = await Predictions.find({
    auction_id: auctionId,
    isActive: true,
  });

  let scoredCount = 0;

  for (const prediction of predictions) {
    try {
      await scorePrediction(prediction._id, hammerPrice);
      scoredCount++;
    } catch (error) {
      console.error(`Failed to score prediction ${prediction._id}:`, error);
      // Continue scoring others
    }
  }

  return scoredCount;
}
