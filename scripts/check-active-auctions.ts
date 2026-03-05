/**
 * Check Active Auctions Script
 * Shows all auctions with isActive: true
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Auctions from "../src/app/models/auction.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function checkActiveAuctions() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected\n");

    // Find all active auctions
    const activeAuctions = await Auctions.find({ isActive: true })
      .select("_id auction_id title isActive ended attributes")
      .limit(10);

    console.log(`Found ${activeAuctions.length} active auction(s):\n`);

    if (activeAuctions.length === 0) {
      console.log("❌ No auctions have isActive: true");
      console.log("\nThis is why they're not showing up!");
      console.log("The 'Add to Platform' button should set isActive: true\n");
    } else {
      activeAuctions.forEach((auction: any) => {
        const title = auction.title || "No title";
        const makeAttr = auction.attributes?.find((attr: any) => attr.key === "make");
        const make = makeAttr?.value || "Unknown";

        console.log(`✅ ${auction._id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Make: ${make}`);
        console.log(`   isActive: ${auction.isActive}`);
        console.log(`   ended: ${auction.ended || false}\n`);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkActiveAuctions();
