/**
 * Data Models Migration Script
 *
 * This script migrates existing documents in the database to add new fields
 * introduced in Phase 2 of the Velocity Markets backend enhancement.
 *
 * Usage:
 *   npx tsx scripts/migrate-data-models.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *
 * Collections affected:
 *   - users: Add gamification fields
 *   - auctions: Add prediction tracking fields
 *   - tournaments: Add scoring_version field
 *   - predictions: Add bonus_modifiers defaults
 */

import mongoose from "mongoose";
import Users from "../src/app/models/user.model";
import Auctions from "../src/app/models/auction.model";
import Tournaments from "../src/app/models/tournament.model";
import Predictions from "../src/app/models/prediction.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const isDryRun = process.argv.includes("--dry-run");

interface MigrationStats {
  collection: string;
  documentsChecked: number;
  documentsUpdated: number;
  errors: number;
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI or DATABASE_URL environment variable is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully\n");
}

async function migrateUsers(): Promise<MigrationStats> {
  console.log("=".repeat(60));
  console.log("Migrating Users Collection");
  console.log("=".repeat(60));

  const stats: MigrationStats = {
    collection: "users",
    documentsChecked: 0,
    documentsUpdated: 0,
    errors: 0,
  };

  try {
    // Find all users without new fields
    const usersToUpdate = await Users.find({
      $or: [
        { current_streak: { $exists: false } },
        { longest_streak: { $exists: false } },
        { ladder_tier: { $exists: false } },
        { total_points: { $exists: false } },
        { email_preferences: { $exists: false } },
      ],
    });

    stats.documentsChecked = usersToUpdate.length;

    console.log(`Found ${stats.documentsChecked} users to update\n`);

    for (const user of usersToUpdate) {
      try {
        const updates: any = {};

        if (!user.current_streak && user.current_streak !== 0) {
          updates.current_streak = 0;
        }
        if (!user.longest_streak && user.longest_streak !== 0) {
          updates.longest_streak = 0;
        }
        if (!user.ladder_tier) {
          updates.ladder_tier = "rookie";
        }
        if (!user.total_points && user.total_points !== 0) {
          updates.total_points = 0;
        }
        if (!user.email_preferences) {
          updates.email_preferences = {
            marketing: true,
            digests: true,
            tournaments: true,
            results: true,
          };
        }

        if (Object.keys(updates).length > 0) {
          console.log(`  User: ${user.username} (${user._id})`);
          console.log(`  Updates:`, JSON.stringify(updates, null, 2));

          if (!isDryRun) {
            await Users.updateOne({ _id: user._id }, { $set: updates });
          }

          stats.documentsUpdated++;
        }
      } catch (error) {
        console.error(`  Error updating user ${user._id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\nUsers migration complete:`);
    console.log(`  Checked: ${stats.documentsChecked}`);
    console.log(`  Updated: ${stats.documentsUpdated}`);
    console.log(`  Errors: ${stats.errors}\n`);
  } catch (error) {
    console.error("Fatal error migrating users:", error);
    throw error;
  }

  return stats;
}

async function migrateAuctions(): Promise<MigrationStats> {
  console.log("=".repeat(60));
  console.log("Migrating Auctions Collection");
  console.log("=".repeat(60));

  const stats: MigrationStats = {
    collection: "auctions",
    documentsChecked: 0,
    documentsUpdated: 0,
    errors: 0,
  };

  try {
    // Find all auctions without new fields
    const auctionsToUpdate = await Auctions.find({
      $or: [
        { prediction_count: { $exists: false } },
        { source_badge: { $exists: false } },
      ],
    });

    stats.documentsChecked = auctionsToUpdate.length;

    console.log(`Found ${stats.documentsChecked} auctions to update\n`);

    for (const auction of auctionsToUpdate) {
      try {
        const updates: any = {};

        if (!auction.prediction_count && auction.prediction_count !== 0) {
          updates.prediction_count = 0;
        }
        if (!auction.source_badge) {
          updates.source_badge = "bat";
        }

        if (Object.keys(updates).length > 0) {
          console.log(`  Auction: ${auction.title} (${auction._id})`);
          console.log(`  Updates:`, JSON.stringify(updates, null, 2));

          if (!isDryRun) {
            await Auctions.updateOne({ _id: auction._id }, { $set: updates });
          }

          stats.documentsUpdated++;
        }
      } catch (error) {
        console.error(`  Error updating auction ${auction._id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\nAuctions migration complete:`);
    console.log(`  Checked: ${stats.documentsChecked}`);
    console.log(`  Updated: ${stats.documentsUpdated}`);
    console.log(`  Errors: ${stats.errors}\n`);
  } catch (error) {
    console.error("Fatal error migrating auctions:", error);
    throw error;
  }

  return stats;
}

async function migrateTournaments(): Promise<MigrationStats> {
  console.log("=".repeat(60));
  console.log("Migrating Tournaments Collection");
  console.log("=".repeat(60));

  const stats: MigrationStats = {
    collection: "tournaments",
    documentsChecked: 0,
    documentsUpdated: 0,
    errors: 0,
  };

  try {
    // Find all tournaments without scoring_version
    const tournamentsToUpdate = await Tournaments.find({
      scoring_version: { $exists: false },
    });

    stats.documentsChecked = tournamentsToUpdate.length;

    console.log(`Found ${stats.documentsChecked} tournaments to update\n`);

    for (const tournament of tournamentsToUpdate) {
      try {
        console.log(`  Tournament: ${tournament.name} (${tournament._id})`);
        console.log(`  Setting scoring_version: "v2"`);

        if (!isDryRun) {
          await Tournaments.updateOne(
            { _id: tournament._id },
            { $set: { scoring_version: "v2" } }
          );
        }

        stats.documentsUpdated++;
      } catch (error) {
        console.error(`  Error updating tournament ${tournament._id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\nTournaments migration complete:`);
    console.log(`  Checked: ${stats.documentsChecked}`);
    console.log(`  Updated: ${stats.documentsUpdated}`);
    console.log(`  Errors: ${stats.errors}\n`);
  } catch (error) {
    console.error("Fatal error migrating tournaments:", error);
    throw error;
  }

  return stats;
}

async function migratePredictions(): Promise<MigrationStats> {
  console.log("=".repeat(60));
  console.log("Migrating Predictions Collection");
  console.log("=".repeat(60));

  const stats: MigrationStats = {
    collection: "predictions",
    documentsChecked: 0,
    documentsUpdated: 0,
    errors: 0,
  };

  try {
    // Find all predictions without bonus_modifiers
    const predictionsToUpdate = await Predictions.find({
      bonus_modifiers: { $exists: false },
    }).limit(1000); // Process in batches to avoid memory issues

    stats.documentsChecked = predictionsToUpdate.length;

    console.log(`Found ${stats.documentsChecked} predictions to update (batch limit: 1000)\n`);

    if (stats.documentsChecked === 1000) {
      console.log("⚠️  Note: More predictions may need migration. Run script again after this batch.\n");
    }

    for (const prediction of predictionsToUpdate) {
      try {
        const updates = {
          bonus_modifiers: {
            early_bird: false,
            streak_bonus: false,
            bullseye: false,
            tournament_multiplier: false,
          },
        };

        if (!isDryRun) {
          await Predictions.updateOne({ _id: prediction._id }, { $set: updates });
        }

        stats.documentsUpdated++;

        // Log progress every 100 documents
        if (stats.documentsUpdated % 100 === 0) {
          console.log(`  Progress: ${stats.documentsUpdated}/${stats.documentsChecked}`);
        }
      } catch (error) {
        console.error(`  Error updating prediction ${prediction._id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\nPredictions migration complete:`);
    console.log(`  Checked: ${stats.documentsChecked}`);
    console.log(`  Updated: ${stats.documentsUpdated}`);
    console.log(`  Errors: ${stats.errors}\n`);
  } catch (error) {
    console.error("Fatal error migrating predictions:", error);
    throw error;
  }

  return stats;
}

async function verifyIndexes() {
  console.log("=".repeat(60));
  console.log("Verifying Indexes");
  console.log("=".repeat(60));

  try {
    console.log("\nUsers indexes:");
    const userIndexes = await Users.collection.getIndexes();
    console.log(JSON.stringify(userIndexes, null, 2));

    console.log("\nAuctions indexes:");
    const auctionIndexes = await Auctions.collection.getIndexes();
    console.log(JSON.stringify(auctionIndexes, null, 2));

    console.log("\nTournaments indexes:");
    const tournamentIndexes = await Tournaments.collection.getIndexes();
    console.log(JSON.stringify(tournamentIndexes, null, 2));

    console.log("\nPredictions indexes:");
    const predictionIndexes = await Predictions.collection.getIndexes();
    console.log(JSON.stringify(predictionIndexes, null, 2));

    console.log("\n✅ Index verification complete\n");
  } catch (error) {
    console.error("Error verifying indexes:", error);
  }
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("DATA MODELS MIGRATION SCRIPT");
  console.log("=".repeat(60));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be applied)" : "LIVE"}`);
  console.log("=".repeat(60) + "\n");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No changes will be applied to the database\n");
  } else {
    console.log("🚨 LIVE MODE - Changes will be applied to the database\n");
    console.log("Press Ctrl+C within 5 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  try {
    await connectDB();

    const allStats: MigrationStats[] = [];

    // Run migrations
    allStats.push(await migrateUsers());
    allStats.push(await migrateAuctions());
    allStats.push(await migrateTournaments());
    allStats.push(await migratePredictions());

    // Verify indexes
    await verifyIndexes();

    // Summary
    console.log("=".repeat(60));
    console.log("MIGRATION SUMMARY");
    console.log("=".repeat(60));

    const totalChecked = allStats.reduce((sum, s) => sum + s.documentsChecked, 0);
    const totalUpdated = allStats.reduce((sum, s) => sum + s.documentsUpdated, 0);
    const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);

    console.log(`\nTotal documents checked: ${totalChecked}`);
    console.log(`Total documents updated: ${totalUpdated}`);
    console.log(`Total errors: ${totalErrors}\n`);

    if (isDryRun) {
      console.log("✅ Dry run completed successfully");
      console.log("Run without --dry-run to apply changes\n");
    } else {
      console.log("✅ Migration completed successfully\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
