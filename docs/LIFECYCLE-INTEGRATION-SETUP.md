# Lifecycle & Integration Setup Guide

**Agent 4: Lifecycle & Integration Layer**
**Date:** 2026-02-12
**Status:** Implementation Complete

---

## Overview

This document provides setup instructions for Customer.io, PostHog integrations, and webhook configuration for the Velocity Markets backend enhancement project.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Customer.io Setup](#customerio-setup)
3. [PostHog Setup](#posthog-setup)
4. [Webhook Configuration](#webhook-configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Environment Variables

Add the following variables to your `.env.local` (development) and production environment:

```env
# Customer.io Configuration
CUSTOMERIO_SITE_ID=your_site_id_here
CUSTOMERIO_API_KEY=your_api_key_here
CUSTOMERIO_WEBHOOK_SECRET=your_webhook_secret_here

# PostHog Configuration
POSTHOG_API_KEY=your_posthog_project_key_here
POSTHOG_HOST=https://app.posthog.com
```

### Getting Customer.io Credentials

1. Log in to [Customer.io](https://customer.io)
2. Navigate to **Settings > API Credentials**
3. Copy your **Site ID** (Track API Key)
4. Copy your **API Key** (Track API Secret)
5. Navigate to **Settings > Webhooks**
6. Generate a new webhook secret or use existing one

### Getting PostHog Credentials

1. Log in to [PostHog](https://app.posthog.com)
2. Navigate to **Project Settings > Project API Key**
3. Copy your **Project API Key**
4. Use `https://app.posthog.com` as the host (or your self-hosted URL)

---

## Customer.io Setup

### 1. Campaign Configuration

The following campaigns should be created in Customer.io dashboard:

#### Welcome Series

| Campaign ID | Trigger Event | Delay | Description |
|-------------|---------------|-------|-------------|
| `welcome_d0` | `signup_completed` | 0 days | Welcome email sent immediately after signup |
| `welcome_d2` | `signup_completed` | 2 days | Follow-up with product tips |
| `welcome_d5` | `signup_completed` | 5 days | Engagement nudge |

**Setup Steps:**
1. Go to **Campaigns > Create Campaign**
2. Select **Event-Triggered Campaign**
3. Set trigger to `signup_completed`
4. Add delays as specified
5. Design email template with user attributes:
   - `{{ customer.username }}`
   - `{{ customer.email }}`
   - `{{ customer.total_points }}`

#### Prediction Emails

| Campaign ID | Trigger Event | Description |
|-------------|---------------|-------------|
| `prediction_confirmation` | `prediction_made` | Confirms user's prediction |
| `prediction_result` | `prediction_scored` | Sends prediction results with score |

**Liquid Template Variables:**
```liquid
{{ event.auction_id }}
{{ event.predicted_price }}
{{ event.score }}
{{ event.delta }}
{{ customer.current_streak }}
```

#### Engagement Emails

| Campaign ID | Trigger Event | Frequency | Description |
|-------------|---------------|-----------|-------------|
| `weekly_digest` | `weekly_digest_triggered` | Weekly | Summary of user activity |
| `auction_reminder` | `auction_ending_soon` | Max 1/day | Reminder for auctions ending soon |

#### Reactivation Series

| Campaign ID | Trigger Event | Condition | Description |
|-------------|---------------|-----------|-------------|
| `reactivation_d7` | `user_inactive` | `days_inactive == 7` | First reactivation email |
| `reactivation_d14` | `user_inactive` | `days_inactive == 14` | Second reactivation email |

**Frequency Caps:**
- Set max 1 email per day per user
- Respect `email_preferences` attributes

### 2. Event → Campaign Mapping

| Backend Event | Customer.io Campaign | Purpose |
|---------------|---------------------|---------|
| `signup_completed` | Welcome Series | Onboard new users |
| `prediction_made` | `prediction_confirmation` | Confirm prediction received |
| `prediction_scored` | `prediction_result` | Send results |
| `tournament_joined` | `tournament_confirmation` | Confirm tournament entry |
| `streak_updated` (milestone) | `streak_milestone` | Celebrate achievements |
| `user_inactive` (7d) | `reactivation_d7` | Re-engage users |
| `user_inactive` (14d) | `reactivation_d14` | Re-engage users |
| `auction_ending_soon` | `auction_reminder` | Remind users to predict |
| `weekly_digest_triggered` | `weekly_digest` | Weekly summary |

### 3. User Attributes Synced

The following user attributes are synced to Customer.io via `identifyUser()`:

```typescript
{
  email: string;              // User email address
  username: string;           // Display name
  created_at: number;         // Unix timestamp (seconds)
  total_points?: number;      // Cumulative points
  current_streak?: number;    // Current prediction streak
  rank_title?: string;        // User rank (Rookie, Rising Star, Expert, Legend)
  full_name?: string;         // Full name if available
  is_active?: boolean;        // Account status
  last_prediction_at?: number; // Last prediction timestamp
}
```

### 4. Webhook Setup

1. In Customer.io dashboard, navigate to **Settings > Webhooks**
2. Click **Add Webhook**
3. Configure webhook:
   - **Endpoint URL:** `https://your-domain.com/api/webhooks/customerio`
   - **Events:** Select all email events
     - `email_sent`
     - `email_delivered`
     - `email_opened`
     - `email_clicked`
     - `email_bounced`
     - `email_failed`
   - **Secret:** Generate and copy to `CUSTOMERIO_WEBHOOK_SECRET`
4. Click **Save**

### 5. Testing Customer.io Integration

```bash
# Test event tracking
curl -X POST http://localhost:3000/api/events/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "event_type": "prediction_made",
    "event_data": {
      "auction_id": "507f1f77bcf86cd799439011",
      "predicted_price": 50000
    }
  }'

# Test webhook (with valid signature)
curl -X POST http://localhost:3000/api/webhooks/customerio \
  -H "Content-Type: application/json" \
  -H "x-cio-signature: YOUR_SIGNATURE" \
  -d '{
    "event_type": "email_sent",
    "timestamp": 1640000000,
    "data": {
      "recipient_id": "user123",
      "campaign_id": "prediction_confirmation"
    }
  }'
```

---

## PostHog Setup

### 1. Project Configuration

1. Create a new project in PostHog (or use existing)
2. Navigate to **Project Settings**
3. Copy **Project API Key**
4. Add to `.env.local` as `POSTHOG_API_KEY`

### 2. Event Tracking

PostHog automatically receives all events tracked via `/api/events/track`.

**Common Events:**
- `prediction_made`
- `tournament_joined`
- `prediction_scored`
- `streak_updated`
- `badge_earned`
- `auction_viewed`
- `signup_completed`

### 3. User Properties

User properties are synced via `identifyPostHogUser()`:

```typescript
{
  email: string;
  username: string;
  total_points: number;
  current_streak: number;
  rank_title: string;
  role: string;
}
```

### 4. Feature Flags (Optional)

PostHog supports feature flags for A/B testing and gradual rollouts.

```typescript
import { isFeatureFlagEnabled } from '@/app/lib/posthog';

const enabled = await isFeatureFlagEnabled('user123', 'new_scoring_algorithm', false);
```

### 5. Testing PostHog Integration

```bash
# Events are automatically sent to PostHog when you call /api/events/track
# Check PostHog dashboard under Activity > Live Events to see incoming events
```

---

## Webhook Configuration

### Verifying Webhooks

Customer.io signs all webhook requests with HMAC-SHA256. The signature is in the `x-cio-signature` header.

**Verification Process:**
1. Get raw request body as string
2. Create HMAC with SHA256 using `CUSTOMERIO_WEBHOOK_SECRET`
3. Compare signatures using timing-safe comparison

**Implementation:**
```typescript
import crypto from 'crypto';

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Webhook Payload Examples

#### Email Sent
```json
{
  "event_type": "email_sent",
  "timestamp": 1640000000,
  "data": {
    "recipient_id": "user123",
    "campaign_id": "prediction_confirmation",
    "email_subject": "Your prediction has been received!"
  }
}
```

#### Email Opened
```json
{
  "event_type": "email_opened",
  "timestamp": 1640000100,
  "data": {
    "recipient_id": "user123",
    "campaign_id": "prediction_confirmation"
  }
}
```

#### Email Clicked
```json
{
  "event_type": "email_clicked",
  "timestamp": 1640000200,
  "data": {
    "recipient_id": "user123",
    "campaign_id": "prediction_confirmation",
    "link_url": "https://velocitymarkets.com/auctions/123"
  }
}
```

---

## Testing

### Unit Tests

Run integration tests with mocked external APIs:

```bash
npm run test -- lifecycle-integration.test.ts
```

### Manual Testing Checklist

- [ ] Customer.io event tracking works
- [ ] PostHog event tracking works
- [ ] Webhook signature verification works
- [ ] Email log creation on `email_sent`
- [ ] Email log updates on `email_opened`
- [ ] Email log updates on `email_clicked`
- [ ] Graceful failure when APIs unavailable
- [ ] Rate limiting applies correctly
- [ ] Audit logs created for events

### Load Testing

```bash
# Test 100 concurrent event tracking requests
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -p event-payload.json \
  http://localhost:3000/api/events/track
```

---

## Troubleshooting

### Issue: Events not appearing in Customer.io

**Possible Causes:**
1. Invalid `CUSTOMERIO_SITE_ID` or `CUSTOMERIO_API_KEY`
2. Network connectivity issues
3. Events timing out (>5s)

**Solutions:**
- Check environment variables are set correctly
- Verify credentials in Customer.io dashboard
- Check console logs for errors
- Increase timeout if needed (currently 5s)

### Issue: Webhooks failing signature verification

**Possible Causes:**
1. Incorrect `CUSTOMERIO_WEBHOOK_SECRET`
2. Request body modified by middleware
3. Encoding issues

**Solutions:**
- Regenerate webhook secret in Customer.io
- Ensure raw body is used for signature verification
- Check for JSON parsing before verification

### Issue: PostHog events not appearing

**Possible Causes:**
1. Invalid `POSTHOG_API_KEY`
2. Client not initialized properly
3. Events queued but not flushed

**Solutions:**
- Verify API key in PostHog dashboard
- Check PostHog client initialization
- Manually call `shutdownPostHog()` to flush queue

### Issue: High latency on /api/events/track

**Possible Causes:**
1. External APIs are slow
2. Blocking on Promise.allSettled
3. Database connection issues

**Solutions:**
- Ensure external calls are truly non-blocking
- Don't await Promise.allSettled (fire and forget)
- Optimize database queries
- Consider message queue (e.g., Redis) for high volume

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables set in production
- [ ] Customer.io campaigns created and tested
- [ ] PostHog project configured
- [ ] Webhook URL configured in Customer.io
- [ ] Webhook secret stored securely
- [ ] SSL/TLS enabled for webhook endpoint
- [ ] Rate limiting configured appropriately
- [ ] Error monitoring (Sentry) configured
- [ ] Audit logging enabled
- [ ] Load testing completed
- [ ] Integration tests passing
- [ ] Documentation reviewed

---

## Support & Resources

- **Customer.io Docs:** https://customer.io/docs/
- **PostHog Docs:** https://posthog.com/docs/
- **Design Document:** `/docs/plans/2026-02-12-backend-enhancement-design.md`
- **Integration Tests:** `/src/__tests__/integration/lifecycle-integration.test.ts`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-12 | Initial implementation | Agent 4 |

---

**End of Document**
