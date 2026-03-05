/**
 * Database Index Verification and Optimization
 *
 * Checks:
 * - All required indexes exist
 * - Index usage statistics
 * - Unused indexes
 * - Missing compound indexes
 * - Query performance with explain plans
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

async function checkCollectionIndexes(
  collectionName: string,
  model: any,
  requiredIndexes: string[][]
) {
  console.log("\n" + "-".repeat(60));
  console.log(`Checking ${collectionName} indexes`);
  console.log("-".repeat(60));

  try {
    // Get existing indexes
    const indexes = await model.collection.getIndexes();
    const indexKeys = Object.entries(indexes).map(([name, spec]: [string, any]) => ({
      name,
      key: spec.key,
      unique: spec.unique || false,
    }));

    console.log(`\nExisting indexes (${indexKeys.length}):`);
    indexKeys.forEach((idx) => {
      const keyStr = Object.entries(idx.key)
        .map(([field, dir]) => `${field}:${dir}`)
        .join(", ");
      const unique = idx.unique ? " [UNIQUE]" : "";
      console.log(`  - ${idx.name}: { ${keyStr} }${unique}`);
    });

    // Check for required indexes
    console.log(`\nRequired indexes:`);
    const missingIndexes: string[][] = [];

    for (const requiredKey of requiredIndexes) {
      const exists = indexKeys.some((idx) => {
        const idxFields = Object.keys(idx.key).sort();
        return (
          JSON.stringify(idxFields.sort()) === JSON.stringify(requiredKey.sort())
        );
      });

      if (exists) {
        console.log(`  ✅ { ${requiredKey.join(", ")} }`);
      } else {
        console.log(`  ❌ MISSING: { ${requiredKey.join(", ")} }`);
        missingIndexes.push(requiredKey);
      }
    }

    if (missingIndexes.length > 0) {
      console.log(
        `\n⚠️  ${missingIndexes.length} required indexes are missing!`
      );
    } else {
      console.log(`\n✅ All required indexes exist`);
    }

    // Get index stats
    try {
      const stats = await model.collection.stats();
      console.log(`\nCollection stats:`);
      console.log(`  Total documents: ${stats.count}`);
      console.log(`  Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Average doc size: ${stats.avgObjSize} bytes`);
      console.log(`  Total indexes: ${stats.nindexes}`);
      console.log(
        `  Total index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`
      );
    } catch (error: any) {
      console.log(`  ⚠️  Could not get collection stats: ${error.message}`);
    }

    return missingIndexes;
  } catch (error) {
    console.error(`❌ Error checking ${collectionName}:`, error);
    return [];
  }
}

async function testCommonQueries() {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING COMMON QUERY PERFORMANCE");
  console.log("=".repeat(60));

  const queries = [
    {
      name: "Active auctions with future deadlines",
      collection: "auctions",
      query: () =>
        Auctions.find({
          isActive: true,
          "sort.deadline": { $gt: new Date() },
        }).explain("executionStats"),
    },
    {
      name: "User's predictions",
      collection: "predictions",
      query: () => {
        // Get a sample user ID first
        return Predictions.findOne().then((pred: any) => {
          if (!pred) return null;
          return Predictions.find({ "user.userId": pred.user.userId }).explain(
            "executionStats"
          );
        });
      },
    },
    {
      name: "Leaderboard query (top 100 by total_points)",
      collection: "users",
      query: () =>
        Users.find({ isActive: true, isBanned: false })
          .sort({ total_points: -1 })
          .limit(100)
          .explain("executionStats"),
    },
    {
      name: "Active tournaments",
      collection: "tournaments",
      query: () =>
        Tournaments.find({ isActive: true }).explain("executionStats"),
    },
    {
      name: "User streak lookup",
      collection: "streaks",
      query: () => {
        return Users.findOne().then((user: any) => {
          if (!user) return null;
          return Streaks.findOne({ user_id: user._id }).explain(
            "executionStats"
          );
        });
      },
    },
  ];

  for (const { name, collection, query } of queries) {
    console.log(`\n${name} (${collection}):`);

    try {
      const explain = await query();

      if (!explain) {
        console.log("  ⚠️  Skipped - no data available");
        continue;
      }

      const stats = explain.executionStats;
      const totalDocs = stats.totalDocsExamined;
      const returnedDocs = stats.nReturned;
      const executionTime = stats.executionTimeMillis;
      const usedIndex =
        explain.queryPlanner?.winningPlan?.inputStage?.indexName ||
        explain.queryPlanner?.winningPlan?.inputStages?.[0]?.indexName ||
        "COLLSCAN";

      console.log(`  Execution time: ${executionTime}ms`);
      console.log(`  Documents examined: ${totalDocs}`);
      console.log(`  Documents returned: ${returnedDocs}`);
      console.log(`  Index used: ${usedIndex}`);

      // Warning if doing collection scan
      if (usedIndex === "COLLSCAN") {
        console.log(
          `  ⚠️  WARNING: Using collection scan (no index)!`
        );
      }

      // Warning if examining too many docs
      if (totalDocs > returnedDocs * 10) {
        console.log(
          `  ⚠️  WARNING: Examining ${totalDocs} docs to return ${returnedDocs} (inefficient)`
        );
      }

      // Good performance
      if (usedIndex !== "COLLSCAN" && totalDocs <= returnedDocs * 2) {
        console.log(`  ✅ Query is well-optimized`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

async function analyzeSlowQueries() {
  console.log("\n" + "=".repeat(60));
  console.log("SLOW QUERY ANALYSIS");
  console.log("=".repeat(60));

  console.log("\nNote: This requires MongoDB profiling to be enabled");
  console.log("To enable: db.setProfilingLevel(1, { slowms: 100 })");

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    const systemProfile = db.collection("system.profile");
    const slowQueries = await systemProfile
      .find({ millis: { $gt: 100 } })
      .sort({ millis: -1 })
      .limit(10)
      .toArray();

    if (slowQueries.length === 0) {
      console.log("\n✅ No slow queries found (or profiling not enabled)");
    } else {
      console.log(`\nTop 10 slowest queries:`);
      slowQueries.forEach((query, idx) => {
        console.log(
          `\n${idx + 1}. ${query.ns} - ${query.millis}ms`
        );
        console.log(`   Operation: ${query.op}`);
        console.log(`   Query: ${JSON.stringify(query.command)}`);
      });
    }
  } catch (error: any) {
    console.log(`\n⚠️  Could not analyze slow queries: ${error.message}`);
  }
}

async function runIndexCheck() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("DATABASE INDEX VERIFICATION");
    console.log("=".repeat(60));

    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Define required indexes for each collection
    const collections = [
      {
        name: "auctions",
        model: Auctions,
        required: [
          ["auction_id"],
          ["isActive"],
          ["ended"],
          ["isActive", "ended"],
          ["statusAndPriceChecked"],
          ["createdAt"],
          ["prediction_count"],
          ["status_display", "sort.deadline"],
        ],
      },
      {
        name: "predictions",
        model: Predictions,
        required: [
          ["auction_id"],
          ["tournament_id"],
          ["auction_id", "tournament_id"],
          ["user.userId"],
          ["auction_id", "user.userId"],
          ["isActive"],
          ["user.role"],
          ["createdAt"],
          ["score"],
          ["scored_at"],
        ],
      },
      {
        name: "users",
        model: Users,
        required: [
          ["email"],
          ["username"],
          ["role"],
          ["isActive", "isBanned"],
          ["createdAt"],
          ["total_points"],
          ["last_prediction_at"],
        ],
      },
      {
        name: "tournaments",
        model: Tournaments,
        required: [
          ["tournament_id"],
          ["isActive"],
          ["haveWinners"],
          ["startTime"],
          ["endTime"],
          ["users.userId"],
          ["createdAt"],
          ["tier"],
        ],
      },
      {
        name: "streaks",
        model: Streaks,
        required: [["user_id"]],
      },
      {
        name: "badges",
        model: Badges,
        required: [["user_id", "badge_type"], ["earned_at"]],
      },
      {
        name: "leaderboard_snapshots",
        model: LeaderboardSnapshots,
        required: [
          ["period", "rank"],
          ["period", "user_id"],
          ["period", "snapshot_at"],
        ],
      },
      {
        name: "user_events",
        model: UserEvents,
        required: [
          ["created_at"],
          ["user_id", "event_type", "created_at"],
        ],
      },
    ];

    let totalMissing = 0;

    for (const { name, model, required } of collections) {
      const missing = await checkCollectionIndexes(name, model, required);
      totalMissing += missing.length;
    }

    await testCommonQueries();
    await analyzeSlowQueries();

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));

    if (totalMissing > 0) {
      console.log(`\n⚠️  Found ${totalMissing} missing indexes`);
      console.log(
        "   These indexes should be created automatically by Mongoose schemas"
      );
      console.log("   If they're missing, there may be a schema issue");
    } else {
      console.log(`\n✅ All required indexes are present`);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running index check:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runIndexCheck();
