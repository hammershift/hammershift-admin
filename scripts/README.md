# Data Models Migration Guide

## Overview

This directory contains migration scripts for the Velocity Markets backend enhancement Phase 2 data models.

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

## Support

For issues or questions:
- Check design doc: `/docs/plans/2026-02-12-backend-enhancement-design.md`
- Review test cases: `/__tests__/unit/models/dataModels.test.ts`
- Contact: Backend Team
