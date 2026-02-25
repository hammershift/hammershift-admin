import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * PATCH /api/wallet/preferred-method
 *
 * Update user's preferred payment method
 */
export const PATCH = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { method } = body;

      if (!method || !['ach', 'card'].includes(method)) {
        return NextResponse.json(
          { error: 'Invalid method. Must be "ach" or "card"' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Update preferred method
      user.preferred_payment_method = method;
      await user.save();

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Preferred Method API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to update preferred method', message: error.message },
        { status: 500 }
      );
    }
  }
);
