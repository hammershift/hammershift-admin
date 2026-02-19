# Cron Jobs Setup & Documentation

## Overview

This document describes the automated cron jobs implemented for Velocity Markets backend enhancement (Phase 2, Agent 5).

## Cron Jobs

### 1. Leaderboard Refresh
- **Endpoint:** `GET /api/cron/leaderboard-refresh`
- **Schedule:** Monday 00:00 UTC (Weekly)
- **Purpose:** Refresh leaderboard snapshots for weekly, monthly, and all-time periods
- **Dependencies:** Agent 3's `/api/leaderboard/refresh` endpoint

### 2. Weekly Digest
- **Endpoint:** `GET /api/cron/weekly-digest`
- **Schedule:** Monday 13:00 UTC (Monday 9am ET)
- **Purpose:** Send weekly digest emails to active users
- **Dependencies:**
  - Agent 4's Customer.io integration (`identifyUser`, `trackCustomerIOEvent`)
  - User model with `email_preferences.digests` field

### 3. Inactive User Detection
- **Endpoint:** `GET /api/cron/inactive-users`
- **Schedule:** Daily 02:00 UTC
- **Purpose:** Detect users inactive for 7 or 14 days and trigger reactivation campaigns
- **Dependencies:** Agent 4's Customer.io integration

### 4. Stale Auction Cleanup
- **Endpoint:** `GET /api/cron/stale-auctions`
- **Schedule:** Daily 03:00 UTC
- **Purpose:** Score ended auctions and mark unsuccessful ones
- **Dependencies:**
  - Agent 2's scoring engine (`scoreAuctionPredictions`)
  - Auction model with `sort.deadline` field

### 5. Auction Ending Reminders
- **Endpoint:** `GET /api/cron/auction-reminders`
- **Schedule:** Every 6 hours (0, 6, 12, 18 UTC)
- **Purpose:** Send reminders for auctions ending in next 24 hours
- **Dependencies:**
  - Agent 1's `user_events` and `email_logs` models
  - Agent 4's Customer.io integration
  - Frequency caps (max 1 reminder per 24h per user)

### 6. Health Check
- **Endpoint:** `GET /api/cron/health`
- **Schedule:** N/A (available anytime)
- **Purpose:** Return status of all cron jobs
- **Authentication:** None (public endpoint)

## Environment Variables

### Required

```env
# Cron Authentication
CRON_SECRET=your_random_secret_string_here

# Application Base URL (for internal API calls)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

### Optional (from other agents)

```env
# Customer.io Integration (Agent 4)
CUSTOMERIO_SITE_ID=your_site_id
CUSTOMERIO_API_KEY=your_api_key
CUSTOMERIO_WEBHOOK_SECRET=your_webhook_secret

# PostHog Integration (Agent 4)
POSTHOG_API_KEY=your_project_key
POSTHOG_HOST=https://app.posthog.com
```

## Authentication

All cron endpoints (except `/health`) require Bearer token authentication:

```bash
curl -X GET https://your-app.com/api/cron/leaderboard-refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

In development (no `CRON_SECRET` set), all requests are allowed for testing.

## Vercel Configuration

The `vercel.json` file in the project root configures Vercel's cron scheduler:

```json
{
  "crons": [
    {
      "path": "/api/cron/leaderboard-refresh",
      "schedule": "0 0 * * 1"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 13 * * 1"
    },
    {
      "path": "/api/cron/inactive-users",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/stale-auctions",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/auction-reminders",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Cron Expression Format:** `minute hour day month weekday`

## Deployment

### 1. Set Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `CRON_SECRET` with a secure random string
3. Add `NEXT_PUBLIC_APP_URL` with your production domain

### 2. Deploy

```bash
git add .
git commit -m "feat: implement cron jobs automation layer"
git push origin main
```

Vercel will automatically detect `vercel.json` and enable cron jobs.

### 3. Verify

Check cron job status:
```bash
curl https://your-app.com/api/cron/health
```

## Manual Triggering (for testing)

You can manually trigger any cron job using curl:

```bash
# Trigger leaderboard refresh
curl -X GET https://your-app.com/api/cron/leaderboard-refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Trigger weekly digest
curl -X GET https://your-app.com/api/cron/weekly-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Error Handling

All cron jobs implement:
1. **Graceful degradation** - Missing dependencies are logged, job continues
2. **Error logging** - Errors logged to console (captured by Vercel logs)
3. **Partial failure handling** - One failure doesn't stop the entire job
4. **Idempotency** - Safe to run multiple times
5. **Transaction safety** - Database operations are atomic where possible

## Monitoring

### Vercel Dashboard
- Navigate to Deployments → Functions
- View cron job execution logs
- Check success/failure rates

### Custom Monitoring (recommended)
Consider adding:
- Sentry error tracking
- Custom metrics to PostHog
- Email alerts for failures

## Frequency Caps

To prevent spam:
- **Weekly Digest:** Max 1 per week per user (controlled by schedule)
- **Inactive Users:** Max 1 per inactivity window (7d, 14d)
- **Auction Reminders:** Max 1 per 24h per user (checked via `email_logs`)

## Testing

### Unit Tests
```bash
npm test __tests__/unit/lib/cronAuth.test.ts
```

### Integration Tests
```bash
npm test __tests__/integration/cron/cronJobs.test.ts
```

### Manual Testing
1. Set `CRON_SECRET` in `.env.local`
2. Start development server: `npm run dev`
3. Trigger endpoint: `curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:3000/api/cron/health`

## Troubleshooting

### Cron not running
- Check Vercel project settings → Functions → Cron
- Verify `vercel.json` is in project root
- Check deployment logs for errors

### 401 Unauthorized
- Verify `CRON_SECRET` is set in Vercel environment variables
- Ensure header format is `Bearer YOUR_SECRET`

### Missing dependencies errors
- Check that other agents have deployed their utilities:
  - Agent 1: Models (user_events, email_logs)
  - Agent 2: Scoring engine
  - Agent 3: Leaderboard refresh endpoint
  - Agent 4: Customer.io integration

### Jobs timing out
- Increase Vercel function timeout (Pro plan: up to 60s)
- Add batch processing limits (already implemented)
- Consider splitting large jobs into smaller batches

## Inter-Agent Dependencies

| Cron Job | Depends On | Fallback Behavior |
|----------|-----------|-------------------|
| leaderboard-refresh | Agent 3 API endpoint | Returns 207 Multi-Status with partial results |
| weekly-digest | Agent 4 Customer.io | Logs users but doesn't send emails |
| inactive-users | Agent 4 Customer.io | Logs detection but doesn't trigger campaigns |
| stale-auctions | Agent 2 Scoring Engine | Deactivates predictions without scoring |
| auction-reminders | Agent 1 Models, Agent 4 Customer.io | Returns early with dependency note |

All jobs implement graceful degradation when dependencies are missing.

## Next Steps

1. Deploy to production
2. Monitor first execution of each job
3. Verify Customer.io campaigns trigger correctly
4. Set up Sentry error tracking
5. Configure alerting for job failures
