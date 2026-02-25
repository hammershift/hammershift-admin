import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import connectToDB from '@/app/lib/mongoose';

type LadderTier = 'rookie' | 'silver' | 'gold' | 'pro';

/**
 * Calculate tier from total points
 */
function calculateTier(points: number): LadderTier {
  if (points >= 750) return 'pro';
  if (points >= 300) return 'gold';
  if (points >= 100) return 'silver';
  return 'rookie';
}

/**
 * Get next tier threshold
 */
function getNextTierThreshold(tier: LadderTier): number {
  switch (tier) {
    case 'rookie':
      return 100; // silver
    case 'silver':
      return 300; // gold
    case 'gold':
      return 750; // pro
    case 'pro':
      return 750; // already max
  }
}

/**
 * GET /api/tournaments/ladder/me
 *
 * Get authenticated user's ladder position
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Connect to database
      await connectToDB();

      // 3. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 4. Calculate tier from points
      const points = user.total_points || 0;
      const tier = calculateTier(points);

      // 5. Update user's ladder_tier if changed
      if (user.ladder_tier !== tier) {
        user.ladder_tier = tier;
        await user.save();
      }

      // 6. Calculate rank within tier
      // Count users in same tier with higher points
      const higherRankedCount = await Users.countDocuments({
        ladder_tier: tier,
        total_points: { $gt: points },
      });
      const rank = higherRankedCount + 1;

      // 7. Get next tier threshold
      const nextTierThreshold = getNextTierThreshold(tier);

      // 8. Calculate qualification window (tournaments in last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const completedTournaments = await Predictions.distinct('tournament_id', {
        'user.userId': user._id,
        createdAt: { $gte: fourteenDaysAgo },
        tournament_id: { $ne: null },
      });

      return NextResponse.json(
        {
          tier,
          points,
          rank,
          nextTierThreshold,
          qualificationWindow: {
            required: 2, // Hardcoded for now
            completed: completedTournaments.length,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Ladder Me API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get ladder position', message: error.message },
        { status: 500 }
      );
    }
  }
);
