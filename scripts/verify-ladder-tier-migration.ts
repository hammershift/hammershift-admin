/**
 * Verify Ladder Tier Migration
 *
 * Checks that all users have been migrated from rank_title to ladder_tier
 * and that no legacy rank_title fields remain in the database.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Users from "../src/app/models/user.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function verifyMigration() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("\n" + "=".repeat(60));
    console.log("VERIFYING LADDER_TIER MIGRATION");
    console.log("=".repeat(60) + "\n");

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Check for any documents with the old rank_title field
    const usersWithRankTitle = await Users.collection
      .find({ rank_title: { $exists: true } })
      .toArray();

    console.log("Checking for legacy 'rank_title' field:");
    if (usersWithRankTitle.length > 0) {
      console.log(`  ❌ Found ${usersWithRankTitle.length} users with rank_title field`);
      console.log("\n  Sample users:");
      usersWithRankTitle.slice(0, 5).forEach((user: any) => {
        console.log(`    - ${user.username}: rank_title="${user.rank_title}"`);
      });
      console.log("\n  ⚠️  Migration incomplete - rank_title should be removed");
    } else {
      console.log(`  ✅ No users with legacy rank_title field`);
    }

    // Check for users missing ladder_tier
    const usersWithoutLadderTier = await Users.find({
      ladder_tier: { $exists: false },
    }).select("_id username email");

    console.log("\nChecking for users missing 'ladder_tier':");
    if (usersWithoutLadderTier.length > 0) {
      console.log(
        `  ❌ Found ${usersWithoutLadderTier.length} users without ladder_tier`
      );
      console.log("\n  Users missing ladder_tier:");
      usersWithoutLadderTier.forEach((user) => {
        console.log(`    - ${user.username} (${user._id})`);
      });
    } else {
      console.log(`  ✅ All users have ladder_tier field`);
    }

    // Check for invalid ladder_tier values
    const usersWithInvalidTier = await Users.find({
      ladder_tier: { $nin: ["rookie", "silver", "gold", "pro"] },
    }).select("_id username ladder_tier");

    console.log("\nChecking for invalid ladder_tier values:");
    if (usersWithInvalidTier.length > 0) {
      console.log(
        `  ❌ Found ${usersWithInvalidTier.length} users with invalid ladder_tier`
      );
      console.log("\n  Users with invalid values:");
      usersWithInvalidTier.forEach((user) => {
        console.log(`    - ${user.username}: "${user.ladder_tier}"`);
      });
    } else {
      console.log(`  ✅ All ladder_tier values are valid`);
    }

    // Distribution of ladder tiers
    const tierDistribution = await Users.aggregate([
      {
        $group: {
          _id: "$ladder_tier",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log("\nLadder tier distribution:");
    tierDistribution.forEach((tier) => {
      console.log(`  ${tier._id}: ${tier.count} users`);
    });

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION VERIFICATION SUMMARY");
    console.log("=".repeat(60));

    const totalUsers = await Users.countDocuments();
    console.log(`\nTotal users: ${totalUsers}`);

    const issues: string[] = [];

    if (usersWithRankTitle.length > 0) {
      issues.push(
        `${usersWithRankTitle.length} users still have rank_title field`
      );
    }

    if (usersWithoutLadderTier.length > 0) {
      issues.push(
        `${usersWithoutLadderTier.length} users missing ladder_tier field`
      );
    }

    if (usersWithInvalidTier.length > 0) {
      issues.push(
        `${usersWithInvalidTier.length} users have invalid ladder_tier values`
      );
    }

    if (issues.length > 0) {
      console.log("\n❌ Migration verification FAILED\n");
      console.log("Issues found:");
      issues.forEach((issue) => console.log(`  - ${issue}`));
      console.log(
        "\nRecommended action: Run migration script to complete the migration"
      );
      process.exit(1);
    } else {
      console.log("\n✅ Migration verification PASSED");
      console.log("All users successfully migrated to ladder_tier\n");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyMigration();
