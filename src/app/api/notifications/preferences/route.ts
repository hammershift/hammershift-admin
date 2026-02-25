import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * GET /api/notifications/preferences
 *
 * Get user's notification preferences
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

      // 4. Return preferences with defaults
      const preferences = user.notification_preferences || {
        email_30min: true,
        email_rank_drop: true,
        push_30min: false,
        sms_30min: false,
      };

      return NextResponse.json(
        {
          email_30min: preferences.email_30min,
          email_rank_drop: preferences.email_rank_drop,
          push_30min: preferences.push_30min,
          sms_30min: preferences.sms_30min,
          phone: user.phone || null,
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Notification Preferences GET API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get preferences', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/notifications/preferences
 *
 * Update user's notification preferences
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
      const { email_30min, email_rank_drop, push_30min, sms_30min, phone } = body;

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Update preferences (only provided fields)
      if (!user.notification_preferences) {
        user.notification_preferences = {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        };
      }

      if (email_30min !== undefined) {
        user.notification_preferences.email_30min = email_30min;
      }
      if (email_rank_drop !== undefined) {
        user.notification_preferences.email_rank_drop = email_rank_drop;
      }
      if (push_30min !== undefined) {
        user.notification_preferences.push_30min = push_30min;
      }
      if (sms_30min !== undefined) {
        user.notification_preferences.sms_30min = sms_30min;
      }
      if (phone !== undefined) {
        user.phone = phone;
      }

      await user.save();

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Notification Preferences PATCH API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to update preferences', message: error.message },
        { status: 500 }
      );
    }
  }
);
