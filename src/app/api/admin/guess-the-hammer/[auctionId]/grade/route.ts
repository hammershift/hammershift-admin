import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { auctionId: string } }
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
    const objId = new mongoose.Types.ObjectId(params.auctionId);
    const body = (await req.json()) as { finalPrice?: number };

    const auction = await db.collection("auctions").findOne({ _id: objId });
    if (!auction) {
      return NextResponse.json(
        { error: "Auction not found" },
        { status: 404 }
      );
    }

    const finalPrice =
      body.finalPrice ||
      auction.finalPrice ||
      auction.sold_price ||
      auction.hammer_price ||
      auction.currentBid ||
      auction.price ||
      null;

    if (!finalPrice || finalPrice <= 0) {
      return NextResponse.json(
        {
          error:
            "No final price available. Provide finalPrice in body or ensure auction has been closed with a sold price.",
        },
        { status: 400 }
      );
    }

    const entries = await db
      .collection("guesstehammers")
      .find({ auction: objId, status: "pending" })
      .toArray();

    if (entries.length === 0) {
      return NextResponse.json({
        message: "No pending entries to grade",
        gradedCount: 0,
      });
    }

    // Grade using Price is Right rules
    interface GradedEntry {
      _id: mongoose.Types.ObjectId;
      user: mongoose.Types.ObjectId;
      guessedPrice: number;
      isVirtual: boolean;
      entryFee: number;
      actualPrice: number;
      absoluteError: number;
      penalizedError: number;
      rank: number;
    }

    const graded: GradedEntry[] = entries.map((entry) => {
      const absoluteError = Math.abs(entry.guessedPrice - finalPrice);
      const penalizedError =
        entry.guessedPrice > finalPrice
          ? absoluteError * 2
          : absoluteError;
      return {
        _id: entry._id,
        user: entry.user,
        guessedPrice: entry.guessedPrice,
        isVirtual: entry.isVirtual,
        entryFee: entry.entryFee,
        actualPrice: finalPrice,
        absoluteError,
        penalizedError,
        rank: 0,
      };
    });

    graded.sort((a, b) => a.penalizedError - b.penalizedError);
    graded.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    const realEntries = graded.filter((e) => !e.isVirtual);
    const totalFees = realEntries.reduce((s, e) => s + (e.entryFee || 0), 0);
    const prizePool = totalFees * 0.9;
    const distribution = [0.5, 0.3, 0.2];

    // Update all entries
    for (const entry of graded) {
      const realIndex = realEntries.findIndex((e) =>
        e._id.equals(entry._id)
      );
      const prizePaid =
        realIndex >= 0 && realIndex < 3 && prizePool > 0
          ? prizePool * distribution[realIndex]
          : 0;

      await db.collection("guesstehammers").updateOne(
        { _id: entry._id },
        {
          $set: {
            actualPrice: finalPrice,
            absoluteError: entry.absoluteError,
            penalizedError: entry.penalizedError,
            rank: entry.rank,
            prizePaid,
            status: prizePaid > 0 ? "paid" : "graded",
            updatedAt: new Date(),
          },
        }
      );

      // Credit prize winners
      if (prizePaid > 0) {
        await db.collection("wallets").updateOne(
          { user: entry.user },
          { $inc: { balance: prizePaid } },
          { upsert: true }
        );
        await db.collection("transactions").insertOne({
          user: entry.user,
          amount: prizePaid,
          type: "prize",
          source: "gth",
          description: `Guess the Hammer prize — rank #${entry.rank} (manual grade)`,
          reference: objId,
          referenceModel: "Auction",
          status: "completed",
          createdAt: new Date(),
        });
      }
    }

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "GTH_GRADE",
      resource: AuditResources.AUCTION || "Auction",
      resourceId: params.auctionId,
      method: "POST",
      endpoint: `/api/admin/guess-the-hammer/${params.auctionId}/grade`,
      status: "success",
      changes: {
        after: {
          finalPrice,
          gradedCount: entries.length,
          prizePool,
        },
      },
    });

    return NextResponse.json({
      success: true,
      gradedCount: entries.length,
      prizePool,
      rake: totalFees * 0.1,
      finalPrice,
      message: `Graded ${entries.length} entries. Prize pool $${prizePool.toFixed(2)} distributed.`,
    });
  } catch (error) {
    console.error("GTH grade error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
