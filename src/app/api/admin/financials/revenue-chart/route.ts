import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

interface ChartPoint {
  date: string;
  tournament: number;
  gth: number;
  deposits: number;
  refunds: number;
}

interface PayoutPoint {
  date: string;
  prizes: number;
  withdrawals: number;
  refunds: number;
}

interface RevenueAggRow {
  _id: { day: string; type: string; source: string | null };
  total: number;
}

interface PayoutAggRow {
  _id: { day: string; type: string };
  total: number;
}

const VALID_RANGES: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

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

    const rangeParam =
      req.nextUrl.searchParams.get("range") ?? "30d";
    const days = VALID_RANGES[rangeParam] ?? 30;

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);

    const [revenueRows, payoutRows] = await Promise.all([
      // Revenue by day
      txns
        .aggregate<RevenueAggRow>([
          {
            $match: {
              type: {
                $in: [
                  "entry_fee",
                  "buy_in",
                  "tournament_entry",
                  "gth_entry",
                  "deposit",
                ],
              },
              createdAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                type: "$type",
                source: { $ifNull: ["$source", null] },
              },
              total: { $sum: "$amount" },
            },
          },
        ])
        .toArray(),

      // Payouts by day
      txns
        .aggregate<PayoutAggRow>([
          {
            $match: {
              type: {
                $in: [
                  "prize",
                  "payout",
                  "winnings",
                  "withdraw",
                  "withdrawal",
                  "refund",
                ],
              },
              createdAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                type: "$type",
              },
              total: { $sum: "$amount" },
            },
          },
        ])
        .toArray(),
    ]);

    // Build date-keyed maps with all days initialized to zero
    const revenueMap = new Map<
      string,
      { tournament: number; gth: number; deposits: number; refunds: number }
    >();
    const payoutMap = new Map<
      string,
      { prizes: number; withdrawals: number; refunds: number }
    >();

    const dateKeys: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateKeys.push(key);
      revenueMap.set(key, { tournament: 0, gth: 0, deposits: 0, refunds: 0 });
      payoutMap.set(key, { prizes: 0, withdrawals: 0, refunds: 0 });
    }

    // Populate revenue map
    for (const row of revenueRows) {
      const entry = revenueMap.get(row._id.day);
      if (!entry) continue;

      const { type, source } = row._id;
      if (type === "deposit") {
        entry.deposits += row.total;
      } else if (
        source === "gth" ||
        source === "guess_the_hammer" ||
        type === "gth_entry"
      ) {
        entry.gth += row.total;
      } else {
        entry.tournament += row.total;
      }
    }

    // Populate payout map (and revenue refunds)
    for (const row of payoutRows) {
      const payoutEntry = payoutMap.get(row._id.day);
      if (!payoutEntry) continue;

      const { type } = row._id;
      if (type === "prize" || type === "payout" || type === "winnings") {
        payoutEntry.prizes += row.total;
      } else if (type === "withdraw" || type === "withdrawal") {
        payoutEntry.withdrawals += row.total;
      } else if (type === "refund") {
        payoutEntry.refunds += row.total;
        // Also add to revenue refunds
        const revEntry = revenueMap.get(row._id.day);
        if (revEntry) {
          revEntry.refunds += row.total;
        }
      }
    }

    // Format date labels
    const useShortFormat = days <= 7;

    const formatLabel = (dateStr: string): string => {
      const d = new Date(dateStr + "T00:00:00Z");
      if (useShortFormat) {
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
      }
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    };

    const revenue: ChartPoint[] = dateKeys.map((key) => {
      const v = revenueMap.get(key)!;
      return {
        date: formatLabel(key),
        tournament: v.tournament,
        gth: v.gth,
        deposits: v.deposits,
        refunds: v.refunds,
      };
    });

    const payouts: PayoutPoint[] = dateKeys.map((key) => {
      const v = payoutMap.get(key)!;
      return {
        date: formatLabel(key),
        prizes: v.prizes,
        withdrawals: v.withdrawals,
        refunds: v.refunds,
      };
    });

    return NextResponse.json({ revenue, payouts });
  } catch (error) {
    console.error("Revenue chart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
