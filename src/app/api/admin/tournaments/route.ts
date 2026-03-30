import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    await connectToDB();
    const db = mongoose.connection.db!;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const type = searchParams.get("type") ?? "";

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
      filter.$or = [
        { status },
        ...(status === "active" ? [{ isActive: true }] : []),
        ...(status === "upcoming" ? [{ startTime: { $gte: new Date() } }] : []),
        ...(status === "completed" ? [{ haveWinners: true }] : []),
      ];
    }
    if (type === "auto") filter.isAutoCreated = true;
    if (type === "manual") {
      filter.$or = [
        { isAutoCreated: false },
        { isAutoCreated: { $exists: false } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await db.collection("tournaments").countDocuments(filter);
    const tournaments = await db
      .collection("tournaments")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      tournaments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Tournament list error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
