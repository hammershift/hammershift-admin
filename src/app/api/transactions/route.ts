import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { toObjectId } from "@/app/lib/dbHelpers";
import connectToDB from "@/app/lib/mongoose";
import Transaction from "@/app/models/transaction.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const transaction_id = req.nextUrl.searchParams.get("transaction_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

    // Fetch a single withdraw transaction by transaction_id
    if (transaction_id) {
      if (!transaction_id.match(/^[0-9a-fA-F]{24}$/)) {
        return NextResponse.json(
          { message: "Invalid transaction ID format" },
          { status: 400 }
        );
      }

      const transaction = await Transaction.findOne({
        _id: toObjectId(transaction_id),
        transactionType: "withdraw",
      });

      if (!transaction) {
        return NextResponse.json(
          { message: "Transaction not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(transaction);
    }

    // Fetch all withdraw transactions
    const transactions = await Transaction.find({ transactionType: "withdraw" })
      .sort({ transactionDate: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Transaction.countDocuments({ transactionType: "withdraw" });

    return NextResponse.json({
      transactions,
      total,
      offset,
      limit
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
