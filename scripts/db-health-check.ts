/**
 * Quick Database Health Check
 *
 * Fast health check for monitoring database status.
 * Suitable for running in CI/CD, cron jobs, or monitoring systems.
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

interface HealthStatus {
  status: "healthy" | "warning" | "critical";
  timestamp: Date;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
    value?: any;
  }[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}

const health: HealthStatus = {
  status: "healthy",
  timestamp: new Date(),
  checks: [],
  summary: {
    total: 0,
    passed: 0,
    warnings: 0,
    failures: 0,
  },
};

function addCheck(
  name: string,
  status: "pass" | "warn" | "fail",
  message: string,
  value?: any
) {
  health.checks.push({ name, status, message, value });
  health.summary.total++;

  if (status === "pass") {
    health.summary.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else if (status === "warn") {
    health.summary.warnings++;
    health.status = health.status === "critical" ? "critical" : "warning";
    console.log(`⚠️  ${name}: ${message}${value ? ` (${value})` : ""}`);
  } else {
    health.summary.failures++;
    health.status = "critical";
    console.log(`❌ ${name}: ${message}${value ? ` (${value})` : ""}`);
  }
}

async function checkDatabaseConnection() {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      addCheck("Database Connection", "pass", "Connected to MongoDB");
    } else {
      addCheck(
        "Database Connection",
        "fail",
        "Not connected to MongoDB",
        `State: ${state}`
      );
    }
  } catch (error: any) {
    addCheck("Database Connection", "fail", error.message);
  }
}

async function checkCollectionCounts() {
  try {
    const counts = {
      auctions: await Auctions.countDocuments(),
      predictions: await Predictions.countDocuments(),
      users: await Users.countDocuments(),
      tournaments: await Tournaments.countDocuments(),
      streaks: await Streaks.countDocuments(),
    };

    if (counts.users === 0) {
      addCheck("Users Collection", "warn", "No users in database");
    } else {
      addCheck(
        "Users Collection",
        "pass",
        `${counts.users} users in database`
      );
    }

    if (counts.auctions === 0) {
      addCheck("Auctions Collection", "warn", "No auctions in database");
    } else {
      addCheck(
        "Auctions Collection",
        "pass",
        `${counts.auctions} auctions in database`
      );
    }

    addCheck(
      "Predictions Collection",
      "pass",
      `${counts.predictions} predictions in database`
    );
  } catch (error: any) {
    addCheck("Collection Counts", "fail", error.message);
  }
}

async function checkActiveAuctions() {
  try {
    const now = new Date();

    const activeCount = await Auctions.countDocuments({ isActive: true });
    const activeWithValidDeadline = await Auctions.countDocuments({
      isActive: true,
      "sort.deadline": { $gt: now },
    });
    const staleActive = activeCount - activeWithValidDeadline;

    if (activeCount === 0) {
      addCheck(
        "Active Auctions",
        "warn",
        "No active auctions",
        "isActive: true count = 0"
      );
    } else if (staleActive > 0) {
      addCheck(
        "Stale Active Auctions",
        "warn",
        `${staleActive} active auctions with past deadlines`,
        `${staleActive}/${activeCount}`
      );
    } else {
      addCheck(
        "Active Auctions",
        "pass",
        `${activeCount} active auctions, all with valid deadlines`
      );
    }
  } catch (error: any) {
    addCheck("Active Auctions", "fail", error.message);
  }
}

async function checkUserStreakConsistency() {
  try {
    const usersCount = await Users.countDocuments();
    const streaksCount = await Streaks.countDocuments();

    if (usersCount !== streaksCount) {
      const diff = Math.abs(usersCount - streaksCount);
      addCheck(
        "User-Streak Consistency",
        "warn",
        `Mismatch between users and streaks`,
        `${diff} users missing streaks`
      );
    } else {
      addCheck(
        "User-Streak Consistency",
        "pass",
        "All users have streak records"
      );
    }
  } catch (error: any) {
    addCheck("User-Streak Consistency", "fail", error.message);
  }
}

async function checkDuplicates() {
  try {
    // Check for duplicate emails
    const duplicateEmails = await Users.aggregate([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" },
    ]);

    const emailDupes = duplicateEmails.length > 0 ? duplicateEmails[0].total : 0;

    if (emailDupes > 0) {
      addCheck(
        "Duplicate Emails",
        "fail",
        `Found ${emailDupes} duplicate email addresses`
      );
    } else {
      addCheck("Duplicate Emails", "pass", "No duplicate emails found");
    }

    // Check for duplicate usernames
    const duplicateUsernames = await Users.aggregate([
      { $group: { _id: "$username", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" },
    ]);

    const usernameDupes =
      duplicateUsernames.length > 0 ? duplicateUsernames[0].total : 0;

    if (usernameDupes > 0) {
      addCheck(
        "Duplicate Usernames",
        "fail",
        `Found ${usernameDupes} duplicate usernames`
      );
    } else {
      addCheck("Duplicate Usernames", "pass", "No duplicate usernames found");
    }
  } catch (error: any) {
    addCheck("Duplicate Check", "fail", error.message);
  }
}

async function checkOrphanedRecords() {
  try {
    // Quick check for orphaned predictions (sample only)
    const sampleSize = 100;
    const samplePredictions = await Predictions.aggregate([
      { $sample: { size: sampleSize } },
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

    const orphanedCount =
      samplePredictions.length > 0 ? samplePredictions[0].total : 0;

    if (orphanedCount > 0) {
      addCheck(
        "Orphaned Predictions",
        "warn",
        `Found ${orphanedCount} orphaned predictions in sample`,
        `Sample size: ${sampleSize}`
      );
    } else {
      addCheck(
        "Orphaned Predictions",
        "pass",
        "No orphaned predictions in sample"
      );
    }
  } catch (error: any) {
    addCheck("Orphaned Records", "fail", error.message);
  }
}

async function checkIndexes() {
  try {
    // Check critical indexes exist
    const auctionIndexes = await Auctions.collection.getIndexes();
    const predictionIndexes = await Predictions.collection.getIndexes();
    const userIndexes = await Users.collection.getIndexes();

    const hasAuctionIndex = Object.keys(auctionIndexes).some((key) =>
      key.includes("auction_id")
    );
    const hasPredictionIndex = Object.keys(predictionIndexes).some((key) =>
      key.includes("auction_id")
    );
    const hasUserEmailIndex = Object.keys(userIndexes).some((key) =>
      key.includes("email")
    );

    if (!hasAuctionIndex || !hasPredictionIndex || !hasUserEmailIndex) {
      addCheck("Critical Indexes", "warn", "Some critical indexes missing");
    } else {
      addCheck("Critical Indexes", "pass", "All critical indexes exist");
    }
  } catch (error: any) {
    addCheck("Index Check", "fail", error.message);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("DATABASE HEALTH CHECK SUMMARY");
  console.log("=".repeat(60));

  const statusIcon =
    health.status === "healthy"
      ? "✅"
      : health.status === "warning"
      ? "⚠️"
      : "🚨";

  console.log(`\nOverall Status: ${statusIcon} ${health.status.toUpperCase()}`);
  console.log(`Timestamp: ${health.timestamp.toISOString()}`);

  console.log(`\nChecks: ${health.summary.total}`);
  console.log(`  ✅ Passed: ${health.summary.passed}`);
  console.log(`  ⚠️  Warnings: ${health.summary.warnings}`);
  console.log(`  ❌ Failures: ${health.summary.failures}`);

  if (health.status !== "healthy") {
    console.log("\n⚠️  Issues detected - run full diagnostics:");
    console.log("   npm run db:diagnostics");
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Output JSON for monitoring systems
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(health, null, 2));
  }
}

async function runHealthCheck() {
  try {
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI not set");
      process.exit(1);
    }

    console.log("DATABASE HEALTH CHECK");
    console.log("=".repeat(60) + "\n");

    await mongoose.connect(MONGODB_URI);

    await checkDatabaseConnection();
    await checkCollectionCounts();
    await checkActiveAuctions();
    await checkUserStreakConsistency();
    await checkDuplicates();
    await checkOrphanedRecords();
    await checkIndexes();

    await printSummary();

    await mongoose.disconnect();

    // Exit with appropriate code
    if (health.status === "critical") {
      process.exit(2); // Critical issues
    } else if (health.status === "warning") {
      process.exit(1); // Warnings
    } else {
      process.exit(0); // Healthy
    }
  } catch (error) {
    console.error("❌ Health check failed:", error);
    await mongoose.disconnect();
    process.exit(2);
  }
}

runHealthCheck();
