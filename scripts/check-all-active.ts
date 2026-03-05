/**
 * Check All Active Auctions
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Auctions from "../src/app/models/auction.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function checkAllActive() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected\n");

    const now = new Date();

    // Find all active auctions
    const activeAuctions = await Auctions.find({ isActive: true })
      .select("_id title isActive ended sort")
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`Total active auctions: ${activeAuctions.length}\n`);

    if (activeAuctions.length === 0) {
      console.log("❌ No auctions with isActive: true found!\n");
    } else {
      console.log("Active auctions:\n");

      let futureCount = 0;
      let pastCount = 0;

      activeAuctions.forEach((auction: any) => {
        const title = auction.title || "No title";
        const sortDeadline = auction.sort?.deadline;
        const deadline = sortDeadline ? new Date(sortDeadline) : null;
        const isFuture = deadline && deadline > now;

        if (isFuture) futureCount++;
        else pastCount++;

        console.log(`${isFuture ? '✅' : '❌'} ${title}`);
        console.log(`   ID: ${auction._id}`);
        console.log(`   isActive: ${auction.isActive}`);
        console.log(`   ended: ${auction.ended || false}`);
        console.log(`   Deadline: ${deadline ? deadline.toISOString() : 'NOT SET'}`);
        console.log(`   In future: ${isFuture ? 'YES' : 'NO'}`);
        console.log();
      });

      console.log(`\nSummary:`);
      console.log(`  Future deadlines: ${futureCount}`);
      console.log(`  Past deadlines: ${pastCount}`);
      console.log(`\n⚠️  Only auctions with FUTURE deadlines will show on public website!\n`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAllActive();
