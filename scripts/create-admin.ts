/**
 * Create Admin User Script
 *
 * Checks for existing admin users and creates one if none exist.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * Prerequisites:
 *   Create .env.local with MONGODB_URI
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admins from "../src/app/models/admin.model";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI or DATABASE_URL environment variable is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully\n");
}

async function checkAndCreateAdmin() {
  try {
    await connectDB();

    // Check for existing admins
    const adminCount = await Admins.countDocuments();
    console.log(`Found ${adminCount} admin(s) in database\n`);

    if (adminCount === 0) {
      console.log("No admins found. Creating default admin...\n");

      // Hash password
      const hashedPassword = await bcrypt.hash("Password123!", 10);

      // Create admin
      const newAdmin = await Admins.create({
        _id: new mongoose.Types.ObjectId(),
        first_name: "Rick",
        last_name: "Deacon",
        email: "rickdeaconx@gmail.com",
        username: "rickdeaconx",
        password: hashedPassword,
        role: "ADMIN",
      });

      console.log("✅ Admin created successfully!");
      console.log("Username: rickdeaconx");
      console.log("Password: Password123!");
      console.log("Email: rickdeaconx@gmail.com\n");
    } else {
      console.log("Existing admins:");
      const admins = await Admins.find({}).select("username email role");
      admins.forEach((admin) => {
        console.log(`  - ${admin.username} (${admin.email}) - Role: ${admin.role}`);
      });
      console.log();
    }

    await mongoose.disconnect();
    console.log("✅ Complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAndCreateAdmin();
