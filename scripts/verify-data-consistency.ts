/**
 * Data Consistency Verification Script
 *
 * Verifies that data is consistent across related collections:
 * - User data matches between Users and Streaks
 * - Prediction counts match actual predictions
 * - Tournament users have valid predictions
 * - All references are valid
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Auctions from "../src/app/models/auction.model";
import Predictions from "../src/app/models/prediction.model";
import Users from "../src/app/models/user.model";
import Tournaments from "../src/app/models/tournament.model";
import Streaks from "../src/app/models/streak.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

interface ConsistencyIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedItems?: any[];
}

const issues: ConsistencyIssue[] = [];

function addIssue(
  type: string,
  severity: "critical" | "warning" | "info",
  description: string,
  affectedItems?: any[]
) {
  issues.push({ type, severity, description, affectedItems });

  const icon = severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
  console.log(`${icon} ${description}`);
  if (affectedItems && affectedItems.length > 0) {
    console.log(`   Affected: ${affectedItems.length} items`);
  }
}

async function checkUserStreakConsistency() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING USER <-> STREAK CONSISTENCY");
  console.log("=".repeat(60) + "\n");

  // Check that user streak fields match streak collection
  const usersWithStreaks = await Users.aggregate([
    {
      $lookup: {
        from: "streaks",
        localField: "_id",
        foreignField: "user_id",
        as: "streak_doc",
      },
    },
    {
      $match: {
        $or: [
          { streak_doc: { $size: 0 } }, // User has no streak document
          {
            $expr: {
              $or: [
                {
                  $ne: [
                    "$current_streak",
                    { $arrayElemAt: ["$streak_doc.current_streak", 0] },
                  ],
                },
                {
                  $ne: [
                    "$longest_streak",
                    { $arrayElemAt: ["$streak_doc.longest_streak", 0] },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    {
      $project: {
        username: 1,
        user_current: "$current_streak",
        user_longest: "$longest_streak",
        streak_current: { $arrayElemAt: ["$streak_doc.current_streak", 0] },
        streak_longest: { $arrayElemAt: ["$streak_doc.longest_streak", 0] },
        has_streak_doc: { $gt: [{ $size: "$streak_doc" }, 0] },
      },
    },
  ]);

  if (usersWithStreaks.length > 0) {
    addIssue(
      "user_streak_mismatch",
      "warning",
      `Found ${usersWithStreaks.length} users with mismatched streak data between Users and Streaks collections`,
      usersWithStreaks.slice(0, 5)
    );

    console.log("\n  Sample mismatches:");
    usersWithStreaks.slice(0, 5).forEach((user: any) => {
      console.log(`    ${user.username}:`);
      console.log(
        `      User doc: current=${user.user_current}, longest=${user.user_longest}`
      );
      console.log(
        `      Streak doc: current=${user.streak_current}, longest=${user.streak_longest}`
      );
    });
  } else {
    console.log("✅ All user streak data is consistent");
  }
}

async function checkPredictionCounts() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING PREDICTION COUNT ACCURACY");
  console.log("=".repeat(60) + "\n");

  // Get actual prediction counts and compare with stored values
  const countMismatches = await Auctions.aggregate([
    {
      $lookup: {
        from: "predictions",
        localField: "_id",
        foreignField: "auction_id",
        as: "predictions",
      },
    },
    {
      $project: {
        title: 1,
        stored_count: "$prediction_count",
        actual_count: { $size: "$predictions" },
        mismatch: {
          $ne: ["$prediction_count", { $size: "$predictions" }],
        },
      },
    },
    { $match: { mismatch: true } },
  ]);

  if (countMismatches.length > 0) {
    addIssue(
      "prediction_count_mismatch",
      "warning",
      `Found ${countMismatches.length} auctions with incorrect prediction_count`,
      countMismatches.slice(0, 5)
    );

    console.log("\n  Sample mismatches:");
    countMismatches.slice(0, 5).forEach((auction: any) => {
      console.log(`    ${auction.title}:`);
      console.log(`      Stored: ${auction.stored_count}`);
      console.log(`      Actual: ${auction.actual_count}`);
    });
  } else {
    console.log("✅ All prediction counts are accurate");
  }
}

async function checkTournamentUserPredictions() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING TOURNAMENT USER PREDICTIONS");
  console.log("=".repeat(60) + "\n");

  // For each active tournament, check that users have predictions
  const activeTournaments = await Tournaments.find({ isActive: true });

  console.log(`Checking ${activeTournaments.length} active tournaments...\n`);

  for (const tournament of activeTournaments) {
    const usersWithoutPredictions = [];

    for (const user of tournament.users) {
      const predictionCount = await Predictions.countDocuments({
        tournament_id: tournament._id,
        "user.userId": user.userId,
      });

      if (predictionCount === 0) {
        usersWithoutPredictions.push({
          username: user.username,
          userId: user.userId,
        });
      }
    }

    if (usersWithoutPredictions.length > 0) {
      addIssue(
        "tournament_user_no_predictions",
        "info",
        `Tournament "${tournament.name}" has ${usersWithoutPredictions.length} users without predictions`,
        usersWithoutPredictions.slice(0, 3)
      );
    } else {
      console.log(`✅ Tournament "${tournament.name}": All users have predictions`);
    }
  }
}

async function checkDuplicatePredictions() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING FOR DUPLICATE PREDICTIONS");
  console.log("=".repeat(60) + "\n");

  const duplicates = await Predictions.aggregate([
    {
      $group: {
        _id: {
          userId: "$user.userId",
          auctionId: "$auction_id",
          tournamentId: "$tournament_id",
        },
        count: { $sum: 1 },
        predictions: { $push: { id: "$_id", price: "$predictedPrice" } },
      },
    },
    { $match: { count: { $gt: 1 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id.userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $lookup: {
        from: "auctions",
        localField: "_id.auctionId",
        foreignField: "_id",
        as: "auction",
      },
    },
    {
      $project: {
        username: { $arrayElemAt: ["$user.username", 0] },
        auction_title: { $arrayElemAt: ["$auction.title", 0] },
        count: 1,
        predictions: 1,
      },
    },
  ]);

  if (duplicates.length > 0) {
    addIssue(
      "duplicate_predictions",
      "critical",
      `Found ${duplicates.length} cases of duplicate predictions (same user, same auction)`,
      duplicates.slice(0, 3)
    );

    console.log("\n  Sample duplicates:");
    duplicates.slice(0, 3).forEach((dup: any) => {
      console.log(`    ${dup.username} on "${dup.auction_title}":`);
      console.log(`      ${dup.count} predictions found`);
      dup.predictions.forEach((pred: any) => {
        console.log(`        - $${pred.price} (ID: ${pred.id})`);
      });
    });
  } else {
    console.log("✅ No duplicate predictions found");
  }
}

async function checkOrphanedReferences() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING FOR ORPHANED REFERENCES");
  console.log("=".repeat(60) + "\n");

  // Predictions referencing non-existent auctions
  console.log("Checking predictions -> auctions...");
  const orphanedPredictionAuctions = await Predictions.aggregate([
    {
      $lookup: {
        from: "auctions",
        localField: "auction_id",
        foreignField: "_id",
        as: "auction",
      },
    },
    { $match: { auction: { $size: 0 } } },
    { $count: "total" },
  ]);

  const orphanedPredAuctionCount =
    orphanedPredictionAuctions.length > 0
      ? orphanedPredictionAuctions[0].total
      : 0;

  if (orphanedPredAuctionCount > 0) {
    addIssue(
      "orphaned_prediction_auctions",
      "critical",
      `Found ${orphanedPredAuctionCount} predictions referencing non-existent auctions`
    );
  } else {
    console.log("  ✅ All predictions reference valid auctions");
  }

  // Predictions referencing non-existent users
  console.log("Checking predictions -> users...");
  const orphanedPredictionUsers = await Predictions.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user.userId",
        foreignField: "_id",
        as: "user_doc",
      },
    },
    { $match: { user_doc: { $size: 0 } } },
    { $count: "total" },
  ]);

  const orphanedPredUserCount =
    orphanedPredictionUsers.length > 0 ? orphanedPredictionUsers[0].total : 0;

  if (orphanedPredUserCount > 0) {
    addIssue(
      "orphaned_prediction_users",
      "critical",
      `Found ${orphanedPredUserCount} predictions referencing non-existent users`
    );
  } else {
    console.log("  ✅ All predictions reference valid users");
  }

  // Predictions referencing non-existent tournaments
  console.log("Checking predictions -> tournaments...");
  const orphanedPredictionTournaments = await Predictions.aggregate([
    { $match: { tournament_id: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: "tournaments",
        localField: "tournament_id",
        foreignField: "_id",
        as: "tournament",
      },
    },
    { $match: { tournament: { $size: 0 } } },
    { $count: "total" },
  ]);

  const orphanedPredTournamentCount =
    orphanedPredictionTournaments.length > 0
      ? orphanedPredictionTournaments[0].total
      : 0;

  if (orphanedPredTournamentCount > 0) {
    addIssue(
      "orphaned_prediction_tournaments",
      "warning",
      `Found ${orphanedPredTournamentCount} predictions referencing non-existent tournaments`
    );
  } else {
    console.log("  ✅ All tournament predictions reference valid tournaments");
  }
}

async function checkUserTotalPoints() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING USER TOTAL POINTS ACCURACY");
  console.log("=".repeat(60) + "\n");

  // Compare user's total_points with sum of their prediction scores
  const pointsMismatches = await Users.aggregate([
    {
      $lookup: {
        from: "predictions",
        localField: "_id",
        foreignField: "user.userId",
        as: "predictions",
      },
    },
    {
      $project: {
        username: 1,
        stored_points: "$total_points",
        actual_points: {
          $sum: {
            $map: {
              input: "$predictions",
              as: "pred",
              in: { $ifNull: ["$$pred.score", 0] },
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: { $ne: ["$stored_points", "$actual_points"] },
      },
    },
  ]);

  if (pointsMismatches.length > 0) {
    addIssue(
      "total_points_mismatch",
      "warning",
      `Found ${pointsMismatches.length} users with mismatched total_points`,
      pointsMismatches.slice(0, 5)
    );

    console.log("\n  Sample mismatches:");
    pointsMismatches.slice(0, 5).forEach((user: any) => {
      console.log(`    ${user.username}:`);
      console.log(`      Stored: ${user.stored_points}`);
      console.log(`      Actual: ${user.actual_points}`);
    });
  } else {
    console.log("✅ All user total_points values are accurate");
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("DATA CONSISTENCY VERIFICATION SUMMARY");
  console.log("=".repeat(60));

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  console.log(`\nTotal issues found: ${issues.length}`);
  console.log(`  🚨 Critical: ${criticalIssues.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);
  console.log(`  ℹ️  Info: ${info.length}`);

  if (criticalIssues.length > 0) {
    console.log("\n🚨 CRITICAL ISSUES (require immediate attention):");
    criticalIssues.forEach((issue) => {
      console.log(`   - ${issue.description}`);
    });
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  WARNINGS (should be addressed):");
    warnings.forEach((issue) => {
      console.log(`   - ${issue.description}`);
    });
  }

  if (info.length > 0) {
    console.log("\nℹ️  INFO (for awareness):");
    info.forEach((issue) => {
      console.log(`   - ${issue.description}`);
    });
  }

  if (issues.length === 0) {
    console.log("\n✅ All data consistency checks passed!");
  } else {
    console.log(
      "\n⚠️  Data consistency issues detected - see details above"
    );
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

async function runVerification() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("DATA CONSISTENCY VERIFICATION");
    console.log("=".repeat(60));

    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    await checkUserStreakConsistency();
    await checkPredictionCounts();
    await checkTournamentUserPredictions();
    await checkDuplicatePredictions();
    await checkOrphanedReferences();
    await checkUserTotalPoints();
    await printSummary();

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    // Exit with error code if critical issues found
    const hasCritical = issues.some((i) => i.severity === "critical");
    process.exit(hasCritical ? 1 : 0);
  } catch (error) {
    console.error("❌ Error running verification:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runVerification();
