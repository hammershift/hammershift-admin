import { NextRequest, NextResponse } from "next/server";
import { getUserBadges } from "@/app/lib/badgeChecker";
import connectToDB from "@/app/lib/mongoose";
import { Types } from "mongoose";

/**
 * GET /api/users/[userId]/badges
 *
 * Returns all badges earned by a user.
 * Public endpoint - no authentication required.
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

    // Get user badges
    const badges = await getUserBadges(userId);

    return NextResponse.json({
      user_id: userId,
      badges,
      total_badges: badges.length,
    });
  } catch (error: any) {
    console.error("Get user badges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user badges", details: error.message },
      { status: 500 }
    );
  }
}
