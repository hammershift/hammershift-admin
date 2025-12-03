import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, refundWagerSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import Users from "@/app/models/user.model";
import Transaction from "@/app/models/transaction.model";

export async function POST(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  // Validate request body
  const validation = await validateRequestBody(req.clone(), refundWagerSchema);
  if ("error" in validation) {
    return NextResponse.json(
      { message: validation.error },
      { status: 400 }
    );
  }

  const { wager_id } = validation.data;

  try {
    await connectToDB();

    // Execute refund within a transaction
    const result = await withTransaction(async (session) => {
      // Find and update wager
      const updatedWager = await Wagers.findOneAndUpdate(
        { _id: toObjectId(wager_id) },
        { $set: { deleteReason: "Admin Refund", refunded: true } },
        { new: true, session }
      );

      if (!updatedWager) {
        throw new Error("Wager not found");
      }

      // Check if already refunded
      if (updatedWager.refunded) {
        throw new Error("Wager has already been refunded");
      }

      // Find user
      const user = await Users.findById(updatedWager.user._id).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      // Calculate new balance
      const updatedBalance = (user.balance || 0) + updatedWager.wagerAmount;

      // Update user's balance
      await Users.findByIdAndUpdate(
        user._id,
        { $set: { balance: updatedBalance } },
        { session }
      );

      // Create refund transaction
      const transaction = new Transaction({
        userID: user._id,
        wagerID: updatedWager._id,
        auctionID: updatedWager.auctionID,
        transactionType: "refund",
        amount: updatedWager.wagerAmount,
        type: "+",
        status: "success",
        transactionDate: new Date(),
      });

      await transaction.save({ session });

      return {
        wager: updatedWager,
        newBalance: updatedBalance,
        transaction,
      };
    });

    return NextResponse.json(
      {
        message: "Refund processed successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}
