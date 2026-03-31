import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  _id: "singleton",
  defaultRakePercent: 10,
  defaultPayoutStructure: { first: 50, second: 30, third: 20 },
  defaultEntryTiers: [
    { name: "Free", buyInAmount: 0, prizeMultiplier: 0, maxEntries: 1000, enabled: true },
    { name: "Bronze", buyInAmount: 5, prizeMultiplier: 1, maxEntries: 500, enabled: true },
    { name: "Silver", buyInAmount: 15, prizeMultiplier: 3, maxEntries: 200, enabled: true },
    { name: "Gold", buyInAmount: 50, prizeMultiplier: 10, maxEntries: 50, enabled: true },
  ],
  minBuyIn: 0,
  maxBuyIn: 500,
  defaultAuctionsPerTournament: 15,
  velocityPointsDailyAllowance: 100,
  velocityPointsStartBalance: 500,
  featureFlags: {
    tournamentsEnabled: true,
    guessTheHammerEnabled: true,
    freePlayEnabled: true,
    realMoneyEnabled: true,
    maintenanceMode: false,
    signupsEnabled: true,
  },
  announcementBanners: [] as Record<string, unknown>[],
  lastUpdatedBy: "",
};

const PUT_ALLOWLIST = [
  "defaultRakePercent",
  "defaultPayoutStructure",
  "defaultEntryTiers",
  "minBuyIn",
  "maxBuyIn",
  "defaultAuctionsPerTournament",
  "velocityPointsDailyAllowance",
  "velocityPointsStartBalance",
  "featureFlags",
  "announcementBanners",
  "lastUpdatedBy",
] as const;

const PATCH_ALLOWED_PATHS = [
  "featureFlags.tournamentsEnabled",
  "featureFlags.guessTheHammerEnabled",
  "featureFlags.freePlayEnabled",
  "featureFlags.realMoneyEnabled",
  "featureFlags.maintenanceMode",
  "featureFlags.signupsEnabled",
  "defaultRakePercent",
] as const;

// ---------------------------------------------------------------------------
// GET — return current platform settings (or defaults)
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 },
    );
  }

  try {
    await connectToDB();
    const db = mongoose.connection.db!;

    const settings = await db
      .collection("platform_settings")
      .findOne({ _id: "singleton" as unknown as mongoose.mongo.BSON.ObjectId });

    return NextResponse.json(settings ?? DEFAULT_SETTINGS);
  } catch (error) {
    console.error("[Settings GET]", error);
    return NextResponse.json(
      { message: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT — full settings update
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 },
    );
  }

  try {
    const body: Record<string, unknown> = await req.json();

    // --- Validate payout structure sums to 100 ---
    if (body.defaultPayoutStructure) {
      const payout = body.defaultPayoutStructure as Record<string, number>;
      const sum = Object.values(payout).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) {
        return NextResponse.json(
          { message: `Payout structure must sum to 100 (got ${sum})` },
          { status: 400 },
        );
      }
    }

    // --- Validate rake 0-50 ---
    if (body.defaultRakePercent !== undefined) {
      const rake = body.defaultRakePercent as number;
      if (typeof rake !== "number" || rake < 0 || rake > 50) {
        return NextResponse.json(
          { message: "Rake percent must be between 0 and 50" },
          { status: 400 },
        );
      }
    }

    // --- Build $set from allowlisted fields ---
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
      lastUpdatedBy: session.user.username,
    };

    for (const key of PUT_ALLOWLIST) {
      if (key in body) {
        update[key] = body[key];
      }
    }

    await connectToDB();
    const db = mongoose.connection.db!;

    const result = await db
      .collection("platform_settings")
      .findOneAndUpdate(
        { _id: "singleton" as unknown as mongoose.mongo.BSON.ObjectId },
        { $set: update },
        { upsert: true, returnDocument: "after" },
      );

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "SETTINGS_UPDATE",
      resource: AuditResources.ADMIN || "Admin",
      resourceId: "singleton",
      method: "PUT",
      endpoint: "/api/admin/settings",
      status: "success",
      changes: { after: update },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Settings PUT]", error);
    return NextResponse.json(
      { message: "Failed to update settings" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — partial update (feature flag toggles, rake)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 },
    );
  }

  try {
    const body: Record<string, unknown> = await req.json();

    const allowedSet = new Set<string>(PATCH_ALLOWED_PATHS);
    const update: Record<string, unknown> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(body)) {
      if (allowedSet.has(key)) {
        update[key] = value;
      }
    }

    // Nothing valid to update
    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        { message: "No valid fields provided" },
        { status: 400 },
      );
    }

    await connectToDB();
    const db = mongoose.connection.db!;

    await db
      .collection("platform_settings")
      .updateOne(
        { _id: "singleton" as unknown as mongoose.mongo.BSON.ObjectId },
        { $set: update },
        { upsert: true },
      );

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "SETTINGS_UPDATE",
      resource: AuditResources.ADMIN || "Admin",
      resourceId: "singleton",
      method: "PATCH",
      endpoint: "/api/admin/settings",
      status: "success",
      changes: { after: update },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings PATCH]", error);
    return NextResponse.json(
      { message: "Failed to update settings" },
      { status: 500 },
    );
  }
}
