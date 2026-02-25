import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import PushSubscriptions from '@/app/models/pushSubscription.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * POST /api/notifications/push/subscribe
 *
 * Save Web Push subscription (stub - does not send notifications)
 */
export const POST = withRateLimit(
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
      const { subscription } = body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return NextResponse.json(
          { error: 'Invalid subscription object' },
          { status: 400 }
        );
      }

      if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return NextResponse.json(
          { error: 'Invalid subscription keys' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Upsert push subscription (user can have multiple devices)
      await PushSubscriptions.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        {
          user_id: session.user.id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Push Subscribe API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to save subscription', message: error.message },
        { status: 500 }
      );
    }
  }
);
