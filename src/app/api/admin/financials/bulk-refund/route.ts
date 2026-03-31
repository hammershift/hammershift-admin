import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import {
  createAuditLog,
  AuditActions,
  AuditResources,
} from "@/app/lib/auditLogger";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

interface BulkRefundBody {
  source: "tournament" | "gth";
  referenceId: string;
  reason: string;
}

interface EntryTransaction {
  _id: ObjectId;
  user: ObjectId;
  amount: number;
  type: string;
  status: string;
  refunded?: boolean;
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as Partial<BulkRefundBody>;

    // Validate required fields
    if (!body.source || !body.referenceId || !body.reason) {
      return NextResponse.json(
        { message: "Missing required fields: source, referenceId, reason" },
        { status: 400 }
      );
    }

    if (!["tournament", "gth"].includes(body.source)) {
      return NextResponse.json(
        { message: "source must be 'tournament' or 'gth'" },
        { status: 400 }
      );
    }

    const refObjId = new ObjectId(body.referenceId);
    const referenceModel =
      body.source === "tournament" ? "Tournament" : "Auction";

    // Find all completed, non-refunded entry transactions for the reference
    const entryTx = await db
      .collection<EntryTransaction>("transactions")
      .find({
        reference: refObjId,
        referenceModel,
        type: {
          $in: ["entry_fee", "buy_in", "tournament_entry", "gth_entry"],
        },
        status: "completed",
        refunded: { $ne: true },
      })
      .toArray();

    if (entryTx.length === 0) {
      return NextResponse.json({
        message: "No eligible entry transactions found",
        refundCount: 0,
      });
    }

    let totalAmount = 0;

    // Process each refund individually (no bulkWrite due to TS typing issues)
    for (const tx of entryTx) {
      totalAmount += tx.amount;

      // Credit wallet
      await db
        .collection("wallets")
        .updateOne(
          { user: tx.user },
          { $inc: { balance: tx.amount } },
          { upsert: true }
        );

      // Insert refund transaction
      await db.collection("transactions").insertOne({
        user: tx.user,
        amount: tx.amount,
        type: "refund",
        source: body.source,
        description: `Admin bulk refund: ${body.reason}`,
        reference: refObjId,
        referenceModel,
        status: "completed",
        originalTxId: tx._id,
        createdAt: new Date(),
      });

      // Mark original as refunded
      await db
        .collection("transactions")
        .updateOne(
          { _id: tx._id },
          { $set: { refunded: true, refundedAt: new Date() } }
        );
    }

    // Write audit log
    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: AuditActions.WAGER_REFUND,
      resource: AuditResources.TRANSACTION,
      resourceId: body.referenceId,
      method: "POST",
      endpoint: "/api/admin/financials/bulk-refund",
      status: "success",
      changes: {
        after: {
          source: body.source,
          refundCount: entryTx.length,
          totalAmount,
          reason: body.reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      refundCount: entryTx.length,
      totalAmount,
      message: `Refunded ${entryTx.length} entries totaling $${totalAmount.toFixed(2)}.`,
    });
  } catch (error) {
    console.error("Bulk refund error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
