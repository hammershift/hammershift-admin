/**
 * Database Cleanup Script
 *
 * Fixes common data integrity issues:
 * - Marks stale auctions as inactive
 * - Updates prediction counts
 * - Creates missing streak records
 * - Fixes streak inconsistencies
 * - Removes orphaned records (with confirmation)
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

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

// Safety flag - set to true to actually make changes
const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--execute");

interface CleanupStats {
  stale_auctions_fixed: number;
  prediction_counts_updated: number;
  streak_records_created: number;
  streak_inconsistencies_fixed: number;
  orphaned_predictions_removed: number;
  orphaned_badges_removed: number;
  orphaned_streaks_removed: number;
}

const stats: CleanupStats = {
  stale_auctions_fixed: 0,
  prediction_counts_updated: 0,
  streak_records_created: 0,
  streak_inconsistencies_fixed: 0,
  orphaned_predictions_removed: 0,
  orphaned_badges_removed: 0,
  orphaned_streaks_removed: 0,
};

function log(message: string) {
  const prefix = DRY_RUN ? "[DRY RUN]" : "[EXECUTE]";
  console.log(`${prefix} ${message}`);
}

async function fixStaleAuctions() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING STALE ACTIVE AUCTIONS");
  console.log("=".repeat(60));

  const now = new Date();

  // Find auctions that are active but have past deadlines
  const staleAuctions = await Auctions.find({
    isActive: true,
    "sort.deadline": { $lt: now },
  });

  log(`Found ${staleAuctions.length} stale active auctions`);

  if (!DRY_RUN && staleAuctions.length > 0) {
    const result = await Auctions.updateMany(
      {
        isActive: true,
        "sort.deadline": { $lt: now },
      },
      {
        $set: { isActive: false },
      }
    );

    stats.stale_auctions_fixed = result.modifiedCount;
    log(`✅ Marked ${result.modifiedCount} auctions as inactive`);
  } else if (staleAuctions.length > 0) {
    log(`Would mark ${staleAuctions.length} auctions as inactive`);
  }

  // Fix auctions that are both ended AND active
  const endedButActive = await Auctions.find({
    isActive: true,
    ended: true,
  });

  log(`Found ${endedButActive.length} auctions marked as both ended and active`);

  if (!DRY_RUN && endedButActive.length > 0) {
    const result = await Auctions.updateMany(
      {
        isActive: true,
        ended: true,
      },
      {
        $set: { isActive: false },
      }
    );

    stats.stale_auctions_fixed += result.modifiedCount;
    log(`✅ Fixed ${result.modifiedCount} ended-but-active auctions`);
  } else if (endedButActive.length > 0) {
    log(`Would fix ${endedButActive.length} ended-but-active auctions`);
  }
}

async function updatePredictionCounts() {
  console.log("\n" + "=".repeat(60));
  console.log("UPDATING AUCTION PREDICTION COUNTS");
  console.log("=".repeat(60));

  // Get actual prediction counts
  const actualCounts = await Predictions.aggregate([
    {
      $group: {
        _id: "$auction_id",
        count: { $sum: 1 },
      },
    },
  ]);

  log(`Found prediction counts for ${actualCounts.length} auctions`);

  let updatedCount = 0;

  for (const { _id: auctionId, count } of actualCounts) {
    const auction = await Auctions.findById(auctionId);

    if (!auction) {
      log(`⚠️  Auction ${auctionId} not found (orphaned predictions)`);
      continue;
    }

    if (auction.prediction_count !== count) {
      log(
        `Updating auction ${auction.title}: ${auction.prediction_count} -> ${count}`
      );

      if (!DRY_RUN) {
        await Auctions.updateOne(
          { _id: auctionId },
          { $set: { prediction_count: count } }
        );
        updatedCount++;
      }
    }
  }

  stats.prediction_counts_updated = updatedCount;

  if (!DRY_RUN) {
    log(`✅ Updated ${updatedCount} auction prediction counts`);
  } else {
    log(`Would update ${updatedCount} auction prediction counts`);
  }
}

async function createMissingStreakRecords() {
  console.log("\n" + "=".repeat(60));
  console.log("CREATING MISSING STREAK RECORDS");
  console.log("=".repeat(60));

  // Find users without streak records
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
    { $project: { _id: 1, username: 1, current_streak: 1, longest_streak: 1 } },
  ]);

  log(`Found ${usersWithoutStreaks.length} users without streak records`);

  if (!DRY_RUN && usersWithoutStreaks.length > 0) {
    const streaksToCreate = usersWithoutStreaks.map((user) => ({
      user_id: user._id,
      current_streak: user.current_streak || 0,
      longest_streak: user.longest_streak || 0,
      last_prediction_date: null,
      freeze_tokens: 0,
    }));

    await Streaks.insertMany(streaksToCreate);
    stats.streak_records_created = streaksToCreate.length;
    log(`✅ Created ${streaksToCreate.length} streak records`);
  } else if (usersWithoutStreaks.length > 0) {
    log(`Would create ${usersWithoutStreaks.length} streak records`);
  }
}

async function fixStreakInconsistencies() {
  console.log("\n" + "=".repeat(60));
  console.log("FIXING STREAK INCONSISTENCIES");
  console.log("=".repeat(60));

  // Fix users where current_streak > longest_streak
  const userInconsistencies = await Users.find({
    $expr: { $gt: ["$current_streak", "$longest_streak"] },
  });

  log(
    `Found ${userInconsistencies.length} users with current_streak > longest_streak`
  );

  if (!DRY_RUN && userInconsistencies.length > 0) {
    for (const user of userInconsistencies) {
      await Users.updateOne(
        { _id: user._id },
        { $set: { longest_streak: user.current_streak } }
      );
    }
    stats.streak_inconsistencies_fixed = userInconsistencies.length;
    log(`✅ Fixed ${userInconsistencies.length} user streak inconsistencies`);
  } else if (userInconsistencies.length > 0) {
    log(`Would fix ${userInconsistencies.length} user streak inconsistencies`);
  }

  // Fix streak collection inconsistencies
  const streakInconsistencies = await Streaks.find({
    $expr: { $gt: ["$current_streak", "$longest_streak"] },
  });

  log(
    `Found ${streakInconsistencies.length} streak records with current > longest`
  );

  if (!DRY_RUN && streakInconsistencies.length > 0) {
    for (const streak of streakInconsistencies) {
      await Streaks.updateOne(
        { _id: streak._id },
        { $set: { longest_streak: streak.current_streak } }
      );
    }
    stats.streak_inconsistencies_fixed += streakInconsistencies.length;
    log(`✅ Fixed ${streakInconsistencies.length} streak record inconsistencies`);
  } else if (streakInconsistencies.length > 0) {
    log(`Would fix ${streakInconsistencies.length} streak record inconsistencies`);
  }
}

async function removeOrphanedPredictions() {
  console.log("\n" + "=".repeat(60));
  console.log("REMOVING ORPHANED PREDICTIONS");
  console.log("=".repeat(60));

  // Find predictions where auction doesn't exist
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
    { $project: { _id: 1 } },
  ]);

  log(`Found ${orphanedPredictions.length} orphaned predictions`);

  if (!DRY_RUN && orphanedPredictions.length > 0) {
    const ids = orphanedPredictions.map((p) => p._id);
    const result = await Predictions.deleteMany({ _id: { $in: ids } });
    stats.orphaned_predictions_removed = result.deletedCount || 0;
    log(`✅ Removed ${result.deletedCount} orphaned predictions`);
  } else if (orphanedPredictions.length > 0) {
    log(`Would remove ${orphanedPredictions.length} orphaned predictions`);
  }
}

async function removeOrphanedBadges() {
  console.log("\n" + "=".repeat(60));
  console.log("REMOVING ORPHANED BADGES");
  console.log("=".repeat(60));

  // Find badges where user doesn't exist
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
    { $project: { _id: 1 } },
  ]);

  log(`Found ${orphanedBadges.length} orphaned badges`);

  if (!DRY_RUN && orphanedBadges.length > 0) {
    const ids = orphanedBadges.map((b) => b._id);
    const result = await Badges.deleteMany({ _id: { $in: ids } });
    stats.orphaned_badges_removed = result.deletedCount || 0;
    log(`✅ Removed ${result.deletedCount} orphaned badges`);
  } else if (orphanedBadges.length > 0) {
    log(`Would remove ${orphanedBadges.length} orphaned badges`);
  }
}

async function removeOrphanedStreaks() {
  console.log("\n" + "=".repeat(60));
  console.log("REMOVING ORPHANED STREAKS");
  console.log("=".repeat(60));

  // Find streaks where user doesn't exist
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
    { $project: { _id: 1 } },
  ]);

  log(`Found ${orphanedStreaks.length} orphaned streaks`);

  if (!DRY_RUN && orphanedStreaks.length > 0) {
    const ids = orphanedStreaks.map((s) => s._id);
    const result = await Streaks.deleteMany({ _id: { $in: ids } });
    stats.orphaned_streaks_removed = result.deletedCount || 0;
    log(`✅ Removed ${result.deletedCount} orphaned streaks`);
  } else if (orphanedStreaks.length > 0) {
    log(`Would remove ${orphanedStreaks.length} orphaned streaks`);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("CLEANUP SUMMARY");
  console.log("=".repeat(60));

  console.log("\nActions Performed:");
  console.log(`  Stale auctions fixed: ${stats.stale_auctions_fixed}`);
  console.log(`  Prediction counts updated: ${stats.prediction_counts_updated}`);
  console.log(`  Streak records created: ${stats.streak_records_created}`);
  console.log(`  Streak inconsistencies fixed: ${stats.streak_inconsistencies_fixed}`);
  console.log(`  Orphaned predictions removed: ${stats.orphaned_predictions_removed}`);
  console.log(`  Orphaned badges removed: ${stats.orphaned_badges_removed}`);
  console.log(`  Orphaned streaks removed: ${stats.orphaned_streaks_removed}`);

  const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);

  if (DRY_RUN) {
    console.log(
      `\n⚠️  DRY RUN MODE - No changes were made to the database`
    );
    console.log(`   Run with --execute flag to apply ${totalActions} changes`);
  } else {
    console.log(`\n✅ Cleanup completed - ${totalActions} changes applied`);
  }

  console.log("=".repeat(60) + "\n");
}

async function runCleanup() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("DATABASE CLEANUP SCRIPT");
    console.log("=".repeat(60));

    if (DRY_RUN) {
      console.log("\n⚠️  Running in DRY RUN mode - no changes will be made");
      console.log("   Use --execute flag to apply changes\n");
    } else {
      console.log("\n🚨 Running in EXECUTE mode - changes will be applied!\n");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    await fixStaleAuctions();
    await updatePredictionCounts();
    await createMissingStreakRecords();
    await fixStreakInconsistencies();
    await removeOrphanedPredictions();
    await removeOrphanedBadges();
    await removeOrphanedStreaks();
    await printSummary();

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running cleanup:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runCleanup();
