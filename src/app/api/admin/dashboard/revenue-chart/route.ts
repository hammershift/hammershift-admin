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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueByDay = await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            type: { $in: ["entry_fee", "rake", "platform_fee"] },
          },
        },
        {
          $group: {
            _id: {
              day: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              source: "$source",
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.day": 1 } },
      ])
      .toArray();

    const chartMap: Record<string, { tournament: number; gth: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chartMap[key] = { tournament: 0, gth: 0 };
    }

    for (const row of revenueByDay) {
      const day = row._id.day;
      const source = row._id.source;
      if (chartMap[day]) {
        if (source === "tournament") chartMap[day].tournament += row.total;
        else if (source === "gth" || source === "guess_the_hammer")
          chartMap[day].gth += row.total;
      }
    }

    const chartData = Object.entries(chartMap).map(([date, values]) => ({
      date,
      ...values,
    }));

    return NextResponse.json({ chartData });
  } catch (error) {
    console.error("Revenue chart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
