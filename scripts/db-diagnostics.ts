/**
 * Comprehensive Database Diagnostics
 *
 * Checks for:
 * - Data integrity issues
 * - Orphaned records
 * - Missing references
 * - Stale data
 * - Index usage
 * - Schema mismatches
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
import Badges from "../src/app/models/badge.model";
import LeaderboardSnapshots from "../src/app/models/leaderboardSnapshot.model";
import UserEvents from "../src/app/models/userEvent.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

interface DiagnosticReport {
  timestamp: Date;
  issues: {
    critical: any[];
    warnings: any[];
    info: any[];
  };
  stats: {
    total_auctions: number;
    total_predictions: number;
    total_users: number;
    total_tournaments: number;
    total_streaks: number;
    total_badges: number;
  };
}

const report: DiagnosticReport = {
  timestamp: new Date(),
  issues: {
    critical: [],
    warnings: [],
    info: [],
  },
  stats: {
    total_auctions: 0,
    total_predictions: 0,
    total_users: 0,
    total_tournaments: 0,
    total_streaks: 0,
    total_badges: 0,
  },
};

function logCritical(message: string, data?: any) {
  console.log(`\n🚨 CRITICAL: ${message}`);
  if (data) console.log(data);
  report.issues.critical.push({ message, data });
}

function logWarning(message: string, data?: any) {
  console.log(`\n⚠️  WARNING: ${message}`);
  if (data) console.log(data);
  report.issues.warnings.push({ message, data });
}

function logInfo(message: string, data?: any) {
  console.log(`\nℹ️  INFO: ${message}`);
  if (data) console.log(data);
  report.issues.info.push({ message, data });
}

function logSuccess(message: string) {
  console.log(`\n✅ ${message}`);
}

async function checkAuctionIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING AUCTION DATA INTEGRITY");
  console.log("=".repeat(60));

  const now = new Date();

  // Count total auctions
  const totalAuctions = await Auctions.countDocuments();
  report.stats.total_auctions = totalAuctions;
  logInfo(`Total auctions in database: ${totalAuctions}`);

  // Check for active auctions with past deadlines
  const staleActive = await Auctions.find({
    isActive: true,
    "sort.deadline": { $lt: now },
  }).select("_id title sort.deadline isActive ended");

  if (staleActive.length > 0) {
    logCritical(
      `Found ${staleActive.length} active auctions with past deadlines (should be marked inactive)`,
      staleActive.map((a: any) => ({
        id: a._id,
        title: a.title,
        deadline: a.sort?.deadline,
        isActive: a.isActive,
        ended: a.ended,
      }))
    );
  } else {
    logSuccess("No stale active auctions found");
  }

  // Check for ended but still active auctions
  const endedButActive = await Auctions.find({
    isActive: true,
    ended: true,
  }).select("_id title isActive ended");

  if (endedButActive.length > 0) {
    logCritical(
      `Found ${endedButActive.length} auctions marked as both ended AND active`,
      endedButActive.map((a: any) => ({
        id: a._id,
        title: a.title,
        isActive: a.isActive,
        ended: a.ended,
      }))
    );
  } else {
    logSuccess("No ended-but-active auctions found");
  }

  // Check for auctions missing sort.deadline
  const missingDeadline = await Auctions.find({
    isActive: true,
    "sort.deadline": { $exists: false },
  }).select("_id title isActive sort");

  if (missingDeadline.length > 0) {
    logWarning(
      `Found ${missingDeadline.length} active auctions missing sort.deadline`,
      missingDeadline.map((a: any) => ({
        id: a._id,
        title: a.title,
        sort: a.sort,
      }))
    );
  } else {
    logSuccess("All active auctions have sort.deadline");
  }

  // Check for duplicate auction_ids
  const duplicates = await Auctions.aggregate([
    { $group: { _id: "$auction_id", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length > 0) {
    logCritical(
      `Found ${duplicates.length} duplicate auction_ids`,
      duplicates
    );
  } else {
    logSuccess("No duplicate auction_ids found");
  }

  // Check for negative or invalid pot values
  const invalidPot = await Auctions.find({
    pot: { $lt: 0 },
  }).select("_id title pot");

  if (invalidPot.length > 0) {
    logWarning(
      `Found ${invalidPot.length} auctions with negative pot values`,
      invalidPot.map((a: any) => ({ id: a._id, title: a.title, pot: a.pot }))
    );
  } else {
    logSuccess("No invalid pot values found");
  }

  // Check prediction_count accuracy
  const auctionsWithPredictions = await Auctions.aggregate([
    {
      $lookup: {
        from: "predictions",
        localField: "_id",
        foreignField: "auction_id",
        as: "actual_predictions",
      },
    },
    {
      $project: {
        title: 1,
        prediction_count: 1,
        actual_count: { $size: "$actual_predictions" },
        mismatch: {
          $ne: ["$prediction_count", { $size: "$actual_predictions" }],
        },
      },
    },
    { $match: { mismatch: true } },
  ]);

  if (auctionsWithPredictions.length > 0) {
    logWarning(
      `Found ${auctionsWithPredictions.length} auctions with mismatched prediction_count`,
      auctionsWithPredictions
    );
  } else {
    logSuccess("All auction prediction_count values are accurate");
  }
}

async function checkPredictionIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING PREDICTION DATA INTEGRITY");
  console.log("=".repeat(60));

  const totalPredictions = await Predictions.countDocuments();
  report.stats.total_predictions = totalPredictions;
  logInfo(`Total predictions in database: ${totalPredictions}`);

  // Check for orphaned predictions (auction_id doesn't exist)
  const orphanedPredictions = await Predictions.aggregate([
    {
      $lookup: {
        from: "auctions",
        localField: "auction_id",
        foreignField: "_id",
        as: "auction",
      },
    },
    { $match: { auction: { $size: 0 } } },
    {
      $project: {
        _id: 1,
        auction_id: 1,
        "user.username": 1,
        predictedPrice: 1,
      },
    },
    { $limit: 10 },
  ]);

  if (orphanedPredictions.length > 0) {
    logCritical(
      `Found orphaned predictions (auction doesn't exist)`,
      orphanedPredictions
    );
  } else {
    logSuccess("No orphaned predictions found");
  }

  // Check for predictions with invalid user references
  const invalidUserPredictions = await Predictions.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user.userId",
        foreignField: "_id",
        as: "user_doc",
      },
    },
    { $match: { user_doc: { $size: 0 } } },
    {
      $project: {
        _id: 1,
        "user.userId": 1,
        "user.username": 1,
      },
    },
    { $limit: 10 },
  ]);

  if (invalidUserPredictions.length > 0) {
    logCritical(
      `Found predictions with invalid user references`,
      invalidUserPredictions
    );
  } else {
    logSuccess("All predictions have valid user references");
  }

  // Check for negative predicted prices
  const negativePrices = await Predictions.find({
    predictedPrice: { $lt: 0 },
  })
    .select("_id auction_id user.username predictedPrice")
    .limit(10);

  if (negativePrices.length > 0) {
    logWarning(
      `Found ${negativePrices.length} predictions with negative prices`,
      negativePrices
    );
  } else {
    logSuccess("No negative predicted prices found");
  }

  // Check for predictions with tournament_id but tournament doesn't exist
  const orphanedTournamentPredictions = await Predictions.aggregate([
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
    {
      $project: {
        _id: 1,
        tournament_id: 1,
        "user.username": 1,
      },
    },
    { $limit: 10 },
  ]);

  if (orphanedTournamentPredictions.length > 0) {
    logWarning(
      `Found predictions referencing non-existent tournaments`,
      orphanedTournamentPredictions
    );
  } else {
    logSuccess("All tournament predictions reference valid tournaments");
  }

  // Check for duplicate predictions (same user, same auction)
  const duplicatePredictions = await Predictions.aggregate([
    {
      $group: {
        _id: { userId: "$user.userId", auctionId: "$auction_id" },
        count: { $sum: 1 },
        predictions: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]);

  if (duplicatePredictions.length > 0) {
    logWarning(
      `Found users with multiple predictions on the same auction`,
      duplicatePredictions
    );
  } else {
    logSuccess("No duplicate predictions found");
  }
}

async function checkUserIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING USER DATA INTEGRITY");
  console.log("=".repeat(60));

  const totalUsers = await Users.countDocuments();
  report.stats.total_users = totalUsers;
  logInfo(`Total users in database: ${totalUsers}`);

  // Check for duplicate emails
  const duplicateEmails = await Users.aggregate([
    { $group: { _id: "$email", count: { $sum: 1 }, users: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicateEmails.length > 0) {
    logCritical(
      `Found ${duplicateEmails.length} duplicate email addresses`,
      duplicateEmails
    );
  } else {
    logSuccess("No duplicate emails found");
  }

  // Check for duplicate usernames
  const duplicateUsernames = await Users.aggregate([
    {
      $group: {
        _id: "$username",
        count: { $sum: 1 },
        users: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicateUsernames.length > 0) {
    logCritical(
      `Found ${duplicateUsernames.length} duplicate usernames`,
      duplicateUsernames
    );
  } else {
    logSuccess("No duplicate usernames found");
  }

  // Check for users with negative balance
  const negativeBalance = await Users.find({ balance: { $lt: 0 } })
    .select("_id username email balance")
    .limit(10);

  if (negativeBalance.length > 0) {
    logWarning(
      `Found ${negativeBalance.length} users with negative balance`,
      negativeBalance
    );
  } else {
    logSuccess("No users with negative balance");
  }

  // Check for users with invalid ladder_tier
  const invalidTier = await Users.find({
    ladder_tier: { $nin: ["rookie", "silver", "gold", "pro"] },
  })
    .select("_id username ladder_tier")
    .limit(10);

  if (invalidTier.length > 0) {
    logWarning(
      `Found ${invalidTier.length} users with invalid ladder_tier`,
      invalidTier
    );
  } else {
    logSuccess("All users have valid ladder_tier values");
  }

  // Check for streak inconsistencies (current_streak > longest_streak)
  const streakInconsistencies = await Users.find({
    $expr: { $gt: ["$current_streak", "$longest_streak"] },
  })
    .select("_id username current_streak longest_streak")
    .limit(10);

  if (streakInconsistencies.length > 0) {
    logWarning(
      `Found ${streakInconsistencies.length} users with current_streak > longest_streak`,
      streakInconsistencies
    );
  } else {
    logSuccess("No streak inconsistencies found");
  }

  // Check for users missing in streaks collection
  const usersWithoutStreaks = await Users.aggregate([
    {
      $lookup: {
        from: "streaks",
        localField: "_id",
        foreignField: "user_id",
        as: "streak",
      },
    },
    { $match: { streak: { $size: 0 } } },
    { $project: { _id: 1, username: 1, createdAt: 1 } },
    { $limit: 10 },
  ]);

  if (usersWithoutStreaks.length > 0) {
    logWarning(
      `Found ${usersWithoutStreaks.length} users without streak records`,
      usersWithoutStreaks
    );
  } else {
    logSuccess("All users have streak records");
  }
}

async function checkTournamentIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING TOURNAMENT DATA INTEGRITY");
  console.log("=".repeat(60));

  const totalTournaments = await Tournaments.countDocuments();
  report.stats.total_tournaments = totalTournaments;
  logInfo(`Total tournaments in database: ${totalTournaments}`);

  const now = new Date();

  // Check for active tournaments that have ended
  const staleTournaments = await Tournaments.find({
    isActive: true,
    endTime: { $lt: now },
  }).select("_id tournament_id name endTime isActive haveWinners");

  if (staleTournaments.length > 0) {
    logWarning(
      `Found ${staleTournaments.length} active tournaments past their end time`,
      staleTournaments
    );
  } else {
    logSuccess("No stale active tournaments found");
  }

  // Check for tournaments with invalid auction references
  const tournamentsWithInvalidAuctions = await Tournaments.aggregate([
    { $unwind: "$auction_ids" },
    {
      $lookup: {
        from: "auctions",
        localField: "auction_ids",
        foreignField: "_id",
        as: "auction",
      },
    },
    { $match: { auction: { $size: 0 } } },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        invalid_auction_ids: { $push: "$auction_ids" },
      },
    },
    { $limit: 10 },
  ]);

  if (tournamentsWithInvalidAuctions.length > 0) {
    logCritical(
      `Found tournaments referencing non-existent auctions`,
      tournamentsWithInvalidAuctions
    );
  } else {
    logSuccess("All tournament auctions are valid");
  }

  // Check for tournaments with invalid user references
  const tournamentsWithInvalidUsers = await Tournaments.aggregate([
    { $unwind: "$users" },
    {
      $lookup: {
        from: "users",
        localField: "users.userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $match: { user: { $size: 0 } } },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        invalid_user_ids: { $push: "$users.userId" },
      },
    },
    { $limit: 10 },
  ]);

  if (tournamentsWithInvalidUsers.length > 0) {
    logCritical(
      `Found tournaments with invalid user references`,
      tournamentsWithInvalidUsers
    );
  } else {
    logSuccess("All tournament users are valid");
  }

  // Check for duplicate tournament_ids
  const duplicateTournamentIds = await Tournaments.aggregate([
    {
      $group: {
        _id: "$tournament_id",
        count: { $sum: 1 },
        tournaments: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicateTournamentIds.length > 0) {
    logCritical(
      `Found ${duplicateTournamentIds.length} duplicate tournament_ids`,
      duplicateTournamentIds
    );
  } else {
    logSuccess("No duplicate tournament_ids found");
  }
}

async function checkStreakIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING STREAK DATA INTEGRITY");
  console.log("=".repeat(60));

  const totalStreaks = await Streaks.countDocuments();
  report.stats.total_streaks = totalStreaks;
  logInfo(`Total streak records in database: ${totalStreaks}`);

  // Check for orphaned streaks (user doesn't exist)
  const orphanedStreaks = await Streaks.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $match: { user: { $size: 0 } } },
    { $project: { _id: 1, user_id: 1 } },
    { $limit: 10 },
  ]);

  if (orphanedStreaks.length > 0) {
    logCritical(
      `Found ${orphanedStreaks.length} orphaned streak records`,
      orphanedStreaks
    );
  } else {
    logSuccess("No orphaned streak records found");
  }

  // Check for duplicate user_id in streaks
  const duplicateStreaks = await Streaks.aggregate([
    {
      $group: {
        _id: "$user_id",
        count: { $sum: 1 },
        streak_ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicateStreaks.length > 0) {
    logCritical(
      `Found ${duplicateStreaks.length} users with duplicate streak records`,
      duplicateStreaks
    );
  } else {
    logSuccess("No duplicate streak records found");
  }

  // Check for current_streak > longest_streak
  const invalidStreaks = await Streaks.find({
    $expr: { $gt: ["$current_streak", "$longest_streak"] },
  })
    .select("_id user_id current_streak longest_streak")
    .limit(10);

  if (invalidStreaks.length > 0) {
    logWarning(
      `Found ${invalidStreaks.length} streaks with current > longest`,
      invalidStreaks
    );
  } else {
    logSuccess("All streak values are valid");
  }
}

async function checkBadgeIntegrity() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING BADGE DATA INTEGRITY");
  console.log("=".repeat(60));

  const totalBadges = await Badges.countDocuments();
  report.stats.total_badges = totalBadges;
  logInfo(`Total badges in database: ${totalBadges}`);

  // Check for orphaned badges (user doesn't exist)
  const orphanedBadges = await Badges.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $match: { user: { $size: 0 } } },
    { $project: { _id: 1, user_id: 1, badge_type: 1 } },
    { $limit: 10 },
  ]);

  if (orphanedBadges.length > 0) {
    logCritical(
      `Found ${orphanedBadges.length} orphaned badge records`,
      orphanedBadges
    );
  } else {
    logSuccess("No orphaned badge records found");
  }

  // Check for duplicate badges (same user, same badge_type)
  const duplicateBadges = await Badges.aggregate([
    {
      $group: {
        _id: { user_id: "$user_id", badge_type: "$badge_type" },
        count: { $sum: 1 },
        badge_ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicateBadges.length > 0) {
    logWarning(
      `Found ${duplicateBadges.length} duplicate badge records`,
      duplicateBadges
    );
  } else {
    logSuccess("No duplicate badge records found");
  }
}

async function checkIndexes() {
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING DATABASE INDEXES");
  console.log("=".repeat(60));

  const collections = [
    { name: "auctions", model: Auctions },
    { name: "predictions", model: Predictions },
    { name: "users", model: Users },
    { name: "tournaments", model: Tournaments },
    { name: "streaks", model: Streaks },
    { name: "badges", model: Badges },
    { name: "leaderboard_snapshots", model: LeaderboardSnapshots },
    { name: "user_events", model: UserEvents },
  ];

  for (const { name, model } of collections) {
    try {
      const indexes = await model.collection.getIndexes();
      const indexCount = Object.keys(indexes).length;
      logInfo(`${name}: ${indexCount} indexes`, Object.keys(indexes));
    } catch (error: any) {
      logWarning(`Failed to get indexes for ${name}`, error.message);
    }
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("DIAGNOSTIC SUMMARY");
  console.log("=".repeat(60));

  console.log("\nDatabase Statistics:");
  console.log(`  Auctions: ${report.stats.total_auctions}`);
  console.log(`  Predictions: ${report.stats.total_predictions}`);
  console.log(`  Users: ${report.stats.total_users}`);
  console.log(`  Tournaments: ${report.stats.total_tournaments}`);
  console.log(`  Streaks: ${report.stats.total_streaks}`);
  console.log(`  Badges: ${report.stats.total_badges}`);

  console.log("\nIssues Found:");
  console.log(`  🚨 Critical: ${report.issues.critical.length}`);
  console.log(`  ⚠️  Warnings: ${report.issues.warnings.length}`);
  console.log(`  ℹ️  Info: ${report.issues.info.length}`);

  if (report.issues.critical.length === 0 && report.issues.warnings.length === 0) {
    console.log("\n✅ Database integrity check passed!");
  } else {
    console.log("\n⚠️  Database has integrity issues that need attention");
  }

  console.log(`\nDiagnostics completed at: ${report.timestamp.toISOString()}`);
  console.log("=".repeat(60) + "\n");
}

async function runDiagnostics() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    await checkAuctionIntegrity();
    await checkPredictionIntegrity();
    await checkUserIntegrity();
    await checkTournamentIntegrity();
    await checkStreakIntegrity();
    await checkBadgeIntegrity();
    await checkIndexes();
    await printSummary();

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    // Exit with error code if critical issues found
    process.exit(report.issues.critical.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Error running diagnostics:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runDiagnostics();
