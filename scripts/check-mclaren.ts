/**
 * Check McLaren Auction
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import Auctions from "../src/app/models/auction.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function checkMclaren() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected\n");

    // Find McLaren auction
    const mclaren = await Auctions.findOne({
      title: { $regex: /McLaren.*M6B/i }
    });

    if (!mclaren) {
      console.log("❌ McLaren M6B auction not found\n");
    } else {
      console.log("Found McLaren M6B:\n");
      console.log(`_id: ${mclaren._id}`);
      console.log(`title: ${mclaren.title}`);
      console.log(`isActive: ${mclaren.isActive}`);
      console.log(`ended: ${mclaren.ended || false}`);

      // Check deadline attribute
      const deadlineAttr = (mclaren as any).attributes?.find((attr: any) => attr.key === "deadline");
      const sortDeadline = (mclaren as any).sort?.deadline;

      console.log(`\nDeadline (attribute): ${deadlineAttr?.value || "Not set"}`);
      console.log(`sort.deadline: ${sortDeadline || "Not set"}`);

      const now = new Date();
      if (sortDeadline) {
        const deadline = new Date(sortDeadline);
        console.log(`\nIs deadline in future? ${deadline > now ? "YES ✅" : "NO ❌"}`);
        console.log(`Deadline: ${deadline.toISOString()}`);
        console.log(`Now:      ${now.toISOString()}`);
      }

      console.log("\n");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMclaren();
