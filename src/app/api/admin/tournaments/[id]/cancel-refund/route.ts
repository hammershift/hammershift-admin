import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const objId = new mongoose.Types.ObjectId(params.id);

    const tournament = await db
      .collection("tournaments")
      .findOne({ _id: objId });
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }
    if (tournament.status === "cancelled") {
      return NextResponse.json(
        { error: "Tournament already cancelled" },
        { status: 400 }
      );
    }
    if (tournament.status === "completed") {
      return NextResponse.json(
        { error: "Cannot cancel a completed tournament" },
        { status: 400 }
      );
    }

    // Find wagers for this tournament
    const wagers = await db
      .collection("wagers")
      .find({
        auctionObjectId: { $in: tournament.auction_ids || [] },
        status: { $in: ["active", "pending", "paid"] },
      })
      .toArray();

    let refundCount = 0;

    for (const wager of wagers) {
      const userId = wager.user || wager.userId;
      const amount = wager.wagerAmount || wager.amount || wager.buyInFee || 0;

      if (!userId || amount <= 0) continue;

      await db.collection("wallets").updateOne(
        { user: userId },
        { $inc: { balance: amount } },
        { upsert: true }
      );

      await db.collection("transactions").insertOne({
        user: userId,
        amount,
        type: "refund",
        source: "tournament",
        description: `Refund for cancelled tournament: ${tournament.name}`,
        reference: objId,
        referenceModel: "Tournament",
        status: "completed",
        createdAt: new Date(),
      });

      refundCount++;
    }

    await db.collection("tournaments").updateOne(
      { _id: objId },
      {
        $set: {
          status: "cancelled",
          isActive: false,
          cancelledAt: new Date(),
          cancelReason: "Admin cancellation with full refund",
          updatedAt: new Date(),
        },
      }
    );

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "TOURNAMENT_CANCEL_REFUND",
      resource: AuditResources.TOURNAMENT || "Tournament",
      resourceId: params.id,
      method: "POST",
      endpoint: `/api/admin/tournaments/${params.id}/cancel-refund`,
      status: "success",
      metadata: { refundCount },
    });

    return NextResponse.json({
      success: true,
      refundCount,
      message: `Tournament cancelled. ${refundCount} player(s) refunded.`,
    });
  } catch (error) {
    console.error("Cancel-refund error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
