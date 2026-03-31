import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import {
  createAuditLog,
  AuditActions,
  AuditResources,
} from "@/app/lib/auditLogger";

export const dynamic = "force-dynamic";

interface WalletResponse {
  userId: string;
  username: string;
  email: string;
  balance: number;
  walletId: string;
  totalDeposited: number;
  totalWithdrawn: number;
  totalPrizes: number;
  lastActivity: string | null;
}

interface TransactionTotals {
  _id: string;
  totalDeposited: number;
  totalWithdrawn: number;
  totalPrizes: number;
  lastActivity: Date | null;
}

interface UserDoc {
  _id: mongoose.Types.ObjectId;
  username?: string;
  email?: string;
}

interface WalletDoc {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  balance: number;
}

interface TransactionDoc {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  type: string;
  source?: string;
  description?: string;
  status: string;
  isCredit?: boolean;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const userId = searchParams.get("userId");
  const history = searchParams.get("history");

  if (!search && !userId) {
    return NextResponse.json(
      { message: "Missing required query parameter: search or userId" },
      { status: 400 }
    );
  }

  try {
    await connectToDB();
    const db = mongoose.connection.db!;

    // Mode 2: Transaction history for a specific user
    if (userId && history === "1") {
      const transactions = await db
        .collection("transactions")
        .find({ user: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      return NextResponse.json({ transactions });
    }

    // Mode 1: Search users by username/email
    if (search) {
      const regex = new RegExp(search, "i");
      const users = await db
        .collection<UserDoc>("users")
        .find({
          $or: [{ username: regex }, { email: regex }],
        })
        .limit(20)
        .toArray();

      if (users.length === 0) {
        return NextResponse.json({ wallets: [] });
      }

      const userIds = users.map((u) => u._id);

      // Fetch wallets and transaction aggregates in parallel
      const [wallets, txnTotals] = await Promise.all([
        db
          .collection<WalletDoc>("wallets")
          .find({ user: { $in: userIds } })
          .toArray(),

        db
          .collection("transactions")
          .aggregate<TransactionTotals>([
            { $match: { user: { $in: userIds } } },
            {
              $group: {
                _id: "$user",
                totalDeposited: {
                  $sum: {
                    $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0],
                  },
                },
                totalWithdrawn: {
                  $sum: {
                    $cond: [
                      {
                        $in: ["$type", ["withdraw", "withdrawal"]],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalPrizes: {
                  $sum: {
                    $cond: [
                      { $in: ["$type", ["prize", "payout", "winnings"]] },
                      "$amount",
                      0,
                    ],
                  },
                },
                lastActivity: { $max: "$createdAt" },
              },
            },
          ])
          .toArray(),
      ]);

      // Build lookup maps
      const walletMap = new Map<string, WalletDoc>();
      for (const w of wallets) {
        walletMap.set(w.user.toString(), w);
      }

      const txnMap = new Map<string, TransactionTotals>();
      for (const t of txnTotals) {
        txnMap.set(t._id.toString(), t);
      }

      const result: WalletResponse[] = users.map((user) => {
        const uid = user._id.toString();
        const wallet = walletMap.get(uid);
        const totals = txnMap.get(uid);

        return {
          userId: uid,
          username: user.username ?? "",
          email: user.email ?? "",
          balance: wallet?.balance ?? 0,
          walletId: wallet?._id.toString() ?? "",
          totalDeposited: totals?.totalDeposited ?? 0,
          totalWithdrawn: totals?.totalWithdrawn ?? 0,
          totalPrizes: totals?.totalPrizes ?? 0,
          lastActivity: totals?.lastActivity
            ? totals.lastActivity.toISOString()
            : null,
        };
      });

      return NextResponse.json({ wallets: result });
    }

    // Fallback (shouldn't reach here due to early check)
    return NextResponse.json(
      { message: "Missing required query parameter: search or userId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Wallet browser error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

interface PatchBody {
  userId: string;
  amount: number;
  reason: string;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as PatchBody;

    if (!body.userId || body.amount === undefined || !body.reason) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: userId, amount, and reason are all required",
        },
        { status: 400 }
      );
    }

    if (typeof body.amount !== "number" || body.amount === 0) {
      return NextResponse.json(
        { message: "Amount must be a non-zero number" },
        { status: 400 }
      );
    }

    if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
      return NextResponse.json(
        { message: "Reason is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    await connectToDB();
    const db = mongoose.connection.db!;
    const walletsCollection = db.collection("wallets");

    // Get current wallet
    const wallet = await walletsCollection.findOne({
      user: new mongoose.Types.ObjectId(body.userId),
    });

    if (!wallet) {
      return NextResponse.json(
        { message: "Wallet not found for this user" },
        { status: 404 }
      );
    }

    const currentBalance = wallet.balance as number;
    const newBalance = currentBalance + body.amount;

    // Prevent negative balance
    if (newBalance < 0) {
      return NextResponse.json(
        {
          message: `Adjustment would result in negative balance. Current: ${currentBalance}, adjustment: ${body.amount}`,
        },
        { status: 400 }
      );
    }

    // Update wallet balance
    await walletsCollection.updateOne(
      { user: new mongoose.Types.ObjectId(body.userId) },
      { $inc: { balance: body.amount } }
    );

    // Insert adjustment transaction
    await db.collection("transactions").insertOne({
      user: new mongoose.Types.ObjectId(body.userId),
      amount: Math.abs(body.amount),
      type: "adjustment",
      source: "admin",
      description: body.reason.trim(),
      status: "completed",
      isCredit: body.amount > 0,
      createdAt: new Date(),
    });

    // Write audit log
    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: AuditActions.USER_BALANCE_UPDATE,
      resource: AuditResources.USER,
      resourceId: body.userId,
      method: "PATCH",
      endpoint: "/api/admin/financials/wallets",
      status: "success",
      changes: {
        before: { balance: currentBalance },
        after: {
          balance: currentBalance + body.amount,
          adjustment: body.amount,
          reason: body.reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: currentBalance + body.amount,
    });
  } catch (error) {
    console.error("Wallet adjustment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
