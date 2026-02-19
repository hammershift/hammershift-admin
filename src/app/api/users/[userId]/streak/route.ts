import { NextRequest, NextResponse } from "next/server";
import { getStreak } from "@/app/lib/streakManager";
import connectToDB from "@/app/lib/mongoose";
import { Types } from "mongoose";

/**
 * GET /api/users/[userId]/streak
 *
 * Returns current streak status for a user.
 * Includes at_risk flag to indicate if streak is in danger.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectToDB();

    const { userId } = params;

    // Validate userId format
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Get streak status
    const streakStatus = await getStreak(userId);

    return NextResponse.json({
      user_id: userId,
      ...streakStatus,
    });
  } catch (error: any) {
    console.error("Get user streak error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user streak", details: error.message },
      { status: 500 }
    );
  }
}
