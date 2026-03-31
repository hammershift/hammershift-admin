import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";

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
    const auctionId = searchParams.get("auctionId");

    if (!auctionId) {
      return NextResponse.json(
        { error: "auctionId required" },
        { status: 400 }
      );
    }

    const auction = await db.collection("auctions").findOne(
      { _id: new mongoose.Types.ObjectId(auctionId) },
      {
        projection: {
          gthEntryFee: 1,
          gthEnabled: 1,
          title: 1,
          year: 1,
          make: 1,
          model: 1,
        },
      }
    );

    if (!auction) {
      return NextResponse.json(
        { error: "Auction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      auctionId,
      gthEnabled: auction.gthEnabled ?? true,
      gthEntryFee: auction.gthEntryFee ?? 5,
    });
  } catch (error) {
    console.error("GTH config GET error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
    const body = (await req.json()) as {
      auctionId: string;
      gthEnabled: boolean;
      gthEntryFee: number;
    };

    if (!body.auctionId) {
      return NextResponse.json(
        { error: "auctionId required" },
        { status: 400 }
      );
    }

    await db.collection("auctions").updateOne(
      { _id: new mongoose.Types.ObjectId(body.auctionId) },
      {
        $set: {
          gthEnabled: body.gthEnabled,
          gthEntryFee: body.gthEntryFee,
          updatedAt: new Date(),
        },
      }
    );

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "GTH_CONFIG_UPDATE",
      resource: AuditResources.AUCTION || "Auction",
      resourceId: body.auctionId,
      method: "PUT",
      endpoint: `/api/admin/guess-the-hammer/config`,
      status: "success",
      changes: {
        after: {
          gthEnabled: body.gthEnabled,
          gthEntryFee: body.gthEntryFee,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GTH config PUT error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
