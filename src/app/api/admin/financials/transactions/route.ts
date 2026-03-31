import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const typeMap: Record<string, string[]> = {
  entry_fee: ["entry_fee", "buy_in", "tournament_entry", "gth_entry"],
  prize: ["prize", "payout", "winnings"],
  deposit: ["deposit"],
  withdraw: ["withdraw", "withdrawal"],
  refund: ["refund"],
  adjustment: ["adjustment"],
};

const VALID_TYPES = new Set(Object.keys(typeMap));
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;

interface TransactionDoc {
  _id: ObjectId;
  type: string;
  amount: number;
  createdAt: Date;
  user: ObjectId;
  userInfo?: { username?: string; email?: string }[];
  [key: string]: unknown;
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

    const { searchParams } = req.nextUrl;

    const page = Math.max(parseInt(searchParams.get("page") ?? "", 10) || DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const type = searchParams.get("type") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const minAmount = searchParams.get("minAmount") ?? undefined;
    const maxAmount = searchParams.get("maxAmount") ?? undefined;
    const userSearch = searchParams.get("user") ?? undefined;

    const filter: Record<string, unknown> = {};

    // Type filter
    if (type) {
      if (VALID_TYPES.has(type)) {
        filter.type = { $in: typeMap[type] };
      } else {
        filter.type = { $in: [type] };
      }
    }

    // Date range filter
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) {
        dateFilter.$gte = new Date(from);
      }
      if (to) {
        dateFilter.$lte = new Date(to + "T23:59:59Z");
      }
      filter.createdAt = dateFilter;
    }

    // Amount filter
    if (minAmount || maxAmount) {
      const amountFilter: Record<string, number> = {};
      if (minAmount) {
        amountFilter.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        amountFilter.$lte = parseFloat(maxAmount);
      }
      filter.amount = amountFilter;
    }

    // User search filter
    if (userSearch) {
      const usersCollection = db.collection("users");
      const regex = new RegExp(userSearch, "i");
      const matchedUsers = await usersCollection
        .find(
          { $or: [{ username: regex }, { email: regex }] },
          { projection: { _id: 1 }, limit: 50 }
        )
        .toArray();

      if (matchedUsers.length === 0) {
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }

      filter.user = { $in: matchedUsers.map((u) => u._id) };
    }

    const txns = db.collection("transactions");

    // Get total count for pagination
    const total = await txns.countDocuments(filter);

    // Aggregation pipeline
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 as const } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          amount: 1,
          createdAt: 1,
          status: 1,
          source: 1,
          description: 1,
          metadata: 1,
          user: {
            _id: { $arrayElemAt: ["$userInfo._id", 0] },
            username: { $arrayElemAt: ["$userInfo.username", 0] },
            email: { $arrayElemAt: ["$userInfo.email", 0] },
          },
        },
      },
    ];

    const transactions = await txns
      .aggregate<TransactionDoc>(pipeline)
      .toArray();

    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Transaction browser error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
