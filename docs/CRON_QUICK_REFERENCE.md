# Cron Jobs - Quick Reference

## Cron Schedules

| Job | Schedule | Cron Expression | Description |
|-----|----------|----------------|-------------|
| **Leaderboard Refresh** | Mon 00:00 UTC | `0 0 * * 1` | Refresh weekly/monthly/alltime leaderboards |
| **Weekly Digest** | Mon 13:00 UTC | `0 13 * * 1` | Send digest emails (Mon 9am ET) |
| **Inactive Users** | Daily 02:00 UTC | `0 2 * * *` | Detect D7/D14 inactive users |
| **Stale Auctions** | Daily 03:00 UTC | `0 3 * * *` | Score ended auctions |
| **Auction Reminders** | Every 6h | `0 */6 * * *` | Remind users of auctions ending soon |

## Environment Variables

```env
# Required
CRON_SECRET=your_secret_here
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional (from Agent 4)
CUSTOMERIO_SITE_ID=xxx
CUSTOMERIO_API_KEY=xxx
POSTHOG_API_KEY=xxx
```

## Manual Trigger

```bash
# Health check (no auth)
curl https://your-app.com/api/cron/health

# Trigger specific job (requires auth)
curl -X GET https://your-app.com/api/cron/leaderboard-refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Endpoints

- `/api/cron/leaderboard-refresh` - Refresh leaderboards
- `/api/cron/weekly-digest` - Send weekly emails
- `/api/cron/inactive-users` - Detect inactive users
- `/api/cron/stale-auctions` - Score ended auctions
- `/api/cron/auction-reminders` - Send auction reminders
- `/api/cron/health` - Health check (public)

## Dependencies

| Job | Requires | Fallback |
|-----|----------|----------|
| leaderboard-refresh | Agent 3 API | 207 status |
| weekly-digest | Agent 4 Customer.io | Logs only |
| inactive-users | Agent 4 Customer.io | Logs only |
| stale-auctions | Agent 2 Scoring | Deactivates |
| auction-reminders | Agent 1 Models + Agent 4 | Early return |

## Files Created

```
vercel.json                                    # Cron config
src/app/lib/cronAuth.ts                       # Auth middleware
src/app/api/cron/
  ├── leaderboard-refresh/route.ts
  ├── weekly-digest/route.ts
  ├── inactive-users/route.ts
  ├── stale-auctions/route.ts
  ├── auction-reminders/route.ts
  └── health/route.ts
__tests__/
  ├── unit/lib/cronAuth.test.ts
  └── integration/cron/cronJobs.test.ts
docs/
  ├── CRON_SETUP.md
  └── AGENT_5_IMPLEMENTATION_SUMMARY.md
```

## Test Commands

```bash
# Unit tests
npm test __tests__/unit/lib/cronAuth.test.ts

# Integration tests
npm test __tests__/integration/cron/cronJobs.test.ts

# All tests
npm test
```

## Deployment

```bash
# 1. Set env vars in Vercel dashboard
# 2. Deploy
git add .
git commit -m "feat: implement cron automation layer"
git push origin main

# 3. Verify
curl https://your-app.com/api/cron/health
```

## Monitoring

**Vercel Dashboard:** Deployments → Functions → Cron

**Logs:** View execution logs in Vercel Functions tab

**Errors:** Check console.error outputs in logs

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check CRON_SECRET in Vercel env vars |
| Missing dependencies | Verify other agents deployed |
| Timeout | Check batch limits, consider pagination |
| Not running | Verify vercel.json in project root |

---

**Need More Info?** See `/docs/CRON_SETUP.md` for full documentation.
