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

    const auditEntries = await db
      .collection("auditlogs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const recentTransactions = await db
      .collection("transactions")
      .find({
        type: {
          $in: ["entry_fee", "prize", "withdraw", "deposit", "refund"],
        },
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .project({
        type: 1,
        amount: 1,
        user: 1,
        description: 1,
        createdAt: 1,
        status: 1,
      })
      .toArray();

    const combined = [
      ...auditEntries.map((e) => ({ source: "audit" as const, ...e })),
      ...recentTransactions.map((t) => ({
        source: "transaction" as const,
        ...t,
      })),
    ]
      .sort((a, b) => {
        const aTime = new Date((a as Record<string, unknown>).createdAt as string).getTime();
        const bTime = new Date((b as Record<string, unknown>).createdAt as string).getTime();
        return bTime - aTime;
      })
      .slice(0, 20);

    return NextResponse.json({ activity: combined });
  } catch (error) {
    console.error("Dashboard activity error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
