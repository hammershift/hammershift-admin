import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { withRateLimit, RateLimitPresets } from "@/app/lib/rateLimiter";
import UserEvents from "@/app/models/userEvent.model";
import { trackCustomerIOEvent } from "@/app/lib/customerio";
import { capturePostHogEvent } from "@/app/lib/posthog";
import { createAuditLog, AuditActions, AuditResources } from "@/app/lib/auditLogger";
import connectToDB from "@/app/lib/mongoose";

/**
 * POST /api/events/track
 *
 * Track user events for analytics and lifecycle marketing.
 * Events are saved to MongoDB and sent to Customer.io and PostHog asynchronously.
 *
 * Authentication: NextAuth session required
 * Rate Limit: STANDARD preset (60 req/min)
 */
export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { event_type, event_data } = body;

      if (!event_type || typeof event_type !== "string") {
        return NextResponse.json(
          { error: "event_type is required and must be a string" },
          { status: 400 }
        );
      }

      // 3. Save to MongoDB
      await connectToDB();

      const event = await UserEvents.create({
        user_id: session.user.id,
        event_type,
        event_data: event_data || {},
        created_at: new Date(),
      });

      // 4. Fire external integrations (non-blocking)
      Promise.allSettled([
        trackCustomerIOEvent(session.user.id, event_type, event_data || {}),
        capturePostHogEvent(session.user.id, event_type, event_data || {}),
      ]).catch((err) =>
        console.error("[Events API] External tracking failed:", err)
      );

      // 5. Create audit log
      await createAuditLog({
        userId: session.user.id,
        username: session.user.username || "unknown",
        userRole: session.user.role || "user",
        action: "event.tracked",
        resource: "UserEvent",
        resourceId: event._id,
        method: "POST",
        endpoint: "/api/events/track",
        status: "success",
        metadata: { event_type },
        req,
      });

      return NextResponse.json(
        { success: true, event_id: event._id },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[Events API] Error tracking event:", error);

      return NextResponse.json(
        { error: "Failed to track event", message: error.message },
        { status: 500 }
      );
    }
  }
);
