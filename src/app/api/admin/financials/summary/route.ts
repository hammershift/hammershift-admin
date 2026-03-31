import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

interface AggregationResult {
  _id: null;
  total: number;
}

interface PendingWithdrawalResult {
  _id: null;
  count: number;
  total: number;
}

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
    const txns = db.collection("transactions");

    const [
      entryFeesAgg,
      payoutsAgg,
      depositsAgg,
      refundsAgg,
      pendingWithdrawalsAgg,
      tournamentRevenueAgg,
      gthRevenueAgg,
    ] = await Promise.all([
      // 1. Total entry fees
      txns
        .aggregate<AggregationResult>([
          {
            $match: {
              type: {
                $in: ["entry_fee", "buy_in", "tournament_entry", "gth_entry"],
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),

      // 2. Total prize payouts
      txns
        .aggregate<AggregationResult>([
          {
            $match: {
              type: { $in: ["prize", "payout", "winnings"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),

      // 3. Total deposits
      txns
        .aggregate<AggregationResult>([
          { $match: { type: "deposit" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),

      // 4. Total refunds
      txns
        .aggregate<AggregationResult>([
          { $match: { type: "refund" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),

      // 5. Pending withdrawals (count + amount)
      txns
        .aggregate<PendingWithdrawalResult>([
          {
            $match: {
              type: { $in: ["withdraw", "withdrawal"] },
              status: { $in: ["pending", "requested"] },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              total: { $sum: "$amount" },
            },
          },
        ])
        .toArray(),

      // 6. Tournament-specific revenue
      txns
        .aggregate<AggregationResult>([
          {
            $match: {
              type: { $in: ["entry_fee", "buy_in", "tournament_entry"] },
              source: "tournament",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),

      // 7. GTH-specific revenue
      txns
        .aggregate<AggregationResult>([
          {
            $match: {
              source: { $in: ["gth", "guess_the_hammer"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
    ]);

    const totalRevenue = entryFeesAgg[0]?.total ?? 0;
    const totalPayouts = payoutsAgg[0]?.total ?? 0;
    const depositsTotal = depositsAgg[0]?.total ?? 0;
    const refundsTotal = refundsAgg[0]?.total ?? 0;
    const tournamentRevenue = tournamentRevenueAgg[0]?.total ?? 0;
    const gthRevenue = gthRevenueAgg[0]?.total ?? 0;

    const totalRake = totalRevenue * 0.1;
    const netRevenue = totalRake - refundsTotal;

    return NextResponse.json({
      totalRevenue,
      totalRake,
      totalPayouts,
      netRevenue,
      depositsTotal,
      refundsTotal,
      pendingWithdrawals: {
        count: pendingWithdrawalsAgg[0]?.count ?? 0,
        amount: pendingWithdrawalsAgg[0]?.total ?? 0,
      },
      breakdown: {
        tournamentRevenue,
        gthRevenue,
        tournamentRake: tournamentRevenue * 0.1,
        gthRake: gthRevenue * 0.1,
      },
    });
  } catch (error) {
    console.error("Financial summary error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
