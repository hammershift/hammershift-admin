import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { withTransaction, toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";
import { validateRequestBody, updateUserSchema } from "@/app/lib/validation";
import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import Transaction from "@/app/models/transaction.model";
import { Role } from "@/app/lib/interfaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const user_id = req.nextUrl.searchParams.get("user_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

    // Get a specific user by ID
    if (user_id) {
      if (!isValidObjectId(user_id)) {
        return NextResponse.json(
          { message: "Invalid user ID format" },
          { status: 400 }
        );
      }

      const user = await Users.findById(toObjectId(user_id)).select("-password");

      if (!user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(user, { status: 200 });
    }

    // Get all active users (not agents)
    const users = await Users.find({
      isActive: true,
      role: Role.USER,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Users.countDocuments({
      isActive: true,
      role: Role.USER,
    });

    return NextResponse.json(
      {
        total,
        users,
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

    const user_id = req.nextUrl.searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(user_id)) {
      return NextResponse.json(
        { message: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req.clone(), updateUserSchema);
    if ("error" in validation) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if user exists
    const existingUser = await Users.findById(toObjectId(user_id));
    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // If balance is being updated, use transaction
    const needsTransaction = updateData.balance !== undefined;

    if (needsTransaction && updateData.balance !== undefined) {
      const result = await withTransaction(async (session) => {
        const balanceDifference = updateData.balance - (existingUser.balance || 0);

        const updatedUser = await Users.findByIdAndUpdate(
          toObjectId(user_id),
          { $set: updateData },
          { new: true, session }
        ).select("-password");

        // Create transaction record for balance adjustment
        if (balanceDifference !== 0) {
          const transaction = new Transaction({
            userID: existingUser._id,
            transactionType: balanceDifference > 0 ? "deposit" : "withdraw",
            amount: Math.abs(balanceDifference),
            type: balanceDifference > 0 ? "+" : "-",
            status: "success",
            transactionDate: new Date(),
          });

          await transaction.save({ session });
        }

        return updatedUser;
      });

      return NextResponse.json(
        {
          message: "User updated successfully",
          user: result,
        },
        { status: 200 }
      );
    } else {
      // Simple update without transaction
      const updatedUser = await Users.findByIdAndUpdate(
        toObjectId(user_id),
        { $set: updateData },
        { new: true }
      ).select("-password");

      return NextResponse.json(
        {
          message: "User updated successfully",
          user: updatedUser,
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

export async function DELETE(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    await connectToDB();

    const user_id = req.nextUrl.searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(user_id)) {
      return NextResponse.json(
        { message: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await Users.findById(toObjectId(user_id));
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Delete the user
    await Users.deleteOne({ _id: toObjectId(user_id) });

    return NextResponse.json(
      { message: "User deleted successfully" },
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
