import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function GET(
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

    const [auction, guesses] = await Promise.all([
      db.collection("auctions").findOne({ _id: objId }),
      db
        .collection("guesstehammers")
        .aggregate([
          { $match: { auction: objId } },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: 1,
              guessedPrice: 1,
              actualPrice: 1,
              absoluteError: 1,
              penalizedError: 1,
              rank: 1,
              entryFee: 1,
              prizePaid: 1,
              isVirtual: 1,
              status: 1,
              createdAt: 1,
              userId: "$user",
              username: {
                $ifNull: [
                  "$userDoc.username",
                  "$userDoc.email",
                  "Unknown",
                ],
              },
              userEmail: "$userDoc.email",
            },
          },
          { $sort: { rank: 1, createdAt: 1 } },
        ])
        .toArray(),
    ]);

    const realGuesses = guesses.filter(
      (g: Record<string, unknown>) => !g.isVirtual
    );
    const totalEntryFees = realGuesses.reduce(
      (s: number, g: Record<string, unknown>) =>
        s + ((g.entryFee as number) || 0),
      0
    );
    const prizePool = totalEntryFees * 0.9;
    const rake = totalEntryFees * 0.1;

    return NextResponse.json({
      auctionId: params.auctionId,
      auction,
      guesses,
      stats: {
        totalGuesses: guesses.length,
        realMoneyGuesses: realGuesses.length,
        freeGuesses: guesses.length - realGuesses.length,
        totalEntryFees,
        prizePool,
        rake,
        isGraded: guesses.some(
          (g: Record<string, unknown>) => g.status !== "pending"
        ),
      },
    });
  } catch (error) {
    console.error("GTH detail error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = (await req.json()) as {
      entryId: string;
      rank?: number;
      prizePaid?: number;
      reason: string;
    };

    if (!body.entryId || !body.reason) {
      return NextResponse.json(
        { error: "entryId and reason are required" },
        { status: 400 }
      );
    }

    const entryObjId = new mongoose.Types.ObjectId(body.entryId);
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.rank !== undefined) update.rank = body.rank;
    if (body.prizePaid !== undefined) {
      const existing = await db
        .collection("guesstehammers")
        .findOne({ _id: entryObjId });
      if (existing && body.prizePaid !== existing.prizePaid) {
        const delta = body.prizePaid - (existing.prizePaid || 0);
        await db.collection("wallets").updateOne(
          { user: existing.user },
          { $inc: { balance: delta } },
          { upsert: true }
        );
        await db.collection("transactions").insertOne({
          user: existing.user,
          amount: Math.abs(delta),
          type: "adjustment",
          source: "gth",
          description: `Admin prize override: ${body.reason}`,
          reference: existing.auction,
          referenceModel: "Auction",
          status: "completed",
          createdAt: new Date(),
        });
      }
      update.prizePaid = body.prizePaid;
      update.status = body.prizePaid > 0 ? "paid" : "graded";
    }

    await db
      .collection("guesstehammers")
      .updateOne({ _id: entryObjId }, { $set: update });

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "GTH_OVERRIDE",
      resource: AuditResources.AUCTION || "Auction",
      resourceId: params.auctionId,
      method: "PATCH",
      endpoint: `/api/admin/guess-the-hammer/${params.auctionId}`,
      status: "success",
      changes: {
        after: { entryId: body.entryId, reason: body.reason, rank: body.rank, prizePaid: body.prizePaid },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GTH override error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
