import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, approveWithdrawSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Transaction from "@/app/models/transaction.model";
import Users from "@/app/models/user.model";

export async function POST(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  // Validate request body
  const validation = await validateRequestBody(req.clone(), approveWithdrawSchema);
  if ("error" in validation) {
    return NextResponse.json(
      { message: validation.error },
      { status: 400 }
    );
  }

  const { transactionId } = validation.data;

  try {
    await connectToDB();

    // Execute withdrawal approval within a transaction
    const result = await withTransaction(async (session) => {
      // Find transaction
      const transaction = await Transaction.findById(toObjectId(transactionId)).session(session);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Check transaction type
      if (transaction.transactionType !== "withdraw") {
        throw new Error("Transaction is not a withdrawal request");
      }

      // Check if already processed
      if (transaction.status === "success") {
        throw new Error("Transaction has already been approved");
      }

      // Find user
      const user = await Users.findById(transaction.userID).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      // Check for sufficient balance
      if (user.balance < transaction.amount) {
        throw new Error(`Insufficient balance. User has ${user.balance} but requested ${transaction.amount}`);
      }

      // Deduct amount from wallet
      const newBalance = user.balance - transaction.amount;
      await Users.findByIdAndUpdate(
        user._id,
        { $set: { balance: newBalance } },
        { session }
      );

      // Update transaction status
      await Transaction.findByIdAndUpdate(
        transaction._id,
        { $set: { status: "success" } },
        { session }
      );

      return {
        transaction,
        newBalance,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal approved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error approving transaction:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const { transactionId, transactionNote } = await req.json();

    if (!transactionId || !transactionId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { message: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const transaction = await Transaction.findById(toObjectId(transactionId));
    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Update transaction status and add note
    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: { status: "success", note: transactionNote || "" },
    });

    return NextResponse.json({
      success: true,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
