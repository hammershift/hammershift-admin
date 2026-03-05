/**
 * Reset Admin Password Script
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admins from "../src/app/models/admin.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function resetPassword() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected\n");

    // Hash new password
    const newPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update rdeacon password
    const result = await Admins.updateOne(
      { username: "rdeacon" },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Password reset successful!");
      console.log("Username: rdeacon");
      console.log("New Password: Password123!\n");
    } else {
      console.log("❌ User 'rdeacon' not found\n");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetPassword();
