import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, updateWagerSchema, objectIdSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import Users from "@/app/models/user.model";
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

    const wager_id = req.nextUrl.searchParams.get("wager_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
    const date = req.nextUrl.searchParams.get("date");

    // Get wagers by date
    if (date) {
      const startDate = new Date(date);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { message: "Invalid date format" },
          { status: 400 }
        );
      }

      const wagers = await Wagers.find({
        createdAt: { $gte: startDate },
      }).sort({ createdAt: -1 });

      return NextResponse.json(
        {
          total: wagers.length,
          wagers,
        },
        { status: 200 }
      );
    }

    // Get a specific wager by ID
    if (wager_id) {
      if (!isValidObjectId(wager_id)) {
        return NextResponse.json(
          { message: "Invalid wager ID format" },
          { status: 400 }
        );
      }

      const wager = await Wagers.findById(toObjectId(wager_id));

      if (!wager) {
        return NextResponse.json(
          { message: "Wager not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(wager, { status: 200 });
    }

    // Get all active wagers with pagination
    const wagers = await Wagers.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Wagers.countDocuments({ isActive: true });

    return NextResponse.json(
      {
        total,
        wagers,
        offset,
        limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: 500 }
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

    const wager_id = req.nextUrl.searchParams.get("wager_id");

    if (!wager_id) {
      return NextResponse.json(
        { message: "Wager ID is required" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(wager_id)) {
      return NextResponse.json(
        { message: "Invalid wager ID format" },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req.clone(), updateWagerSchema);
    if ("error" in validation) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if wager exists
    const existingWager = await Wagers.findById(toObjectId(wager_id));
    if (!existingWager) {
      return NextResponse.json(
        { message: "Wager not found" },
        { status: 404 }
      );
    }

    // If the wager amount or status is being changed, this requires a transaction
    const needsTransaction = updateData.wagerAmount !== undefined ||
                            (updateData.isActive === false && existingWager.isActive);

    if (needsTransaction) {
      // Use transaction for financial operations
      const result = await withTransaction(async (session) => {
        const updatedWager = await Wagers.findByIdAndUpdate(
          toObjectId(wager_id),
          { $set: updateData },
          { new: true, session }
        );

        // If wager is being deactivated and user needs refund
        if (updateData.isActive === false && existingWager.isActive && existingWager.wagerAmount > 0) {
          const user = await Users.findById(existingWager.user._id).session(session);

          if (user) {
            const newBalance = (user.balance || 0) + existingWager.wagerAmount;

            await Users.findByIdAndUpdate(
              user._id,
              { $set: { balance: newBalance } },
              { session }
            );

            // Create refund transaction
            const transaction = new Transaction({
              userID: user._id,
              wagerID: existingWager._id,
              auctionID: existingWager.auctionID,
              transactionType: "refund",
              amount: existingWager.wagerAmount,
              type: "+",
              status: "success",
              transactionDate: new Date(),
            });

            await transaction.save({ session });
          }
        }

        return updatedWager;
      });

      return NextResponse.json(
        {
          message: "Wager updated successfully",
          wager: result,
        },
        { status: 200 }
      );
    } else {
      // Simple update without transaction
      const updatedWager = await Wagers.findByIdAndUpdate(
        toObjectId(wager_id),
        { $set: updateData },
        { new: true }
      );

      return NextResponse.json(
        {
          message: "Wager updated successfully",
          wager: updatedWager,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: error.message ? 400 : 500 }
    );
  }
}
