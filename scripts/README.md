# Database Scripts - Complete Guide

## Overview

This directory contains all database maintenance, diagnostic, and migration scripts for the HammerShift project.

## Available Scripts

| Script | npm Command | Purpose | Runtime | Modifies DB |
|--------|-------------|---------|---------|-------------|
| **db-health-check.ts** | `npm run db:health` | Fast health check | 10-30s | No |
| **db-diagnostics.ts** | `npm run db:diagnostics` | Full integrity check | 1-5m | No |
| **db-cleanup.ts** | `npm run db:cleanup` | Preview fixes | 30s-1m | No (dry-run) |
| **db-cleanup.ts** | `npm run db:cleanup:execute` | Apply fixes | 1-3m | **Yes** |
| **db-index-check.ts** | `npm run db:index-check` | Verify indexes | 30-90s | No |
| **verify-data-consistency.ts** | `npm run db:verify-consistency` | Deep checks | 1-5m | No |
| **verify-ladder-tier-migration.ts** | `npm run db:verify-migration` | Migration status | 10-30s | No |
| **check-all-active.ts** | `npm run db:check-active` | List active auctions | 5-10s | No |
| **migrate-data-models.ts** | `npm run db:migrate` | Run migrations | Varies | **Yes** |

## Quick Start

```bash
# Install tsx (if not already installed)
npm install --save-dev tsx

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MONGODB_URI

# Run health check
npm run db:health

# Run full diagnostics
npm run db:diagnostics
```

---

## Diagnostic & Maintenance Scripts

### 1. Health Check (db-health-check.ts)

**Fast health monitoring for automated systems**

```bash
npm run db:health
npm run db:health -- --json  # JSON output for monitoring
```

**Checks:**
- Database connection
- Collection counts
- Active auction status
- User-streak consistency
- Duplicate detection
- Orphaned records (sample)
- Critical indexes

**Exit Codes:** 0 (healthy), 1 (warning), 2 (critical)

---

### 2. Full Diagnostics (db-diagnostics.ts)

**Comprehensive integrity check**

```bash
npm run db:diagnostics
```

**Checks 34+ integrity points:**
- Auction data integrity (6 checks)
- Prediction data integrity (5 checks)
- User data integrity (6 checks)
- Tournament data integrity (4 checks)
- Streak data integrity (3 checks)
- Badge data integrity (2 checks)
- Index verification (8 collections)

**Output:** Detailed report with critical/warning/info classification

---

### 3. Database Cleanup (db-cleanup.ts)

**Automated fixes for common issues**

```bash
# Preview changes (dry-run, safe)
npm run db:cleanup

# Apply changes (CAREFUL!)
npm run db:cleanup:execute
```

**Fixes:**
- Stale active auctions
- Incorrect prediction counts
- Missing streak records
- Streak inconsistencies
- Orphaned predictions
- Orphaned badges
- Orphaned streaks

**Safety:** Dry-run by default, requires `--execute` flag

---

### 4. Index Verification (db-index-check.ts)

**Verify indexes and query performance**

```bash
npm run db:index-check
```

**Features:**
- Lists all indexes per collection
- Verifies required indexes exist
- Tests common query patterns
- Identifies collection scans
- Reports execution times
- Analyzes slow queries (if profiling enabled)

---

### 5. Consistency Verification (verify-data-consistency.ts)

**Deep cross-collection consistency checks**

```bash
npm run db:verify-consistency
```

**Verifies:**
- User ↔ Streak data sync
- Prediction count accuracy
- Tournament user predictions
- Duplicate prediction detection
- Orphaned references
- User total points accuracy

**Exit Codes:** 0 (pass), 1 (critical issues)

---

### 6. Migration Verification (verify-ladder-tier-migration.ts)

**Verify rank_title → ladder_tier migration**

```bash
npm run db:verify-migration
```

**Checks:**
- No legacy rank_title fields
- All users have ladder_tier
- All values are valid
- Distribution analysis

---

### 7. Active Auctions (check-all-active.ts)

**Quick visual check of active auctions**

```bash
npm run db:check-active
```

**Shows:**
- All auctions with isActive: true
- Deadline status (future ✅ vs past ❌)
- Summary statistics

---

## Data Migration Scripts

## Migration Script: migrate-data-models.ts

### Purpose

Migrates existing database documents to support new Phase 2 fields across 4 collections:

- **users**: Adds gamification fields (streaks, rank, points, email preferences)
- **auctions**: Adds prediction tracking fields (count, average, source, status)
- **tournaments**: Adds scoring_version field
- **predictions**: Adds bonus_modifiers default structure

### Prerequisites

1. Ensure environment variables are set:
   - `MONGODB_URI` or `DATABASE_URL`

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

#### Dry Run (Recommended First)

Preview changes without applying them:

```bash
npx tsx scripts/migrate-data-models.ts --dry-run
```

This will:
- Connect to the database (read-only)
- Count documents needing migration
- Show what would be updated
- Verify all indexes
- Display summary statistics

#### Live Migration

Apply changes to the database:

```bash
npx tsx scripts/migrate-data-models.ts
```

⚠️ **Warning**: This will modify your database. Always run `--dry-run` first!

The script will:
1. Wait 5 seconds before starting (allowing you to cancel)
2. Migrate each collection in sequence
3. Verify indexes are created
4. Display detailed progress and summary

### What Gets Updated

#### Users Collection

For each user missing new fields:
```javascript
{
  current_streak: 0,
  longest_streak: 0,
  rank_title: "Rookie",
  total_points: 0,
  email_preferences: {
    marketing: true,
    digests: true,
    tournaments: true,
    results: true
  }
}
```

New indexes added:
- `total_points: -1` (for leaderboard queries)
- `last_prediction_at: -1` (for inactive user detection)

#### Auctions Collection

For each auction missing new fields:
```javascript
{
  prediction_count: 0,
  source_badge: "bat"
}
```

New indexes added:
- `prediction_count: -1` (for "most predicted" queries)
- `status_display: 1, sort.deadline: 1` (for stale auction detection)

#### Tournaments Collection

For each tournament missing scoring_version:
```javascript
{
  scoring_version: "v2"
}
```

No new indexes (maxUsers, description, banner already exist).

#### Predictions Collection

For each prediction missing bonus_modifiers:
```javascript
{
  bonus_modifiers: {
    early_bird: false,
    streak_bonus: false,
    bullseye: false,
    tournament_multiplier: false
  }
}
```

New indexes added:
- `score: -1` (for leaderboard aggregation)
- `scored_at: -1` (for result queries)

### Performance Notes

- **Predictions**: Processed in batches of 1000 to avoid memory issues
- If you have >1000 predictions, run the script multiple times until no documents are found
- Progress is logged every 100 documents for predictions

### Output Example

```
============================================================
DATA MODELS MIGRATION SCRIPT
============================================================
Mode: DRY RUN (no changes will be applied)
============================================================

⚠️  DRY RUN MODE - No changes will be applied to the database

Connecting to MongoDB...
Connected successfully

============================================================
Migrating Users Collection
============================================================
Found 150 users to update

  User: john_doe (507f1f77bcf86cd799439011)
  Updates: {
    "current_streak": 0,
    "longest_streak": 0,
    "rank_title": "Rookie",
    "total_points": 0,
    "email_preferences": {
      "marketing": true,
      "digests": true,
      "tournaments": true,
      "results": true
    }
  }

Users migration complete:
  Checked: 150
  Updated: 150
  Errors: 0

[... similar output for auctions, tournaments, predictions ...]

============================================================
MIGRATION SUMMARY
============================================================

Total documents checked: 1250
Total documents updated: 1250
Total errors: 0

✅ Dry run completed successfully
Run without --dry-run to apply changes
```

### Rollback

If you need to rollback changes:

1. **Users**: Remove new fields manually or restore from backup
2. **Auctions**: Remove new fields manually or restore from backup
3. **Tournaments**: Can set scoring_version back to v1 if needed
4. **Predictions**: Remove bonus_modifiers field manually or restore from backup

**Recommendation**: Always take a database backup before running live migration!

```bash
# MongoDB Atlas backup (via UI or API)
# Or using mongodump
mongodump --uri="mongodb+srv://..." --out=/backup/path
```

### Troubleshooting

#### Connection Error

```
Error: MONGODB_URI or DATABASE_URL environment variable is not set
```

**Solution**: Set environment variable:
```bash
export MONGODB_URI="mongodb+srv://..."
# or
export DATABASE_URL="mongodb+srv://..."
```

#### Permission Error

```
Error: not authorized on admin to execute command
```

**Solution**: Ensure database user has write permissions.

#### Partial Migration

If script fails midway:
1. Check error logs for specific collection/document
2. Fix the issue (e.g., schema validation error)
3. Re-run script - it's idempotent (safe to run multiple times)

### Verification

After migration, verify in MongoDB:

```javascript
// Users
db.users.findOne({}, { current_streak: 1, rank_title: 1, total_points: 1 })

// Auctions
db.auctions.findOne({}, { prediction_count: 1, source_badge: 1 })

// Tournaments
db.tournaments.findOne({}, { scoring_version: 1 })

// Predictions
db.predictions.findOne({}, { bonus_modifiers: 1 })
```

### Next Steps

After successful migration:

1. ✅ All new model fields are now available
2. ✅ Indexes are created and optimized
3. ✅ Backward compatibility is maintained
4. → Proceed with Agent 2: Event & Scoring Systems
5. → Proceed with Agent 3: Leaderboard & Gamification

---

## Common Tasks

### Daily Monitoring
```bash
npm run db:health
```

### Weekly Maintenance
```bash
npm run db:check-active
npm run db:diagnostics
npm run db:cleanup              # Preview
npm run db:cleanup:execute      # If safe to apply
```

### After Deployment
```bash
npm run db:verify-migration
npm run db:verify-consistency
npm run db:diagnostics
```

### Emergency Response
```bash
npm run db:health               # Quick assessment
npm run db:diagnostics          # Full analysis
npm run db:cleanup              # Preview fixes
npm run db:cleanup:execute      # Apply fixes
npm run db:diagnostics          # Verify resolution
```

---

## Safety Guidelines

### ✅ Always Safe to Run
- `npm run db:health` - Read-only
- `npm run db:diagnostics` - Read-only
- `npm run db:check-active` - Read-only
- `npm run db:index-check` - Read-only
- `npm run db:verify-consistency` - Read-only
- `npm run db:verify-migration` - Read-only

### ⚠️ Preview First
- `npm run db:cleanup` - Dry-run mode (safe)

### 🚨 Requires Caution
- `npm run db:cleanup:execute` - Modifies database
- `npm run db:migrate` - Schema changes

**Before running destructive operations:**
1. ✅ Create database backup
2. ✅ Run in dry-run mode first
3. ✅ Review all changes
4. ✅ Execute during low-traffic period
5. ✅ Notify team
6. ✅ Monitor application logs

---

## Documentation

For detailed information, see:

- **[DATABASE_MAINTENANCE.md](/docs/DATABASE_MAINTENANCE.md)** - Complete maintenance guide
- **[DB_DIAGNOSTICS_SUMMARY.md](/docs/DB_DIAGNOSTICS_SUMMARY.md)** - Technical implementation
- **[DB_TOOLS_QUICK_REFERENCE.md](/docs/DB_TOOLS_QUICK_REFERENCE.md)** - Quick commands
- **[DB_ANALYSIS_REPORT.md](/DB_ANALYSIS_REPORT.md)** - Full analysis report

---

## Troubleshooting

### "MONGODB_URI not set"
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string
```

### "tsx: command not found"
```bash
npm install --save-dev tsx
```

### "Permission denied"
Check MongoDB user has read/write permissions.

### Script hangs
Check MongoDB Atlas cluster is responsive. May need to increase timeout for large collections.

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Database Health Check
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
  run: npm run db:health
```

### Cron Job Example
```bash
# Check health every 6 hours
0 */6 * * * cd /path/to/hammershift-admin && npm run db:health
```

---

## Support

For issues or questions:

**Diagnostic Scripts:**
- Check documentation: `/docs/DATABASE_MAINTENANCE.md`
- Review quick reference: `/docs/DB_TOOLS_QUICK_REFERENCE.md`
- Contact: Database Team

**Migration Scripts:**
- Check design doc: `/docs/plans/2026-02-12-backend-enhancement-design.md`
- Review test cases: `/__tests__/unit/models/dataModels.test.ts`
- Contact: Backend Team

---

**Last Updated:** February 27, 2026
