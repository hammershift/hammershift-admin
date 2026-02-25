import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import UserEvents from '@/app/models/userEvent.model';
import Tournaments from '@/app/models/tournament.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * Calculate period date range
 */
function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    default:
      throw new Error('Invalid period');
  }
  return now;
}

/**
 * GET /api/analytics/funnel
 *
 * Admin-only analytics for conversion funnel
 *
 * @param period - Time period for analysis (7d, 30d, 90d)
 * @returns Funnel metrics including:
 *   - signupToFirstPick: Percentage of users who made their first pick
 *   - pickToDeposit: Percentage of users with picks who deposited
 *   - weeklyActiveUsers: Count of active users in last 7 days
 *   - entriesPerUserPerWeek: Average tournament entries per user per week
 *   - depositConversionByRail: Deposit success rate by payment method (ACH/card)
 *   - tournamentFillRate: Average tournament fill percentage
 *   - tierChurnRate: Churn rate by tier (stubbed for now)
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

      // 2. Check admin role - strict ADMIN check as per requirements
      const isAdmin = session.user.role === 'ADMIN';
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // 3. Get period parameter
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '7d';

      if (!['7d', '30d', '90d'].includes(period)) {
        return NextResponse.json(
          { error: 'Invalid period. Must be 7d, 30d, or 90d' },
          { status: 400 }
        );
      }

      // 4. Connect to database
      await connectToDB();

      // 5. Calculate period start date
      const startDate = getPeriodDate(period);

      // 6. Calculate signupToFirstPick
      // Users who signed up during the period
      const newUsers = await Users.countDocuments({
        createdAt: { $gte: startDate },
      });

      // Users who made predictions during the period
      const usersWithPicks = await Predictions.distinct('user.userId', {
        createdAt: { $gte: startDate },
      });

      const signupToFirstPick = newUsers > 0 ? (usersWithPicks.length / newUsers) * 100 : 0;

      // 7. Calculate pickToDeposit
      // Users who deposited during the period
      const usersWithDeposits = await WalletTransactions.distinct('user_id', {
        type: 'deposit',
        created_at: { $gte: startDate },
      });

      const pickToDeposit = usersWithPicks.length > 0
        ? (usersWithDeposits.length / usersWithPicks.length) * 100
        : 0;

      // 8. Calculate WAU (Weekly Active Users - last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyActiveUsers = await UserEvents.distinct('user_id', {
        created_at: { $gte: sevenDaysAgo },
      });

      // 9. Calculate entriesPerUserPerWeek
      // Count tournament joins in the last 7 days
      const tournamentJoins = await UserEvents.countDocuments({
        event_type: 'tournament_joined',
        created_at: { $gte: sevenDaysAgo },
      });

      // Distinct users who joined tournaments in the last 7 days
      const usersWhoJoinedTournaments = await UserEvents.distinct('user_id', {
        event_type: 'tournament_joined',
        created_at: { $gte: sevenDaysAgo },
      });

      const entriesPerUserPerWeek = usersWhoJoinedTournaments.length > 0
        ? tournamentJoins / usersWhoJoinedTournaments.length
        : 0;

      // 10. Calculate deposit conversion by rail
      // ACH deposits
      const achStartedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_started',
        'event_data.method': 'ach',
        created_at: { $gte: startDate },
      });

      const achCompletedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_completed',
        'event_data.method': 'ach',
        created_at: { $gte: startDate },
      });

      // Card deposits
      const cardStartedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_started',
        'event_data.method': 'card',
        created_at: { $gte: startDate },
      });

      const cardCompletedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_completed',
        'event_data.method': 'card',
        created_at: { $gte: startDate },
      });

      const depositConversionByRail = {
        ach: achStartedEvents > 0 ? (achCompletedEvents / achStartedEvents) * 100 : 0,
        card: cardStartedEvents > 0 ? (cardCompletedEvents / cardStartedEvents) * 100 : 0,
      };

      // 11. Calculate tournament fill rate
      // Get tournaments that ended during the period
      const endedTournaments = await Tournaments.find({
        endTime: { $gte: startDate, $lte: new Date() },
      }).lean();

      let totalFillRate = 0;
      if (endedTournaments.length > 0) {
        const fillRates = endedTournaments.map((t: any) =>
          (t.users?.length || 0) / t.maxUsers
        );
        totalFillRate = (fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 100;
      }

      // 12. Tier churn rate (stubbed - requires historical tracking)
      // This would track users who dropped tiers over the period
      const tierChurnRate = {
        rookie: 0,
        silver: 0,
        gold: 0,
        pro: 0,
      };

      return NextResponse.json(
        {
          signupToFirstPick: Math.round(signupToFirstPick),
          pickToDeposit: Math.round(pickToDeposit),
          weeklyActiveUsers: weeklyActiveUsers.length,
          entriesPerUserPerWeek: Math.round(entriesPerUserPerWeek * 10) / 10,
          depositConversionByRail: {
            ach: Math.round(depositConversionByRail.ach),
            card: Math.round(depositConversionByRail.card),
          },
          tournamentFillRate: Math.round(totalFillRate),
          tierChurnRate,
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Analytics Funnel API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to calculate analytics', message: error.message },
        { status: 500 }
      );
    }
  }
);
