import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import EmailLogs from '@/app/models/emailLog.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * Customer.io Webhook Handler
 *
 * Handles incoming webhooks from Customer.io to track email delivery status,
 * opens, clicks, and bounces. Updates EmailLogs collection accordingly.
 *
 * Webhook Events Handled:
 * - email_sent: Email was sent successfully
 * - email_delivered: Email was delivered to recipient's inbox
 * - email_opened: Recipient opened the email
 * - email_clicked: Recipient clicked a link in the email
 * - email_bounced: Email bounced (hard or soft)
 * - email_failed: Email failed to send
 *
 * Security:
 * - Verifies webhook signature using CUSTOMERIO_WEBHOOK_SECRET
 * - Uses timing-safe comparison to prevent timing attacks
 *
 * Environment Variables Required:
 * - CUSTOMERIO_WEBHOOK_SECRET: Secret key for verifying webhook signatures
 */

/**
 * Verify Customer.io webhook signature
 *
 * @param body - Raw request body as string
 * @param signature - Signature from x-cio-signature header
 * @param secret - Webhook secret from environment
 * @returns boolean indicating if signature is valid
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Customer.io Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Determine email type from campaign ID
 *
 * Maps Customer.io campaign IDs to email types for categorization.
 * Update this mapping when new campaigns are created in Customer.io.
 *
 * @param campaignId - Customer.io campaign identifier
 * @returns Email type category
 */
function determineEmailType(campaignId: string): string {
  // Campaign ID to email type mapping
  // This should be updated as campaigns are created in Customer.io
  const mapping: Record<string, string> = {
    // Welcome series
    'welcome_d0': 'welcome',
    'welcome_d2': 'welcome',
    'welcome_d5': 'welcome',

    // Prediction emails
    'prediction_confirmation': 'confirmation',
    'prediction_result': 'result',

    // Engagement emails
    'weekly_digest': 'digest',
    'auction_reminder': 'reminder',
    'auction_ending_soon': 'reminder',

    // Reactivation series
    'reactivation_d7': 'reactivation',
    'reactivation_d14': 'reactivation',

    // Tournament emails
    'tournament_confirmation': 'confirmation',
    'tournament_result': 'result',

    // Streak emails
    'streak_milestone': 'confirmation',
  };

  return mapping[campaignId] || 'confirmation';
}

/**
 * POST handler for Customer.io webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Check if webhook secret is configured
    const secret = process.env.CUSTOMERIO_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Customer.io Webhook] CUSTOMERIO_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get signature from header
    const signature = req.headers.get('x-cio-signature');

    if (!signature) {
      console.warn('[Customer.io Webhook] Missing x-cio-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();

    // Verify signature
    if (!verifySignature(body, signature, secret)) {
      console.warn('[Customer.io Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event data
    const event = JSON.parse(body);

    console.log('[Customer.io Webhook] Received event:', {
      event_type: event.event_type,
      recipient_id: event.data?.recipient_id,
      campaign_id: event.data?.campaign_id,
    });

    // Connect to database
    await connectToDB();

    // Handle different event types
    switch (event.event_type) {
      case 'email_sent':
        await EmailLogs.create({
          user_id: event.data.recipient_id,
          campaign_id: event.data.campaign_id,
          email_type: determineEmailType(event.data.campaign_id),
          sent_at: new Date(event.timestamp * 1000),
          status: 'sent',
        });
        break;

      case 'email_delivered':
        await EmailLogs.updateOne(
          {
            campaign_id: event.data.campaign_id,
            user_id: event.data.recipient_id,
          },
          {
            $set: { status: 'delivered' },
          }
        );
        break;

      case 'email_opened':
        await EmailLogs.updateOne(
          {
            campaign_id: event.data.campaign_id,
            user_id: event.data.recipient_id,
          },
          {
            $set: {
              status: 'opened',
              opened_at: new Date(event.timestamp * 1000),
            },
          }
        );
        break;

      case 'email_clicked':
        await EmailLogs.updateOne(
          {
            campaign_id: event.data.campaign_id,
            user_id: event.data.recipient_id,
          },
          {
            $set: {
              status: 'clicked',
              clicked_at: new Date(event.timestamp * 1000),
            },
          }
        );
        break;

      case 'email_bounced':
      case 'email_failed':
        const status = event.event_type.replace('email_', '') as 'bounced' | 'failed';
        await EmailLogs.updateOne(
          {
            campaign_id: event.data.campaign_id,
            user_id: event.data.recipient_id,
          },
          {
            $set: { status },
          }
        );
        break;

      default:
        console.log(`[Customer.io Webhook] Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Customer.io Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook verification (optional)
 *
 * Some webhook providers require a GET endpoint for verification.
 * This can be used by Customer.io to verify the webhook URL is accessible.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Customer.io webhook endpoint',
    status: 'active',
  });
}
