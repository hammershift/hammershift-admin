import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import ACHAccounts from '@/app/models/achAccount.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * GET /api/wallet/ach-status
 *
 * Check if user has linked ACH account
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

      // 4. Check for ACH account
      const achAccount = await ACHAccounts.findOne({
        user_id: user._id,
      });

      return NextResponse.json(
        {
          isLinked: !!achAccount,
          lastFour: achAccount ? achAccount.account_number_last4 : null,
          preferredMethod: user.preferred_payment_method || 'card',
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[ACH Status API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get ACH status', message: error.message },
        { status: 500 }
      );
    }
  }
);
