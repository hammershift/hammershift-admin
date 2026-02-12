# Velocity Markets Backend Enhancement Design

**Date:** 2026-02-12
**Author:** Claude Code
**Status:** Approved - Ready for Implementation
**PRD Version:** 2.1
**Scope:** Backend/Admin Only (hammershift-admin repo)

---

## Executive Summary

Comprehensive backend enhancement implementing event tracking, scoring v2, leaderboard snapshots, streak/badge gamification, Customer.io/PostHog integration, and automation via cron jobs. Execution via 6 parallel agent workstreams with rigorous QA.

**Implementation Strategy:** Domain-based parallel execution with 5 independent agents + 1 QA agent.

**Timeline:** 2-3 weeks (parallel execution)

**Test Coverage Target:** 85%+ overall, 90%+ per domain

---

## Architecture Overview

### Execution Strategy

| Agent | Domain | Deliverables | Dependencies |
|-------|--------|--------------|--------------|
| **1. Data Models** | Schema extensions + new collections | 5 new models, 4 extended models | None (independent) |
| **2. Event & Scoring** | Event tracking, scoring v2, tournament compute v2 | 4 API routes, scoring engine | User, Prediction, Streak models |
| **3. Leaderboard & Gamification** | Snapshots, streaks, badges | 3 API routes, utilities | Prediction, Streak, Badge models |
| **4. Lifecycle & Integration** | Customer.io, PostHog, webhooks | Integration layer, webhook routes | user_events model |
| **5. Automation & Cron** | Scheduled jobs, cleanup | 5 cron jobs, vercel.json config | All models + event system |
| **6. QA & Integration** | Full test suite, E2E scenarios | Test suite, coverage report | Runs AFTER agents 1-5 |

---

## Agent 1: Data Models Layer

### Model Extensions

#### User Model (`src/app/models/user.model.ts`)

**Add fields:**
```typescript
current_streak: { type: Number, default: 0 }
longest_streak: { type: Number, default: 0 }
last_prediction_at: { type: Date, required: false }
rank_title: {
  type: String,
  enum: ['Rookie', 'Rising Star', 'Expert', 'Legend'],
  default: 'Rookie'
}
total_points: { type: Number, default: 0, indexed: true }
email_preferences: {
  marketing: { type: Boolean, default: true },
  digests: { type: Boolean, default: true },
  tournaments: { type: Boolean, default: true },
  results: { type: Boolean, default: true }
}
```

**Add indexes:**
```typescript
userSchema.index({ total_points: -1 }); // For leaderboard queries
userSchema.index({ last_prediction_at: -1 }); // For inactive user detection
```

#### Auction Model (`src/app/models/auction.model.ts`)

**Add fields:**
```typescript
prediction_count: { type: Number, default: 0 }
avg_predicted_price: { type: Number, required: false }
source_badge: { type: String, enum: ['bat', 'cab'], default: 'bat' }
status_display: { type: String, required: false } // Derived from attributes[14].value
```

**Add indexes:**
```typescript
auctionSchema.index({ prediction_count: -1 }); // For "most predicted" queries
auctionSchema.index({ status_display: 1, end_time: 1 }); // For stale auction detection
```

#### Tournament Model (`src/app/models/tournament.model.ts`)

**Add fields:**
```typescript
scoring_version: { type: String, enum: ['v1', 'v2'], default: 'v2' }
// Note: maxUsers, description, banner already exist!
```

#### Prediction Model (`src/app/models/prediction.model.ts`)

**Add fields:**
```typescript
score: { type: Number, required: false }
rank: { type: Number, required: false }
delta_from_actual: { type: Number, required: false }
scored_at: { type: Date, required: false }
bonus_modifiers: {
  early_bird: { type: Boolean, default: false },
  streak_bonus: { type: Boolean, default: false },
  bullseye: { type: Boolean, default: false },
  tournament_multiplier: { type: Boolean, default: false }
}
// Note: tournament_id already exists!
```

**Add indexes:**
```typescript
predictionsSchema.index({ score: -1 }); // For leaderboard aggregation
predictionsSchema.index({ scored_at: -1 }); // For result queries
```

### New Collections

#### user_events (`src/app/models/userEvent.model.ts`)

```typescript
const userEventSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, indexed: true },
  event_type: { type: String, required: true, indexed: true },
  event_data: { type: Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
}, {
  collection: 'user_events',
  timestamps: false
});

// TTL index - auto-delete after 90 days
userEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for efficient queries
userEventSchema.index({ user_id: 1, event_type: 1, created_at: -1 });
```

#### leaderboard_snapshots (`src/app/models/leaderboardSnapshot.model.ts`)

```typescript
const leaderboardSnapshotSchema = new Schema({
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'alltime'],
    required: true,
    indexed: true
  },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true },
  score: { type: Number, required: true },
  accuracy_pct: { type: Number, min: 0, max: 100 },
  predictions_count: { type: Number, default: 0 },
  snapshot_at: { type: Date, default: Date.now }
}, {
  collection: 'leaderboard_snapshots',
  timestamps: false
});

// Compound indexes
leaderboardSnapshotSchema.index({ period: 1, rank: 1 });
leaderboardSnapshotSchema.index({ period: 1, user_id: 1 });
leaderboardSnapshotSchema.index({ period: 1, snapshot_at: -1 });
```

#### streaks (`src/app/models/streak.model.ts`)

```typescript
const streakSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  last_prediction_date: { type: Date, required: false }, // UTC date only
  freeze_tokens: { type: Number, default: 0 }
}, {
  collection: 'streaks',
  timestamps: true
});

streakSchema.index({ user_id: 1 }, { unique: true });
```

#### badges (`src/app/models/badge.model.ts`)

```typescript
const badgeSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, indexed: true },
  badge_type: {
    type: String,
    enum: [
      'first_prediction', 'first_win', 'hot_start', 'on_fire',
      'unstoppable', 'legend', 'tournament_rookie', 'tournament_champion',
      'sharpshooter', 'centurion', 'top_10'
    ],
    required: true
  },
  earned_at: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
}, {
  collection: 'badges',
  timestamps: false
});

// Prevent duplicate badges
badgeSchema.index({ user_id: 1, badge_type: 1 }, { unique: true });
badgeSchema.index({ earned_at: -1 });
```

#### email_logs (`src/app/models/emailLog.model.ts`)

```typescript
const emailLogSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, indexed: true },
  campaign_id: { type: String, required: false },
  email_type: {
    type: String,
    enum: ['welcome', 'confirmation', 'result', 'digest', 'reminder', 'reactivation'],
    required: true
  },
  sent_at: { type: Date, required: true },
  opened_at: { type: Date, required: false },
  clicked_at: { type: Date, required: false },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
    default: 'sent'
  }
}, {
  collection: 'email_logs',
  timestamps: false
});

emailLogSchema.index({ user_id: 1, sent_at: -1 });
emailLogSchema.index({ campaign_id: 1 });
```

### Testing Requirements

- Unit tests for schema validation (valid/invalid data)
- Index verification (ensure all indexes created)
- Migration script for existing documents (add default values)
- Backward compatibility tests (existing queries work)

---

## Agent 2: Event & Scoring Systems

### Event Tracking API

#### POST /api/events/track (`src/app/api/events/track/route.ts`)

**Authentication:** NextAuth session required
**Rate Limit:** STANDARD preset (60 req/min)

**Request:**
```typescript
{
  event_type: string;
  event_data: object;
}
```

**Process:**
1. Validate session via `getServerSession(authOptions)`
2. Create UserEvent document in MongoDB
3. Fire async (non-blocking) calls:
   - Customer.io Track API
   - PostHog Capture API
4. Return 201 immediately
5. Log external API failures to Sentry (don't fail request)
6. Create audit log entry

**Implementation:**
```typescript
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import UserEvents from '@/app/models/userEvent.model';
import { trackCustomerIOEvent } from '@/app/lib/customerio';
import { capturePostHogEvent } from '@/app/lib/posthog';
import { auditLog } from '@/app/lib/auditLogger';

export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_type, event_data } = await req.json();

    // Save to MongoDB
    const event = await UserEvents.create({
      user_id: session.user.id,
      event_type,
      event_data,
      created_at: new Date()
    });

    // Fire external integrations (non-blocking)
    Promise.allSettled([
      trackCustomerIOEvent(session.user.id, event_type, event_data),
      capturePostHogEvent(session.user.id, event_type, event_data)
    ]).catch(err => console.error('External tracking failed:', err));

    // Audit log
    await auditLog('event_tracked', session.user.id, { event_type });

    return NextResponse.json({ success: true, event_id: event._id }, { status: 201 });
  }
);
```

### Core Event Triggers

| Event | Trigger Location | Implementation |
|-------|-----------------|----------------|
| `prediction_made` | POST /api/predictions | Add `await trackEvent(userId, 'prediction_made', {...})` after prediction saved |
| `tournament_joined` | Tournament user addition | Add to existing join logic |
| `prediction_scored` | After scoring engine runs | Fire from `scorePrediction()` function |
| `streak_updated` | After streak calculation | Fire from `updateStreak()` function |

### Scoring v2 Engine

#### Scoring Engine Utility (`src/app/lib/scoringEngine.ts`)

```typescript
import { ObjectId } from 'mongoose';
import Predictions from '@/app/models/prediction.model';
import Auctions from '@/app/models/auction.model';
import Streaks from '@/app/models/streak.model';
import { checkAndAwardBadges } from './badgeChecker';
import { trackEvent } from './eventTracking';

interface BonusModifiers {
  early_bird: boolean;
  streak_bonus: boolean;
  bullseye: boolean;
  tournament_multiplier: boolean;
}

interface ScoringResult {
  score: number;
  delta: number;
  rank: number | null;
  modifiers: BonusModifiers;
}

/**
 * Calculate base score using v2 formula
 */
function calculateBaseScore(predictedPrice: number, actualPrice: number): number {
  if (actualPrice <= 0) return 0;

  const percentageOff = Math.abs(predictedPrice - actualPrice) / actualPrice;
  return Math.max(0, Math.round(1000 * (1 - percentageOff)));
}

/**
 * Check bonus conditions
 */
async function checkBonusConditions(
  prediction: any,
  auction: any
): Promise<BonusModifiers> {
  const modifiers: BonusModifiers = {
    early_bird: false,
    streak_bonus: false,
    bullseye: false,
    tournament_multiplier: false
  };

  // Early bird: > 48h before auction end
  const hoursBefore = (auction.end_time - prediction.createdAt) / (1000 * 60 * 60);
  modifiers.early_bird = hoursBefore > 48;

  // Streak bonus: user has streak >= 5
  const streak = await Streaks.findOne({ user_id: prediction.user.userId });
  modifiers.streak_bonus = (streak?.current_streak || 0) >= 5;

  // Bullseye: within 1% of actual
  const percentageOff = Math.abs(prediction.predictedPrice - actualPrice) / actualPrice;
  modifiers.bullseye = percentageOff <= 0.01;

  // Tournament multiplier: in a tournament
  modifiers.tournament_multiplier = !!prediction.tournament_id;

  return modifiers;
}

/**
 * Apply bonus points and multipliers
 */
function applyBonuses(baseScore: number, modifiers: BonusModifiers): number {
  let finalScore = baseScore;
  let bonusPoints = 0;

  if (modifiers.early_bird) bonusPoints += 50;
  if (modifiers.streak_bonus) bonusPoints += 25;
  if (modifiers.bullseye) bonusPoints += 200;

  if (modifiers.tournament_multiplier) {
    finalScore = Math.round(finalScore * 1.5);
  }

  return finalScore + bonusPoints;
}

/**
 * Score a single prediction
 */
export async function scorePrediction(
  predictionId: ObjectId,
  actualPrice: number
): Promise<ScoringResult> {
  // 1. Fetch prediction with related data
  const prediction = await Predictions.findById(predictionId);
  if (!prediction) {
    throw new Error(`Prediction ${predictionId} not found`);
  }

  const auction = await Auctions.findById(prediction.auction_id);
  if (!auction) {
    throw new Error(`Auction ${prediction.auction_id} not found`);
  }

  // 2. Calculate base score
  const baseScore = calculateBaseScore(prediction.predictedPrice, actualPrice);

  // 3. Check bonus conditions
  const modifiers = await checkBonusConditions(prediction, auction);

  // 4. Apply bonuses
  const finalScore = applyBonuses(baseScore, modifiers);

  // 5. Calculate delta
  const delta = Math.abs(prediction.predictedPrice - actualPrice);

  // 6. Update prediction document
  await Predictions.updateOne(
    { _id: predictionId },
    {
      $set: {
        score: finalScore,
        delta_from_actual: delta,
        scored_at: new Date(),
        bonus_modifiers: modifiers
      }
    }
  );

  // 7. Fire prediction_scored event
  await trackEvent(prediction.user.userId, 'prediction_scored', {
    prediction_id: predictionId,
    score: finalScore,
    delta,
    modifiers
  });

  // 8. Check/award badges
  await checkAndAwardBadges(prediction.user.userId, {
    event_type: 'prediction_scored',
    data: { score: finalScore }
  });

  return {
    score: finalScore,
    delta,
    rank: null, // Assigned during tournament compute
    modifiers
  };
}

/**
 * Score all predictions for an auction
 */
export async function scoreAuctionPredictions(
  auctionId: ObjectId,
  hammerPrice: number
): Promise<number> {
  const predictions = await Predictions.find({
    auction_id: auctionId,
    isActive: true
  });

  let scoredCount = 0;

  for (const prediction of predictions) {
    try {
      await scorePrediction(prediction._id, hammerPrice);
      scoredCount++;
    } catch (error) {
      console.error(`Failed to score prediction ${prediction._id}:`, error);
      // Continue scoring others
    }
  }

  return scoredCount;
}
```

### Tournament Compute v2

#### Extend existing route: `src/app/api/tournaments/[tournament_id]/compute/route.ts`

**Changes:**
1. Check `tournament.scoring_version` at start of PUT handler
2. If `v1`: use existing algorithm (lines 111-241) - **DO NOT MODIFY**
3. If `v2`: use new scoring engine
4. Both versions share prize distribution logic

**Implementation (v2 path only):**
```typescript
// Add after line 105 (after checking all auctions ended)

if (tournament.scoring_version === 'v2') {
  // V2 SCORING PATH

  // Score all predictions using v2 engine
  for (const auctionId of tournament.auction_ids) {
    const auction = auctionMap.get(auctionId);
    if (!auction || auction.attributes[14].value === 3) continue; // Skip unsuccessful

    const hammerPrice = auction.attributes[0].value;
    await scoreAuctionPredictions(auctionId, hammerPrice);
  }

  // Aggregate scores per user
  const userScores = await Predictions.aggregate([
    {
      $match: {
        tournament_id: tournament._id,
        score: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$user.userId',
        total_score: { $sum: '$score' },
        fullName: { $first: '$user.fullName' },
        username: { $first: '$user.username' },
        role: { $first: '$user.role' }
      }
    },
    { $sort: { total_score: -1 } }
  ]);

  // Assign ranks and distribute prizes
  const pot = 10 * tournament.auction_ids.length; // Free tournament
  const distribution = [50, 30, 20];

  for (let i = 0; i < Math.min(userScores.length, 3); i++) {
    const user = userScores[i];
    const rank = i + 1;
    const points = (pot * (distribution[i] / 100));

    await Points.create({
      refId: tournament._id,
      refCollection: 'tournaments',
      points,
      rank,
      user: {
        userId: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      }
    });

    // Update tournament.users
    const userIndex = tournament.users.findIndex(u => u.userId.equals(user._id));
    if (userIndex >= 0) {
      tournament.users[userIndex].points = points;
      tournament.users[userIndex].rank = rank;
    }
  }

  tournament.haveWinners = true;
  await tournament.save();

  // Deactivate predictions
  await Predictions.updateMany(
    { tournament_id: tournament._id, isActive: true },
    { $set: { isActive: false } }
  );

  return NextResponse.json({
    data: tournament,
    message: `Tournament scored using v2 algorithm`
  }, { status: 201 });
}

// Otherwise fall through to existing v1 logic...
```

### Testing Requirements

- Unit tests: scoring formula edge cases (0%, 50%, 100%+, negative)
- Unit tests: bonus modifier conditions
- Integration tests: event tracking → external APIs (mocked)
- Integration tests: tournament v1 vs v2 comparison
- Performance tests: score 1000 predictions < 10s

---

## Agent 3: Leaderboard & Gamification

### Leaderboard API

#### GET /api/leaderboard (`src/app/api/leaderboard/route.ts`)

**Query Parameters:**
- `period`: weekly | monthly | alltime (default: weekly)
- `limit`: number (default: 100, max: 1000)
- `userId`: ObjectId (optional - get user's position)

**Rate Limit:** READONLY preset

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import LeaderboardSnapshots from '@/app/models/leaderboardSnapshot.model';
import { getServerSession } from 'next-auth';

export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'weekly';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const userId = searchParams.get('userId');

    // Get latest snapshot for period
    const latestSnapshot = await LeaderboardSnapshots.findOne({ period })
      .sort({ snapshot_at: -1 });

    if (!latestSnapshot) {
      return NextResponse.json({
        leaderboard: [],
        message: 'No snapshot available yet'
      });
    }

    // Get top N users from latest snapshot
    const leaderboard = await LeaderboardSnapshots.find({
      period,
      snapshot_at: latestSnapshot.snapshot_at
    })
      .sort({ rank: 1 })
      .limit(limit)
      .populate('user_id', 'username fullName');

    // If userId provided, get their position
    let userPosition = null;
    if (userId) {
      userPosition = await LeaderboardSnapshots.findOne({
        period,
        user_id: userId,
        snapshot_at: latestSnapshot.snapshot_at
      });
    }

    return NextResponse.json({
      leaderboard,
      user_position: userPosition,
      snapshot_at: latestSnapshot.snapshot_at,
      period
    });
  }
);
```

#### POST /api/leaderboard/refresh (`src/app/api/leaderboard/refresh/route.ts`)

**Authentication:** Admin OR cron secret
**Query Parameters:** `period` (weekly | monthly | alltime)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import { verifyCronRequest } from '@/app/lib/cronAuth';
import LeaderboardSnapshots from '@/app/models/leaderboardSnapshot.model';
import Predictions from '@/app/models/prediction.model';

export async function POST(req: NextRequest) {
  // Auth: admin or cron
  const session = await getServerSession(authOptions);
  const isCron = verifyCronRequest(req);

  if (!isCron && session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'weekly';

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'alltime':
      startDate = new Date(0); // Beginning of time
      break;
    default:
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  // Aggregate predictions
  const results = await Predictions.aggregate([
    {
      $match: {
        scored_at: { $gte: startDate },
        score: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$user.userId',
        total_score: { $sum: '$score' },
        predictions_count: { $sum: 1 },
        high_accuracy_count: {
          $sum: { $cond: [{ $gte: ['$score', 800] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        user_id: '$_id',
        score: '$total_score',
        predictions_count: 1,
        accuracy_pct: {
          $multiply: [
            { $divide: ['$high_accuracy_count', '$predictions_count'] },
            100
          ]
        }
      }
    },
    { $sort: { score: -1 } },
    { $limit: 10000 } // Process max 10k users
  ]);

  // Delete old snapshots for this period
  await LeaderboardSnapshots.deleteMany({ period });

  // Create new snapshots
  const snapshotDocs = results.map((result, index) => ({
    period,
    user_id: result.user_id,
    rank: index + 1,
    score: result.score,
    accuracy_pct: Math.round(result.accuracy_pct),
    predictions_count: result.predictions_count,
    snapshot_at: now
  }));

  await LeaderboardSnapshots.insertMany(snapshotDocs);

  return NextResponse.json({
    message: `Leaderboard refreshed for ${period}`,
    users_ranked: snapshotDocs.length,
    top_score: snapshotDocs[0]?.score || 0,
    snapshot_at: now
  }, { status: 200 });
}
```

### Streak System

#### Streak Manager Utility (`src/app/lib/streakManager.ts`)

```typescript
import { ObjectId } from 'mongoose';
import Streaks from '@/app/models/streak.model';
import Users from '@/app/models/user.model';
import { checkAndAwardBadges } from './badgeChecker';
import { trackEvent } from './eventTracking';

interface StreakResult {
  streak: number;
  updated: boolean;
  milestone_reached: boolean;
}

/**
 * Calculate days between two dates (UTC, date-only comparison)
 */
function dateDiffInDays(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Update user's streak after making a prediction
 */
export async function updateStreak(userId: ObjectId): Promise<StreakResult> {
  // Get or create streak document
  let streak = await Streaks.findOne({ user_id: userId });

  if (!streak) {
    streak = await Streaks.create({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_prediction_date: null,
      freeze_tokens: 0
    });
  }

  // Get today's date (UTC, date-only)
  const today = new Date().toISOString().split('T')[0];
  const lastDate = streak.last_prediction_date?.toISOString().split('T')[0];

  let wasUpdated = false;
  let milestoneReached = false;

  if (!lastDate) {
    // First ever prediction
    streak.current_streak = 1;
    streak.longest_streak = 1;
    wasUpdated = true;
  } else if (lastDate === today) {
    // Already predicted today - no change
    return {
      streak: streak.current_streak,
      updated: false,
      milestone_reached: false
    };
  } else {
    const daysSince = dateDiffInDays(lastDate, today);

    if (daysSince === 1) {
      // Consecutive day - increment
      streak.current_streak++;
      if (streak.current_streak > streak.longest_streak) {
        streak.longest_streak = streak.current_streak;
      }
      wasUpdated = true;
    } else if (daysSince > 1) {
      // Gap detected
      if (streak.freeze_tokens > 0) {
        // Use freeze token - preserve streak
        streak.freeze_tokens--;
        wasUpdated = true;
      } else {
        // Streak broken
        streak.current_streak = 1;
        wasUpdated = true;
      }
    }
  }

  // Update last prediction date
  streak.last_prediction_date = new Date(today);
  await streak.save();

  // Check for milestone badges
  const milestones = [3, 7, 14, 30];
  if (milestones.includes(streak.current_streak)) {
    milestoneReached = true;

    // Award freeze tokens at certain milestones
    if (streak.current_streak === 7) {
      streak.freeze_tokens += 1;
      await streak.save();
    }
    if (streak.current_streak === 30) {
      streak.freeze_tokens += 3;
      await streak.save();
    }

    await checkAndAwardBadges(userId, {
      event_type: 'streak_milestone',
      data: { streak: streak.current_streak }
    });
  }

  // Fire streak_updated event
  if (wasUpdated) {
    await trackEvent(userId, 'streak_updated', {
      current_streak: streak.current_streak,
      is_new_high: streak.current_streak === streak.longest_streak,
      milestone_reached: milestoneReached
    });
  }

  // Sync to user model
  await Users.updateOne(
    { _id: userId },
    {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_prediction_at: new Date()
    }
  );

  return {
    streak: streak.current_streak,
    updated: wasUpdated,
    milestone_reached: milestoneReached
  };
}

/**
 * Get streak status for a user
 */
export async function getStreak(userId: ObjectId) {
  const streak = await Streaks.findOne({ user_id: userId });

  if (!streak) {
    return {
      current_streak: 0,
      longest_streak: 0,
      freeze_tokens: 0,
      at_risk: false
    };
  }

  // Check if streak is at risk (no prediction today yet)
  const today = new Date().toISOString().split('T')[0];
  const lastDate = streak.last_prediction_date?.toISOString().split('T')[0];

  return {
    current_streak: streak.current_streak,
    longest_streak: streak.longest_streak,
    freeze_tokens: streak.freeze_tokens,
    at_risk: lastDate !== today && streak.current_streak > 0
  };
}
```

**Integration:** Call `updateStreak(userId)` after every `prediction_made` event.

### Badge System

#### Badge Checker Utility (`src/app/lib/badgeChecker.ts`)

```typescript
import { ObjectId } from 'mongoose';
import Badges from '@/app/models/badge.model';
import Predictions from '@/app/models/prediction.model';
import Streaks from '@/app/models/streak.model';
import Users from '@/app/models/user.model';
import { trackEvent } from './eventTracking';

interface BadgeDefinition {
  type: string;
  condition: (userId: ObjectId, context?: any) => Promise<boolean>;
  points_bonus: number;
  metadata?: (userId: ObjectId, context?: any) => Promise<object>;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: 'first_prediction',
    condition: async (userId) => {
      const count = await Predictions.countDocuments({ 'user.userId': userId });
      return count === 1;
    },
    points_bonus: 50
  },
  {
    type: 'first_win',
    condition: async (userId) => {
      const wins = await Predictions.countDocuments({
        'user.userId': userId,
        score: { $gte: 900 }
      });
      return wins === 1;
    },
    points_bonus: 100
  },
  {
    type: 'hot_start',
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 3;
    },
    points_bonus: 25,
    metadata: async () => ({ streak_days: 3 })
  },
  {
    type: 'on_fire',
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 7;
    },
    points_bonus: 50,
    metadata: async () => ({ streak_days: 7, freeze_tokens_awarded: 1 })
  },
  {
    type: 'unstoppable',
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 14;
    },
    points_bonus: 100,
    metadata: async () => ({ streak_days: 14 })
  },
  {
    type: 'legend',
    condition: async (userId) => {
      const streak = await Streaks.findOne({ user_id: userId });
      return streak?.current_streak === 30;
    },
    points_bonus: 200,
    metadata: async () => ({ streak_days: 30, freeze_tokens_awarded: 3 })
  },
  {
    type: 'sharpshooter',
    condition: async (userId) => {
      const highScores = await Predictions.countDocuments({
        'user.userId': userId,
        score: { $gte: 900 }
      });
      return highScores === 5;
    },
    points_bonus: 200
  },
  {
    type: 'centurion',
    condition: async (userId) => {
      const total = await Predictions.countDocuments({ 'user.userId': userId });
      return total === 100;
    },
    points_bonus: 300
  }
  // Add more badge definitions as needed
];

/**
 * Check and award badges for a user based on event context
 */
export async function checkAndAwardBadges(
  userId: ObjectId,
  context?: { event_type: string; data: any }
): Promise<any[]> {
  const newBadges: any[] = [];

  for (const def of BADGE_DEFINITIONS) {
    // Check if badge already awarded
    const existing = await Badges.findOne({
      user_id: userId,
      badge_type: def.type
    });

    if (existing) continue; // Already has this badge

    // Check condition
    const qualifies = await def.condition(userId, context);

    if (qualifies) {
      // Get metadata if function provided
      const metadata = def.metadata
        ? await def.metadata(userId, context)
        : {};

      // Award badge
      const badge = await Badges.create({
        user_id: userId,
        badge_type: def.type,
        earned_at: new Date(),
        metadata
      });

      // Award points bonus
      await Users.updateOne(
        { _id: userId },
        { $inc: { total_points: def.points_bonus } }
      );

      // Fire badge_earned event
      await trackEvent(userId, 'badge_earned', {
        badge_type: def.type,
        points_bonus: def.points_bonus,
        metadata
      });

      newBadges.push(badge);
    }
  }

  return newBadges;
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: ObjectId) {
  return Badges.find({ user_id: userId }).sort({ earned_at: -1 });
}
```

### Additional API Routes

#### GET /api/users/[userId]/badges
- Returns all badges earned by user
- Public endpoint (no auth required for viewing)

#### GET /api/users/[userId]/streak
- Returns current streak status
- Includes at_risk flag

#### GET /api/users/[userId]/stats
- Aggregated user stats (predictions count, accuracy, rank, badges, streak)
- Cached for 5 minutes

### Testing Requirements

- Leaderboard aggregation accuracy (verify math)
- Streak edge cases (timezone boundaries, freeze tokens, leap years)
- Badge award logic (no duplicates, conditions correct)
- Performance: leaderboard refresh with 10k users < 30s
- Race conditions: concurrent predictions

---

## Agent 4: Lifecycle & Integration

### Customer.io Integration

#### Configuration Utility (`src/app/lib/customerio.ts`)

```typescript
import axios from 'axios';

const CUSTOMERIO_API_BASE = 'https://track.customer.io/api/v2';
const CUSTOMERIO_TRACK_KEY = process.env.CUSTOMERIO_SITE_ID;
const CUSTOMERIO_TRACK_SECRET = process.env.CUSTOMERIO_API_KEY;

/**
 * Track an event in Customer.io
 */
export async function trackCustomerIOEvent(
  userId: string,
  eventName: string,
  eventData: object
): Promise<void> {
  if (!CUSTOMERIO_TRACK_KEY || !CUSTOMERIO_TRACK_SECRET) {
    console.warn('Customer.io credentials not configured');
    return;
  }

  try {
    await axios.post(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        type: 'event',
        name: eventName,
        data: eventData,
        identifiers: { id: userId }
      },
      {
        auth: {
          username: CUSTOMERIO_TRACK_KEY,
          password: CUSTOMERIO_TRACK_SECRET
        },
        timeout: 5000
      }
    );
  } catch (error) {
    console.error('Customer.io tracking failed:', error);
    // Log to Sentry in production
  }
}

/**
 * Identify/update a user in Customer.io
 */
export async function identifyUser(
  userId: string,
  attributes: {
    email: string;
    username: string;
    created_at: number;
    total_points?: number;
    current_streak?: number;
    rank_title?: string;
  }
): Promise<void> {
  if (!CUSTOMERIO_TRACK_KEY || !CUSTOMERIO_TRACK_SECRET) {
    console.warn('Customer.io credentials not configured');
    return;
  }

  try {
    await axios.put(
      `${CUSTOMERIO_API_BASE}/entity`,
      {
        type: 'person',
        identifiers: { id: userId },
        attributes
      },
      {
        auth: {
          username: CUSTOMERIO_TRACK_KEY,
          password: CUSTOMERIO_TRACK_SECRET
        }
      }
    );
  } catch (error) {
    console.error('Customer.io identify failed:', error);
  }
}
```

**Usage:**
- Call `identifyUser()` on signup
- Call `trackCustomerIOEvent()` from event tracking route

### PostHog Integration

#### Configuration Utility (`src/app/lib/posthog.ts`)

```typescript
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.warn('PostHog API key not configured');
      // Return mock client for development
      return {
        capture: () => {},
        shutdown: async () => {}
      } as any;
    }

    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10000
    });
  }

  return posthogClient;
}

export async function capturePostHogEvent(
  userId: string,
  eventName: string,
  properties: object
): Promise<void> {
  try {
    const client = getPostHogClient();
    client.capture({
      distinctId: userId,
      event: eventName,
      properties
    });
  } catch (error) {
    console.error('PostHog capture failed:', error);
  }
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
```

**Install dependency:**
```bash
npm install posthog-node
```

### Email Webhook Handler

#### POST /api/webhooks/customerio (`src/app/api/webhooks/customerio/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import EmailLogs from '@/app/models/emailLog.model';

/**
 * Verify Customer.io webhook signature
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.CUSTOMERIO_WEBHOOK_SECRET;

  if (!secret) {
    console.error('CUSTOMERIO_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Get signature from header
  const signature = req.headers.get('x-cio-signature') || '';
  const body = await req.text();

  // Verify signature
  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle different event types
  switch (event.event_type) {
    case 'email_sent':
      await EmailLogs.create({
        user_id: event.data.recipient_id,
        campaign_id: event.data.campaign_id,
        email_type: determineEmailType(event.data.campaign_id),
        sent_at: new Date(event.timestamp * 1000),
        status: 'sent'
      });
      break;

    case 'email_delivered':
      await EmailLogs.updateOne(
        { campaign_id: event.data.campaign_id, user_id: event.data.recipient_id },
        { $set: { status: 'delivered' } }
      );
      break;

    case 'email_opened':
      await EmailLogs.updateOne(
        { campaign_id: event.data.campaign_id, user_id: event.data.recipient_id },
        {
          $set: {
            status: 'opened',
            opened_at: new Date(event.timestamp * 1000)
          }
        }
      );
      break;

    case 'email_clicked':
      await EmailLogs.updateOne(
        { campaign_id: event.data.campaign_id, user_id: event.data.recipient_id },
        {
          $set: {
            status: 'clicked',
            clicked_at: new Date(event.timestamp * 1000)
          }
        }
      );
      break;

    case 'email_bounced':
    case 'email_failed':
      await EmailLogs.updateOne(
        { campaign_id: event.data.campaign_id, user_id: event.data.recipient_id },
        { $set: { status: event.event_type.replace('email_', '') } }
      );
      break;
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

function determineEmailType(campaignId: string): string {
  // Map campaign IDs to email types
  // This should be updated as campaigns are created in Customer.io
  const mapping: Record<string, string> = {
    'welcome_d0': 'welcome',
    'welcome_d2': 'welcome',
    'welcome_d5': 'welcome',
    'prediction_confirmation': 'confirmation',
    'prediction_result': 'result',
    'weekly_digest': 'digest',
    'auction_reminder': 'reminder',
    'reactivation_d7': 'reactivation',
    'reactivation_d14': 'reactivation'
  };

  return mapping[campaignId] || 'unknown';
}
```

### Event → Campaign Mapping

| Event | Customer.io Campaign | Trigger Condition |
|-------|---------------------|------------------|
| `signup_completed` | Welcome Series | Always (3 emails: D0, D2, D5) |
| `prediction_made` (first) | Prediction Confirmation | Once per prediction |
| `prediction_scored` | Result Email | Once per prediction |
| `tournament_joined` | Tournament Confirmation | Once per tournament |
| `streak_updated` (milestone) | Streak Milestone | streak >= 7 |
| `user_inactive` (7d) | Reactivation D7 | Once per inactive period |
| `user_inactive` (14d) | Reactivation D14 | Once per inactive period |

**Customer.io Campaign Setup (manual):**
- Create campaigns in Customer.io dashboard
- Configure trigger events
- Set frequency caps
- Add email templates with liquid variables
- Respect `user.email_preferences`

### Environment Variables

Add to `.env.local` and production:
```env
CUSTOMERIO_SITE_ID=your_site_id
CUSTOMERIO_API_KEY=your_api_key
CUSTOMERIO_WEBHOOK_SECRET=your_webhook_secret
POSTHOG_API_KEY=your_project_key
POSTHOG_HOST=https://app.posthog.com
```

### Testing Requirements

- Mock Customer.io/PostHog API calls
- Webhook signature verification tests
- Email log creation/update tests
- Event → campaign mapping tests
- Frequency cap tests

---

## Agent 5: Automation & Cron

### Cron Configuration

#### vercel.json

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

### Cron Auth Middleware

#### src/app/lib/cronAuth.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function verifyCronRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not set - cron endpoints unprotected');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (!verifyCronRequest(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid cron secret' },
        { status: 401 }
      );
    }
    return handler(req);
  };
}
```

### Cron Job 1: Leaderboard Refresh

#### GET /api/cron/leaderboard-refresh

Calls existing `/api/leaderboard/refresh` for weekly, monthly, alltime periods.

```typescript
import { withCronAuth } from '@/app/lib/cronAuth';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withCronAuth(async (req: NextRequest) => {
  const results = [];

  // Refresh all periods
  for (const period of ['weekly', 'monthly', 'alltime']) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/leaderboard/refresh?period=${period}`,
        {
          method: 'POST',
          headers: {
            'authorization': req.headers.get('authorization') || ''
          }
        }
      );

      const data = await response.json();
      results.push({ period, ...data });
    } catch (error) {
      results.push({ period, error: error.message });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
});
```

### Cron Job 2: Weekly Digest

#### GET /api/cron/weekly-digest

```typescript
import { withCronAuth } from '@/app/lib/cronAuth';
import Users from '@/app/models/user.model';
import { identifyUser, trackCustomerIOEvent } from '@/app/lib/customerio';

export const GET = withCronAuth(async (req: NextRequest) => {
  // Find active users with digest preference enabled
  const users = await Users.find({
    last_prediction_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    'email_preferences.digests': true
  }).limit(1000); // Batch size

  let triggered = 0;

  for (const user of users) {
    // Update user attributes in Customer.io
    await identifyUser(user._id.toString(), {
      email: user.email,
      username: user.username,
      created_at: user.createdAt.getTime() / 1000,
      total_points: user.total_points,
      current_streak: user.current_streak,
      rank_title: user.rank_title
    });

    // Fire weekly_digest_triggered event
    await trackCustomerIOEvent(user._id.toString(), 'weekly_digest_triggered', {
      user_id: user._id.toString()
    });

    triggered++;
  }

  return NextResponse.json({
    message: 'Weekly digest triggered',
    users_triggered: triggered
  }, { status: 200 });
});
```

### Cron Job 3: Inactive User Detection

#### GET /api/cron/inactive-users

```typescript
import { withCronAuth } from '@/app/lib/cronAuth';
import Users from '@/app/models/user.model';
import { trackCustomerIOEvent } from '@/app/lib/customerio';

export const GET = withCronAuth(async (req: NextRequest) => {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d8 = new Date(now - 8 * 24 * 60 * 60 * 1000);
  const d14 = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const d15 = new Date(now - 15 * 24 * 60 * 60 * 1000);

  // Find D7 inactive users
  const d7Users = await Users.find({
    last_prediction_at: { $lt: d7, $gte: d8 }
  });

  for (const user of d7Users) {
    await trackCustomerIOEvent(user._id.toString(), 'user_inactive', {
      days_inactive: 7
    });
  }

  // Find D14 inactive users
  const d14Users = await Users.find({
    last_prediction_at: { $lt: d14, $gte: d15 }
  });

  for (const user of d14Users) {
    await trackCustomerIOEvent(user._id.toString(), 'user_inactive', {
      days_inactive: 14
    });
  }

  return NextResponse.json({
    d7_inactive: d7Users.length,
    d14_inactive: d14Users.length
  }, { status: 200 });
});
```

### Cron Job 4: Stale Auction Cleanup

#### GET /api/cron/stale-auctions

```typescript
import { withCronAuth } from '@/app/lib/cronAuth';
import Auctions from '@/app/models/auction.model';
import { scoreAuctionPredictions } from '@/app/lib/scoringEngine';
import { trackEvent } from '@/app/lib/eventTracking';

export const GET = withCronAuth(async (req: NextRequest) => {
  // Find auctions that ended but haven't been scored
  const staleAuctions = await Auctions.find({
    end_time: { $lt: new Date() },
    status_display: 'active'
  });

  let auctionsClosed = 0;
  let predictionsScored = 0;

  for (const auction of staleAuctions) {
    // Check if hammer price exists
    const hammerPrice = auction.attributes[0]?.value;

    if (hammerPrice && hammerPrice > 0) {
      // Score all predictions
      const scored = await scoreAuctionPredictions(auction._id, hammerPrice);
      predictionsScored += scored;

      // Update auction status
      await Auctions.updateOne(
        { _id: auction._id },
        { $set: { status_display: 'closed' } }
      );

      // Fire auction_closed event
      // (This will be picked up by event tracking)

      auctionsClosed++;
    } else {
      // No hammer price yet - check if > 48h past end
      const hoursPast = (Date.now() - auction.end_time.getTime()) / (1000 * 60 * 60);

      if (hoursPast > 48) {
        // Mark as unsuccessful or alert admin
        await Auctions.updateOne(
          { _id: auction._id },
          { $set: { status_display: 'unsuccessful' } }
        );
      }
    }
  }

  return NextResponse.json({
    auctions_closed: auctionsClosed,
    predictions_scored: predictionsScored
  }, { status: 200 });
});
```

### Cron Job 5: Auction Ending Reminders

#### GET /api/cron/auction-reminders

```typescript
import { withCronAuth } from '@/app/lib/cronAuth';
import Auctions from '@/app/models/auction.model';
import UserEvents from '@/app/models/userEvent.model';
import Predictions from '@/app/models/prediction.model';
import EmailLogs from '@/app/models/emailLog.model';
import { trackCustomerIOEvent } from '@/app/lib/customerio';

export const GET = withCronAuth(async (req: NextRequest) => {
  const now = Date.now();
  const in24h = new Date(now + 24 * 60 * 60 * 1000);

  // Find auctions ending in next 24h
  const endingAuctions = await Auctions.find({
    status_display: 'active',
    end_time: { $gte: new Date(), $lte: in24h }
  });

  let remindersSent = 0;

  for (const auction of endingAuctions) {
    // Find users who viewed but didn't predict
    const viewers = await UserEvents.distinct('user_id', {
      event_type: 'auction_viewed',
      'event_data.auction_id': auction._id.toString()
    });

    const predictors = await Predictions.distinct('user.userId', {
      auction_id: auction._id
    });

    const viewersWithoutPredictions = viewers.filter(
      v => !predictors.some(p => p.equals(v))
    );

    for (const userId of viewersWithoutPredictions) {
      // Check if reminder already sent in last 24h
      const recentReminder = await EmailLogs.findOne({
        user_id: userId,
        email_type: 'reminder',
        sent_at: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
      });

      if (!recentReminder) {
        await trackCustomerIOEvent(userId.toString(), 'auction_ending_soon', {
          auction_id: auction._id.toString(),
          auction_title: `${auction.year} ${auction.make} ${auction.model}`,
          hours_remaining: Math.round((auction.end_time.getTime() - now) / (1000 * 60 * 60))
        });

        remindersSent++;
      }
    }
  }

  return NextResponse.json({
    auctions_ending: endingAuctions.length,
    reminders_sent: remindersSent
  }, { status: 200 });
});
```

### Health Check

#### GET /api/cron/health

```typescript
export async function GET() {
  // Return health status of all cron jobs
  return NextResponse.json({
    status: 'healthy',
    cron_jobs: [
      { name: 'leaderboard-refresh', schedule: 'Mon 00:00 UTC' },
      { name: 'weekly-digest', schedule: 'Mon 09:00 ET' },
      { name: 'inactive-users', schedule: 'Daily 02:00 UTC' },
      { name: 'stale-auctions', schedule: 'Daily 03:00 UTC' },
      { name: 'auction-reminders', schedule: 'Every 6h' }
    ]
  });
}
```

### Environment Variables

Add to `.env.local` and production:
```env
CRON_SECRET=your_random_secret_string
```

### Testing Requirements

- Mock cron auth
- Test each cron endpoint independently
- Verify frequency caps (no duplicate emails)
- Idempotency tests (cron runs twice)
- Performance tests (process 10k users < 5min)

---

## Agent 6: QA & Integration Testing

### Test Architecture

**Test Layers:**
1. Unit tests (per agent domain)
2. Integration tests (cross-domain)
3. End-to-end tests (user journeys)
4. Performance tests (load, stress)
5. Regression tests (existing features)

### Integration Test Suites

#### Suite 1: Event → Lifecycle Flow

```typescript
describe('Event to Lifecycle Flow', () => {
  it('should track prediction_made event and trigger external integrations', async () => {
    // Create test user
    const user = await createTestUser();

    // Create test auction
    const auction = await createTestAuction();

    // Make prediction via API
    const response = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ auction_id: auction._id, predicted_price: 50000 });

    expect(response.status).toBe(201);

    // Verify UserEvent created
    const event = await UserEvents.findOne({
      user_id: user._id,
      event_type: 'prediction_made'
    });
    expect(event).toBeDefined();

    // Verify Customer.io called (mock)
    expect(mockCustomerIO).toHaveBeenCalledWith(
      user._id.toString(),
      'prediction_made',
      expect.any(Object)
    );

    // Verify PostHog called (mock)
    expect(mockPostHog).toHaveBeenCalled();
  });
});
```

#### Suite 2: Prediction → Scoring → Leaderboard

```typescript
describe('Prediction to Leaderboard Flow', () => {
  it('should score predictions and update leaderboard', async () => {
    // Seed 100 predictions
    const users = await Promise.all(
      Array(100).fill(0).map(() => createTestUser())
    );
    const auction = await createTestAuction({ end_time: new Date(Date.now() - 1000) });

    for (const user of users) {
      await createTestPrediction(user._id, auction._id);
    }

    // Set hammer price
    await Auctions.updateOne(
      { _id: auction._id },
      { $set: { 'attributes.0.value': 50000 } }
    );

    // Trigger stale auction cron
    const response = await request(app)
      .get('/api/cron/stale-auctions')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`);

    expect(response.status).toBe(200);

    // Verify all predictions scored
    const scoredPredictions = await Predictions.countDocuments({
      auction_id: auction._id,
      score: { $exists: true }
    });
    expect(scoredPredictions).toBe(100);

    // Trigger leaderboard refresh
    await request(app)
      .post('/api/leaderboard/refresh?period=weekly')
      .set('Authorization', `Bearer ${adminToken}`);

    // Verify leaderboard created
    const snapshots = await LeaderboardSnapshots.find({ period: 'weekly' });
    expect(snapshots.length).toBeGreaterThan(0);
  });
});
```

#### Suite 3: Streak System Edge Cases

```typescript
describe('Streak System', () => {
  it('should increment streak on consecutive days', async () => {
    const user = await createTestUser();

    // Day 1
    await updateStreak(user._id);
    let streak = await getStreak(user._id);
    expect(streak.current_streak).toBe(1);

    // Day 2 (mock date)
    jest.useFakeTimers().setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
    await updateStreak(user._id);
    streak = await getStreak(user._id);
    expect(streak.current_streak).toBe(2);

    jest.useRealTimers();
  });

  it('should preserve streak with freeze token', async () => {
    const user = await createTestUser();

    // Build 7-day streak
    for (let i = 0; i < 7; i++) {
      await updateStreak(user._id);
      jest.useFakeTimers().setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
    }

    // User earned 1 freeze token at day 7
    let streak = await Streaks.findOne({ user_id: user._id });
    expect(streak.freeze_tokens).toBe(1);

    // Skip 2 days
    jest.useFakeTimers().setSystemTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

    // Make prediction - should use freeze token
    await updateStreak(user._id);
    streak = await Streaks.findOne({ user_id: user._id });
    expect(streak.current_streak).toBe(7); // Preserved
    expect(streak.freeze_tokens).toBe(0); // Used

    jest.useRealTimers();
  });
});
```

### End-to-End Scenarios

#### E2E 1: New User Onboarding

```typescript
describe('E2E: New User Onboarding', () => {
  it('should complete full onboarding flow', async () => {
    // 1. User signs up
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', username: 'testuser', password: 'pass123' });

    expect(response.status).toBe(201);
    const userId = response.body.user.id;

    // 2. Verify signup_completed event fired
    const signupEvent = await UserEvents.findOne({
      user_id: userId,
      event_type: 'signup_completed'
    });
    expect(signupEvent).toBeDefined();

    // 3. View auction
    const auction = await createTestAuction();
    await request(app)
      .get(`/api/auctions/${auction._id}`)
      .set('Authorization', `Bearer ${response.body.token}`);

    // 4. Make first prediction
    await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${response.body.token}`)
      .send({ auction_id: auction._id, predicted_price: 50000 });

    // 5. Verify first_prediction badge awarded
    const badge = await Badges.findOne({
      user_id: userId,
      badge_type: 'first_prediction'
    });
    expect(badge).toBeDefined();

    // 6. Verify streak initialized
    const streak = await Streaks.findOne({ user_id: userId });
    expect(streak.current_streak).toBe(1);

    // 7. Verify points added
    const user = await Users.findById(userId);
    expect(user.total_points).toBeGreaterThan(0);
  });
});
```

### Performance Tests

```typescript
describe('Performance: Event Tracking', () => {
  it('should handle 1000 concurrent events', async () => {
    const users = await Promise.all(
      Array(1000).fill(0).map(() => createTestUser())
    );

    const start = Date.now();

    await Promise.all(
      users.map(user =>
        request(app)
          .post('/api/events/track')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ event_type: 'test_event', event_data: {} })
      )
    );

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // < 5s

    // Verify all events saved
    const eventCount = await UserEvents.countDocuments({ event_type: 'test_event' });
    expect(eventCount).toBe(1000);
  });
});
```

### Coverage Requirements

- **Unit tests:** 90% per domain
- **Integration tests:** 80% cross-domain
- **E2E tests:** Top 10 user journeys
- **Overall:** 85% total coverage

### CI/CD Integration

**.github/workflows/test.yml:**
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3
```

### QA Deliverables

1. Test Report (coverage %, pass/fail per suite)
2. Performance Report (load test results, bottlenecks)
3. Bug Report (issues found, severity, assignments)
4. Regression Report (existing features verified)
5. Sign-off Document ("Ready for production" checklist)

---

## Implementation Timeline

**Parallel Execution:**
- **Week 1:** Agents 1-5 execute simultaneously
- **Week 2:** Agent 6 runs full QA, bugs fixed
- **Week 3:** Final integration, deployment, monitoring

**Critical Path:**
1. Agent 1 (Data Models) must complete first → Agents 2, 3, 4 depend on models
2. Agent 2, 3, 4, 5 can run in parallel after Agent 1
3. Agent 6 runs after all others complete

---

## Success Criteria

✅ All 5 new models created with indexes
✅ All 4 model extensions backward-compatible
✅ Event tracking functioning (Customer.io + PostHog)
✅ Scoring v2 implemented, tournament compute supports both v1/v2
✅ Leaderboard snapshots generating on schedule
✅ Streak system accurate across timezones
✅ Badges awarding correctly
✅ 5 cron jobs running on schedule
✅ Webhook handlers verified
✅ Test coverage ≥ 85%
✅ No regression in existing features
✅ Performance targets met (leaderboard < 60s, events < 500ms p95)

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| External API failures block requests | Fire Customer.io/PostHog async, don't await |
| Timezone edge cases break streaks | Use UTC date-only comparison, comprehensive tests |
| Leaderboard refresh times out | Limit to 10k users, use aggregation indexes |
| Race conditions in streak updates | Use atomic MongoDB operations, test concurrency |
| Cron jobs fail silently | Add health check endpoint, Sentry alerts |
| Backward compatibility broken | Comprehensive regression tests before deploy |

---

## Next Steps

1. ✅ Design approved
2. ⏭️ Write to design doc (this file)
3. ⏭️ Commit design doc
4. ⏭️ Spawn 5 parallel agents for execution
5. ⏭️ Run Agent 6 QA after completion
6. ⏭️ Deploy to production

---

**End of Design Document**
