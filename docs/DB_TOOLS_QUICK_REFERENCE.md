# Database Tools - Quick Reference Card

Fast reference for HammerShift database maintenance scripts.

---

## Quick Commands

```bash
# Daily health check (30 sec)
npm run db:health

# Check active auctions (10 sec)
npm run db:check-active

# Full diagnostics (1-2 min)
npm run db:diagnostics

# Preview cleanup (30 sec)
npm run db:cleanup

# Execute cleanup (1 min)
npm run db:cleanup:execute

# Verify consistency (1-2 min)
npm run db:verify-consistency

# Check indexes (30 sec)
npm run db:index-check

# Verify migration (10 sec)
npm run db:verify-migration
```

---

## When to Use What

| Situation | Command | Time |
|-----------|---------|------|
| Daily check | `npm run db:health` | 30s |
| Auctions not showing | `npm run db:check-active` | 10s |
| Something seems wrong | `npm run db:diagnostics` | 1-2m |
| After finding issues | `npm run db:cleanup` | 30s |
| Queries are slow | `npm run db:index-check` | 30s |
| Data seems inconsistent | `npm run db:verify-consistency` | 1-2m |
| After deployment | `npm run db:verify-migration` | 10s |

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | ✅ All good |
| 1 | Warnings | ⚠️ Review output |
| 2 | Critical | 🚨 Fix immediately |

---

## Common Issues

### Stale Active Auctions
```bash
npm run db:check-active        # Identify
npm run db:cleanup:execute     # Fix
```

### Wrong Prediction Counts
```bash
npm run db:diagnostics         # Identify
npm run db:cleanup:execute     # Fix
```

### Orphaned Data
```bash
npm run db:verify-consistency  # Identify
npm run db:cleanup:execute     # Fix
```

### Slow Queries
```bash
npm run db:index-check         # Identify
# Fix: Update schema, add indexes
```

---

## Emergency Procedure

```bash
# 1. Quick check
npm run db:health

# 2. Full diagnosis
npm run db:diagnostics

# 3. Preview fix
npm run db:cleanup

# 4. Execute fix (if safe)
npm run db:cleanup:execute

# 5. Verify
npm run db:diagnostics
```

---

## Safety Rules

1. ✅ Always run `db:cleanup` (dry-run) first
2. ✅ Review preview before executing
3. ✅ Backup database before major cleanup
4. ✅ Run diagnostics after cleanup
5. ❌ Never run cleanup without review

---

## Output Indicators

| Icon | Meaning |
|------|---------|
| ✅ | Passed |
| ⚠️ | Warning |
| 🚨 | Critical |
| ❌ | Failed |
| ℹ️ | Info |

---

## Collection Quick Reference

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| auctions | Car listings | auction_id, isActive |
| predictions | Price guesses | auction_id, user.userId |
| users | User accounts | email, username |
| tournaments | Competitions | tournament_id, isActive |
| streaks | Daily streaks | user_id |
| badges | Achievements | user_id + badge_type |

---

## Monitoring Integration

```bash
# JSON output for monitoring
npm run db:health -- --json

# Exit codes for alerting
0 = healthy, 1 = warning, 2 = critical
```

---

## Full Documentation

For detailed information, see:
- `/docs/DATABASE_MAINTENANCE.md` - Complete guide
- `/docs/DB_DIAGNOSTICS_SUMMARY.md` - Implementation details

---

## Support Checklist

When asking for help, include:

- [ ] Output from `npm run db:health`
- [ ] Output from `npm run db:diagnostics`
- [ ] What you were trying to do
- [ ] Any error messages
- [ ] Recent deployments or changes

---

**Keep this card handy for quick reference!**
