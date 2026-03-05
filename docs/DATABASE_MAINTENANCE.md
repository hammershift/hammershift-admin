# Database Maintenance Guide

Complete guide for maintaining, diagnosing, and fixing database issues in HammerShift.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Available Tools](#available-tools)
- [Common Issues and Fixes](#common-issues-and-fixes)
- [Routine Maintenance](#routine-maintenance)
- [Emergency Procedures](#emergency-procedures)

---

## Overview

The HammerShift database uses MongoDB with the following collections:

- **auctions** - Car auction listings
- **predictions** - User price predictions
- **users** - User accounts and profiles
- **tournaments** - Tournament data
- **streaks** - User prediction streaks
- **badges** - User achievement badges
- **leaderboard_snapshots** - Historical leaderboard data
- **user_events** - Event tracking logs

---

## Quick Start

### 1. Run Full Diagnostics

```bash
npm run db:diagnostics
```

This will check for:
- Stale active auctions
- Orphaned records
- Missing references
- Data inconsistencies
- Index usage

### 2. Check Data Consistency

```bash
npm run db:verify-consistency
```

Verifies:
- User streak data matches between collections
- Prediction counts are accurate
- All references are valid
- Total points calculations are correct

### 3. Verify Indexes

```bash
npm run db:index-check
```

Checks:
- All required indexes exist
- Query performance
- Index usage statistics

---

## Available Tools

### 1. Database Diagnostics (`db:diagnostics`)

**Purpose:** Comprehensive database integrity check

**Usage:**
```bash
npm run db:diagnostics
```

**What it checks:**
- ✅ Active auctions with past deadlines
- ✅ Auctions marked as both ended AND active
- ✅ Missing sort.deadline fields
- ✅ Duplicate auction_ids
- ✅ Orphaned predictions (auction doesn't exist)
- ✅ Invalid user references
- ✅ Duplicate emails/usernames
- ✅ Negative balances
- ✅ Invalid ladder_tier values
- ✅ Streak inconsistencies
- ✅ Tournament data integrity
- ✅ Badge orphans
- ✅ Index existence

**Exit codes:**
- 0: All checks passed
- 1: Critical issues found

---

### 2. Database Cleanup (`db:cleanup`)

**Purpose:** Fix common data integrity issues

**Usage:**

Preview changes (dry run):
```bash
npm run db:cleanup
```

Apply changes:
```bash
npm run db:cleanup:execute
```

**What it fixes:**
- ❌ Marks stale auctions as inactive
- ❌ Updates incorrect prediction counts
- ❌ Creates missing streak records
- ❌ Fixes streak inconsistencies (current > longest)
- ❌ Removes orphaned predictions
- ❌ Removes orphaned badges
- ❌ Removes orphaned streaks

**⚠️ WARNING:** Always run in dry-run mode first to preview changes!

---

### 3. Index Verification (`db:index-check`)

**Purpose:** Verify indexes and query performance

**Usage:**
```bash
npm run db:index-check
```

**What it checks:**
- All required indexes exist
- Index usage for common queries
- Query execution time
- Collection scan warnings
- Slow query analysis (if profiling enabled)

**Output includes:**
- Index list per collection
- Query performance metrics
- Missing index warnings
- Optimization recommendations

---

### 4. Data Consistency Verification (`db:verify-consistency`)

**Purpose:** Deep consistency checks across collections

**Usage:**
```bash
npm run db:verify-consistency
```

**What it verifies:**
- User streak data matches Streaks collection
- Prediction counts match actual predictions
- Tournament users have valid predictions
- No duplicate predictions (same user, same auction)
- All references are valid (no orphans)
- User total_points match sum of prediction scores

**Exit codes:**
- 0: No critical issues
- 1: Critical issues found

---

### 5. Migration Verification (`db:verify-migration`)

**Purpose:** Verify rank_title → ladder_tier migration

**Usage:**
```bash
npm run db:verify-migration
```

**What it checks:**
- No legacy rank_title fields exist
- All users have ladder_tier
- All ladder_tier values are valid ('rookie', 'silver', 'gold', 'pro')
- Distribution of users across tiers

---

### 6. Active Auctions Check (`db:check-active`)

**Purpose:** Quick check of active auctions

**Usage:**
```bash
npm run db:check-active
```

**What it shows:**
- All active auctions (isActive: true)
- Deadline status (future vs past)
- Summary of valid vs stale auctions

---

### 7. Data Migration (`db:migrate`)

**Purpose:** Migrate existing data to new schema

**Usage:**

Preview changes:
```bash
npm run db:migrate --dry-run
```

Apply changes:
```bash
npm run db:migrate
```

**What it migrates:**
- Users: Add gamification fields (streaks, ladder_tier, total_points)
- Auctions: Add prediction tracking fields
- Tournaments: Add scoring_version
- Predictions: Add bonus_modifiers

---

## Common Issues and Fixes

### Issue 1: Stale Active Auctions

**Symptom:** Auctions with `isActive: true` but past deadlines

**Diagnosis:**
```bash
npm run db:check-active
```

**Fix:**
```bash
npm run db:cleanup:execute
```

This will mark auctions with past deadlines as inactive.

---

### Issue 2: Incorrect Prediction Counts

**Symptom:** Auction shows wrong number of predictions

**Diagnosis:**
```bash
npm run db:diagnostics
```
Look for "mismatched prediction_count" warnings

**Fix:**
```bash
npm run db:cleanup:execute
```

This will recalculate and update all prediction counts.

---

### Issue 3: User Missing Streak Records

**Symptom:** User has no entry in Streaks collection

**Diagnosis:**
```bash
npm run db:verify-consistency
```

**Fix:**
```bash
npm run db:cleanup:execute
```

This will create missing streak records with default values.

---

### Issue 4: Orphaned Predictions

**Symptom:** Predictions referencing deleted auctions or users

**Diagnosis:**
```bash
npm run db:diagnostics
```

**Fix:**
```bash
npm run db:cleanup:execute
```

⚠️ **WARNING:** This permanently deletes orphaned predictions!

---

### Issue 5: Duplicate Predictions

**Symptom:** Same user has multiple predictions on one auction

**Diagnosis:**
```bash
npm run db:verify-consistency
```

**Fix:** Manual intervention required. Review duplicates and decide which to keep:

```javascript
// Connect to MongoDB
// Find duplicates
db.predictions.aggregate([
  {
    $group: {
      _id: { userId: "$user.userId", auctionId: "$auction_id" },
      count: { $sum: 1 },
      predictions: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
])

// Delete the unwanted prediction
db.predictions.deleteOne({ _id: ObjectId("...") })
```

---

### Issue 6: Slow Queries

**Symptom:** API endpoints responding slowly

**Diagnosis:**
```bash
npm run db:index-check
```

Look for:
- COLLSCAN warnings (using collection scan instead of index)
- High "documents examined" vs "documents returned" ratio

**Fix:**
1. Add missing indexes to the model schema
2. Restart the application to create indexes
3. Verify with `npm run db:index-check`

---

## Routine Maintenance

### Weekly Tasks

1. **Check active auctions**
   ```bash
   npm run db:check-active
   ```

2. **Run diagnostics**
   ```bash
   npm run db:diagnostics
   ```

3. **Verify consistency**
   ```bash
   npm run db:verify-consistency
   ```

### Monthly Tasks

1. **Full cleanup**
   ```bash
   npm run db:cleanup:execute
   ```

2. **Index verification**
   ```bash
   npm run db:index-check
   ```

3. **Review slow queries** (if profiling enabled)

### After Deployments

1. **Verify migrations**
   ```bash
   npm run db:verify-migration
   ```

2. **Check data consistency**
   ```bash
   npm run db:verify-consistency
   ```

3. **Run diagnostics**
   ```bash
   npm run db:diagnostics
   ```

---

## Emergency Procedures

### Database Connection Issues

1. Check environment variables:
   ```bash
   echo $MONGODB_URI
   ```

2. Verify MongoDB Atlas cluster is running

3. Check IP whitelist settings

4. Test connection:
   ```bash
   npm run db:diagnostics
   ```

### Data Corruption Detected

1. **STOP** - Do not run cleanup scripts immediately

2. **Backup** - Create database snapshot in MongoDB Atlas

3. **Diagnose** - Run all diagnostic scripts:
   ```bash
   npm run db:diagnostics
   npm run db:verify-consistency
   npm run db:index-check
   ```

4. **Document** - Save all output logs

5. **Review** - Analyze the issues before proceeding

6. **Test Fix** - Run cleanup in dry-run mode:
   ```bash
   npm run db:cleanup
   ```

7. **Apply Fix** - If safe, execute cleanup:
   ```bash
   npm run db:cleanup:execute
   ```

8. **Verify** - Re-run diagnostics to confirm fixes

### Performance Degradation

1. **Check slow queries:**
   ```bash
   npm run db:index-check
   ```

2. **Enable MongoDB profiling:**
   ```javascript
   db.setProfilingLevel(1, { slowms: 100 })
   ```

3. **Review collection stats:**
   - Run diagnostics to see collection sizes
   - Check index sizes vs data sizes

4. **Add missing indexes** if identified

5. **Consider archiving old data:**
   - user_events (has 90-day TTL)
   - old leaderboard_snapshots
   - ended tournaments

---

## MongoDB Shell Commands

### Connect to Database

```bash
mongosh "your-mongodb-uri"
```

### Useful Queries

Check collection sizes:
```javascript
db.stats()
db.auctions.stats()
db.predictions.stats()
```

Find active auctions:
```javascript
db.auctions.find({ isActive: true }).count()
```

Check indexes:
```javascript
db.auctions.getIndexes()
```

Enable profiling:
```javascript
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

View slow queries:
```javascript
db.system.profile.find({ millis: { $gt: 100 } }).sort({ millis: -1 }).limit(10)
```

---

## Best Practices

### Before Making Changes

1. ✅ Always run diagnostics first
2. ✅ Use dry-run mode to preview changes
3. ✅ Create database backup in Atlas
4. ✅ Document what you're doing and why
5. ✅ Test in development environment first

### When Running Scripts

1. ✅ Run during low-traffic periods
2. ✅ Monitor application logs during execution
3. ✅ Be ready to rollback if issues occur
4. ✅ Verify changes after completion
5. ✅ Update team on maintenance activities

### Index Management

1. ✅ Add indexes before data grows large
2. ✅ Monitor index usage regularly
3. ✅ Remove unused indexes to save space
4. ✅ Use compound indexes for multi-field queries
5. ✅ Test query performance after index changes

---

## Troubleshooting

### Script Fails to Connect

**Error:** `MONGODB_URI not set`

**Fix:** Create `.env.local` file:
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB URI
```

### Permission Denied

**Error:** `not authorized on hammershift to execute command`

**Fix:** Check your MongoDB user has read/write permissions

### Out of Memory

**Error:** `JavaScript heap out of memory`

**Fix:** Process data in batches or increase Node memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run db:cleanup:execute
```

### Script Hangs

**Issue:** Script runs but doesn't complete

**Fix:**
1. Check MongoDB Atlas cluster is responsive
2. Look for very large collections (millions of docs)
3. Add pagination to script queries
4. Increase script timeout if needed

---

## Support

For additional help:

1. Check this documentation first
2. Run diagnostic scripts to gather information
3. Review MongoDB Atlas logs
4. Contact the development team with:
   - Script output logs
   - Error messages
   - What you were trying to accomplish
   - Current database state (from diagnostics)

---

## Script Reference

| Script | Purpose | Safe to Run | Modifies DB |
|--------|---------|-------------|-------------|
| `db:diagnostics` | Full integrity check | ✅ Yes | ❌ No |
| `db:cleanup` | Preview fixes | ✅ Yes | ❌ No (dry-run) |
| `db:cleanup:execute` | Apply fixes | ⚠️ Caution | ✅ Yes |
| `db:index-check` | Verify indexes | ✅ Yes | ❌ No |
| `db:verify-consistency` | Deep consistency check | ✅ Yes | ❌ No |
| `db:verify-migration` | Check migration status | ✅ Yes | ❌ No |
| `db:check-active` | List active auctions | ✅ Yes | ❌ No |
| `db:migrate` | Run data migration | ⚠️ Caution | ✅ Yes |

---

## Changelog

### 2026-02-27
- Initial database maintenance tools created
- Added comprehensive diagnostics script
- Added cleanup script with dry-run mode
- Added index verification
- Added data consistency checks
- Added migration verification
- Created documentation
