import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Tournaments from '@/app/models/tournament.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

type LadderTier = 'rookie' | 'silver' | 'gold' | 'pro';

/**
 * Compare tiers (returns true if userTier >= requiredTier)
 */
function meetsTierRequirement(userTier: LadderTier | null, requiredTier: LadderTier | null): boolean {
  if (!requiredTier) return true; // No tier requirement

  if (!userTier) return false; // User has no tier

  const tierOrder: LadderTier[] = ['rookie', 'silver', 'gold', 'pro'];
  const userIndex = tierOrder.indexOf(userTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);

  return userIndex >= requiredIndex;
}

/**
 * GET /api/tournaments/schedule
 *
 * Get upcoming tournament schedule with eligibility
 * Public endpoint - authentication optional
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Check for session (optional)
      const session = await getServerSession(authOptions);

      // 2. Connect to database
      await connectToDB();

      // 3. Get user's tier if authenticated
      let userTier: LadderTier | null = null;
      if (session?.user?.id) {
        const user = await Users.findById(session.user.id);
        if (user) {
          userTier = user.ladder_tier || null;
        }
      }

      // 4. Fetch active tournaments (endTime > now, isActive=true)
      const now = new Date();
      const tournaments = await Tournaments.find({
        isActive: true,
        endTime: { $gt: now },
      })
        .sort({ startTime: 1 })
        .lean();

      // 5. Map to API format with eligibility
      const schedule = tournaments.map((tournament: any) => ({
        id: tournament._id.toString(),
        tier: tournament.tier || null,
        type: tournament.type,
        startDate: tournament.startTime.toISOString(),
        prizePool: tournament.prizePool,
        filledSpots: tournament.users?.length || 0,
        totalSpots: tournament.maxUsers,
        entryFee: tournament.buyInFee || 0, // buyInFee maps to entryFee
        isEligible: meetsTierRequirement(userTier, tournament.tier),
      }));

      return NextResponse.json(schedule, { status: 200 });
    } catch (error: any) {
      console.error('[Tournament Schedule API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get tournament schedule', message: error.message },
        { status: 500 }
      );
    }
  }
);
