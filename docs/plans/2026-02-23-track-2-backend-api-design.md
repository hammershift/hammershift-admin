# Track 2 Backend API Design

**Date:** 2026-02-23
**Author:** Claude Code
**Status:** Approved - Ready for Implementation
**Scope:** Backend/Admin Only (hammershift-admin repo)
**Implementation Strategy:** Domain-based parallel execution with 5 independent agents

---

## Executive Summary

Implement Track 2 backend features: guest migration, ACH wallet stubs, notification preferences, ladder tier system, and analytics funnel. All features use stub implementations for external services (ACH, push notifications, SMS) to allow product validation before committing to specific vendors. Execution via 5 parallel independent domains with no inter-dependencies.

**Timeline:** 3-5 days (parallel execution)
**Test Coverage Target:** 85%+ overall
**Breaking Changes:** None (purely additive)

---

## Architecture Overview

### 5 Independent Domains

```
┌─────────────────────────────────────────────────────────────┐
│                    Track 2 Features                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Guest      │  │   Wallet     │  │ Notifications│     │
│  │  Migration   │  │   Stubs      │  │   (Stub)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   Ladder     │  │  Analytics   │                       │
│  │    Tiers     │  │   Funnel     │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │    Existing Phase 2 Infrastructure │
         │  • Event Tracking (UserEvents)     │
         │  • Customer.io/PostHog Integration │
         │  • Rate Limiting & Audit Logging   │
         │  • Scoring & Tournament System     │
         └────────────────────────────────────┘
```

### Key Design Principles

1. **No inter-domain dependencies** - All 5 domains are completely independent
2. **Stub implementations** - ACH, push notifications, and SMS stubbed for product validation
3. **Preserve existing field names** - No renaming to avoid breaking changes
4. **Leverage Phase 2 infrastructure** - Use existing event tracking, rate limiting, auth
5. **Ladder tier migration** - New `ladder_tier` field replaces old `rank_title`

---

## Domain 1: Guest Migration

### Endpoint: `POST /api/guest/migrate`

**Purpose:** Migrate localStorage predictions to authenticated user account

**Authentication:** NextAuth session required

**Request Body:**
```typescript
{
  predictions: Array<{
    auctionId: string       // MongoDB ObjectId string
    predictedPrice: number  // integer
  }>
}
```

**Response:**
```typescript
{
  migrated: number     // successfully saved
  skipped: number      // duplicates ignored
}
```

**Business Logic:**
1. Validate session exists
2. Validate predictions array (max 3 items)
3. For each prediction:
   - Check if user already has prediction for this auction_id
   - If not exists: Create new Prediction with current timestamp
   - If exists: Skip (idempotent behavior)
4. Return counts of migrated vs skipped

**Error Handling:**
- 400: Invalid request body (missing fields, > 3 predictions)
- 401: No session
- 500: Database errors

**Notes:**
- Always uses current timestamp (API contract option B)
- Idempotent - safe to call multiple times
- No wager amount (free predictions)

---

## Domain 2: Wallet Stubs

### Data Models

#### ACH Accounts (`src/app/models/achAccount.model.ts`)
```typescript
{
  user_id: ObjectId (ref User, indexed)
  routing_number: String (encrypted - for future real implementation)
  account_number_last4: String
  account_type: 'checking' | 'savings'
  is_verified: Boolean (default: false)
  created_at: Date
}

// Indexes:
achAccountSchema.index({ user_id: 1 });
```

#### Wallet Transactions (`src/app/models/walletTransaction.model.ts`)
```typescript
{
  user_id: ObjectId (ref User, indexed)
  transaction_id: String (unique, indexed)
  type: 'deposit' | 'withdrawal'
  method: 'ach' | 'card'
  amount: Number (in cents)
  status: 'pending' | 'completed' | 'failed'
  available_date: Date
  created_at: Date
}

// Indexes:
walletTransactionSchema.index({ user_id: 1, created_at: -1 });
walletTransactionSchema.index({ transaction_id: 1 }, { unique: true });
walletTransactionSchema.index({ status: 1 });
```

### Endpoint: `POST /api/wallet/deposit/ach`

**Purpose:** Initiate ACH deposit (stubbed)

**Authentication:** NextAuth session required

**Request Body:**
```typescript
{
  amount: number                // in cents
  routingNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings'
}
```

**Response:**
```typescript
{
  transactionId: string
  status: 'pending'
  availableDate: string         // ISO 8601, now + 3 days
}
```

**Business Logic:**
1. Generate mock transaction_id (format: `ach_${timestamp}_${userId}`)
2. Save ACH account (store only last 4 digits of account number)
3. Create WalletTransaction with status 'pending'
4. Increment user.deposit_count
5. Calculate available_date = now + 3 business days
6. Fire event: `deposit_started` with { method: 'ach', amount }
7. Return transaction details

**Error Handling:**
- 400: Invalid routing number format, invalid amount
- 401: No session
- 500: Database errors

**Notes:**
- Does NOT actually process ACH transfer
- Does NOT add to user.balance (balance updates happen on "completion")
- Real implementation will integrate chosen payment provider later

### Endpoint: `GET /api/wallet/ach-status`

**Purpose:** Check if user has linked ACH account

**Authentication:** NextAuth session required

**Response:**
```typescript
{
  isLinked: boolean
  lastFour: string | null        // last 4 of account number
  preferredMethod: 'ach' | 'card'
}
```

**Business Logic:**
1. Find ACH account for user
2. Get preferred_payment_method from user record
3. Return status

### Endpoint: `PATCH /api/wallet/preferred-method`

**Purpose:** Set user's preferred deposit method

**Authentication:** NextAuth session required

**Request Body:**
```typescript
{
  method: 'ach' | 'card'
}
```

**Response:**
```typescript
{
  success: boolean
}
```

**Business Logic:**
1. Validate method value
2. Update user.preferred_payment_method
3. Return success

### User Model Extensions

Add fields to existing User model:
```typescript
deposit_count: { type: Number, default: 0 }
preferred_payment_method: { type: String, enum: ['ach', 'card'], default: 'card' }
```

---

## Domain 3: Notifications (Stubs)

### Data Model

#### Push Subscriptions (`src/app/models/pushSubscription.model.ts`)
```typescript
{
  user_id: ObjectId (ref User, indexed)
  endpoint: String
  keys: {
    p256dh: String
    auth: String
  }
  created_at: Date
}

// Indexes:
pushSubscriptionSchema.index({ user_id: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
```

### Endpoint: `POST /api/notifications/push/subscribe`

**Purpose:** Save Web Push subscription (stub - doesn't send notifications)

**Authentication:** NextAuth session required

**Request Body:**
```typescript
{
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
}
```

**Response:**
```typescript
{
  success: boolean
}
```

**Business Logic:**
1. Validate subscription object structure
2. Upsert PushSubscription (user can have multiple devices)
3. Fire event: `notification_opted_in` with { channel: 'push' }
4. Return success

**Notes:**
- Does NOT generate VAPID keys
- Does NOT send actual push notifications
- Real implementation will integrate web-push library later

### Endpoint: `GET /api/notifications/preferences`

**Purpose:** Get user's notification preferences

**Authentication:** NextAuth session required

**Response:**
```typescript
{
  email_30min: boolean
  email_rank_drop: boolean
  push_30min: boolean
  sms_30min: boolean
  phone: string | null
}
```

**Business Logic:**
1. Get user record
2. Return notification_preferences + phone field
3. Default values if not set

### Endpoint: `PATCH /api/notifications/preferences`

**Purpose:** Update notification preferences

**Authentication:** NextAuth session required

**Request Body:**
```typescript
{
  email_30min?: boolean
  email_rank_drop?: boolean
  push_30min?: boolean
  sms_30min?: boolean
  phone?: string | null
}
```

**Response:**
```typescript
{
  success: boolean
}
```

**Business Logic:**
1. Validate fields (only update provided fields)
2. Update user.notification_preferences
3. If phone provided, update user.phone
4. Return success

### User Model Extensions

Add fields to existing User model:
```typescript
phone: { type: String, required: false }
notification_preferences: {
  email_30min: { type: Boolean, default: true }
  email_rank_drop: { type: Boolean, default: true }
  push_30min: { type: Boolean, default: false }
  sms_30min: { type: Boolean, default: false }
}
```

**Notes:**
- This extends the existing `email_preferences` structure
- Backend does NOT trigger actual notifications yet (Phase 3 feature)
- SMS provider integration deferred (stub only)

---

## Domain 4: Ladder Tiers

### Tier System

**Tier Thresholds (based on user.total_points):**
- `rookie`: 0-99 points
- `silver`: 100-299 points
- `gold`: 300-749 points
- `pro`: 750+ points

**Migration from old system:**
- Old field: `rank_title` with values `['Rookie', 'Rising Star', 'Expert', 'Legend']`
- New field: `ladder_tier` with values `['rookie', 'silver', 'gold', 'pro']`
- Frontend will migrate references
- Backend calculates tier dynamically from total_points

### Endpoint: `GET /api/tournaments/ladder/me`

**Purpose:** Get authenticated user's ladder position

**Authentication:** NextAuth session required

**Response:**
```typescript
{
  tier: 'rookie' | 'silver' | 'gold' | 'pro'
  points: number
  rank: number                  // rank within current tier
  nextTierThreshold: number     // points needed for next tier
  qualificationWindow: {
    required: number            // tournaments needed in last 14 days
    completed: number           // tournaments user participated in
  }
}
```

**Business Logic:**
1. Get user's total_points
2. Calculate tier from points:
   - 0-99: rookie
   - 100-299: silver
   - 300-749: gold
   - 750+: pro
3. Update user.ladder_tier if changed
4. Calculate rank within tier:
   - Count users in same tier with higher total_points
   - User's rank = count + 1
5. Calculate nextTierThreshold:
   - rookie → 100 (silver)
   - silver → 300 (gold)
   - gold → 750 (pro)
   - pro → 750 (already max)
6. Calculate qualification window:
   - required: 2 tournaments per 14 days (hardcoded for now)
   - completed: Count user's tournament participations in last 14 days (from predictions with tournament_id)
7. Return all calculated values

**Notes:**
- Tier is calculated dynamically, not stored (ensures consistency)
- Rank is relative to other users in same tier
- Qualification window is for "staying qualified" (future feature, stub for now)

### Endpoint: `GET /api/tournaments/schedule`

**Purpose:** Get upcoming tournament schedule with eligibility

**Authentication:** Optional (public endpoint, but shows eligibility if authenticated)

**Query Parameters:** None

**Response:**
```typescript
Array<{
  id: string                    // tournament _id
  tier: 'rookie' | 'silver' | 'gold' | 'pro'
  type: 'qualifier' | 'final' | 'playoff'
  startDate: string             // ISO 8601
  prizePool: number             // in dollars
  filledSpots: number
  totalSpots: number
  entryFee: number              // in cents
  isEligible: boolean           // true if user meets tier requirement
}>
```

**Business Logic:**
1. Fetch all active tournaments (isActive=true, endTime > now)
2. For each tournament:
   - Get tier from tournament.tier field
   - Get type from tournament.type field
   - Calculate filledSpots = tournament.users.length
   - Get totalSpots = tournament.maxUsers
   - Get entryFee = tournament.buyInFee (align with existing field)
   - If user authenticated:
     - Get user's current tier
     - isEligible = (user.tier >= tournament.tier OR tournament.tier is null)
   - If no session: isEligible = false
3. Sort by startTime ascending
4. Return array

**Notes:**
- Uses existing Tournament model
- No new tournaments created (uses existing data)
- Frontend shows padlock icon when isEligible=false

### User Model Extensions

Add field to existing User model:
```typescript
ladder_tier: { type: String, enum: ['rookie', 'silver', 'gold', 'pro'], default: 'rookie' }
```

### Tournament Model Extensions

Add fields to existing Tournament model:
```typescript
tier: { type: String, enum: ['rookie', 'silver', 'gold', 'pro'], required: false }
// Note: buyInFee already exists, maps to API contract's entryFee
```

**Index additions:**
```typescript
tournamentSchema.index({ tier: 1 });
```

---

## Domain 5: Analytics Funnel

### Endpoint: `GET /api/analytics/funnel`

**Purpose:** Admin dashboard analytics for conversion funnel

**Authentication:** NextAuth session with admin role required

**Query Parameters:**
- `period`: '7d' | '30d' | '90d' (default: '7d')

**Response:**
```typescript
{
  signupToFirstPick: number             // percentage (0-100)
  pickToDeposit: number                 // percentage
  weeklyActiveUsers: number             // unique users with ≥1 event in last 7d
  entriesPerUserPerWeek: number         // avg tournament entries
  depositConversionByRail: {
    ach: number                         // % of deposit-started that completed via ACH
    card: number                        // % via card
  }
  tournamentFillRate: number            // avg % of seats filled
  tierChurnRate: {
    rookie: number                      // % who dropped from this tier
    silver: number
    gold: number
    pro: number
  }
}
```

**Business Logic:**

1. **Period Calculation:**
   - 7d: last 7 days
   - 30d: last 30 days
   - 90d: last 90 days
   - Calculate start_date = now - period

2. **signupToFirstPick:**
   - Count new users created in period: `newUsers = User.count({ createdAt >= start_date })`
   - Count users who made first prediction: `usersWithPick = Prediction.distinct('user.userId', { createdAt >= start_date })`
   - Calculate: `(usersWithPick / newUsers) * 100`

3. **pickToDeposit:**
   - Count users with predictions: `usersWithPicks = Prediction.distinct('user.userId', { createdAt >= start_date })`
   - Count users with deposits: `usersWithDeposit = WalletTransaction.distinct('user_id', { type: 'deposit', created_at >= start_date })`
   - Calculate: `(usersWithDeposit / usersWithPicks) * 100`

4. **weeklyActiveUsers:**
   - Count distinct user_ids in UserEvents in last 7 days
   - Query: `UserEvents.distinct('user_id', { created_at >= now - 7d })`

5. **entriesPerUserPerWeek:**
   - Count tournament joins in last 7 days from UserEvents
   - Query: `UserEvents.count({ event_type: 'tournament_joined', created_at >= now - 7d })`
   - Divide by distinct users who joined tournaments
   - Calculate: `joins / distinctUsers`

6. **depositConversionByRail:**
   - Count deposits started: `achStarted = UserEvents.count({ event_type: 'deposit_started', event_data.method: 'ach' })`
   - Count deposits completed: `achCompleted = UserEvents.count({ event_type: 'deposit_completed', event_data.method: 'ach' })`
   - Calculate: `ach = (achCompleted / achStarted) * 100`
   - Repeat for `card` method

7. **tournamentFillRate:**
   - Get all tournaments that ended in period
   - For each: calculate `filledSpots / maxUsers`
   - Average across all tournaments

8. **tierChurnRate:**
   - For each tier (rookie, silver, gold, pro):
     - Find users who were in this tier at start of period (from LeaderboardSnapshots or calculate from historical total_points)
     - Count how many dropped to lower tier by end of period
     - Calculate: `(droppedCount / tierStartCount) * 100`
   - Note: This requires historical tier tracking or LeaderboardSnapshots

**Error Handling:**
- 401: No session
- 403: User is not admin
- 400: Invalid period parameter
- 500: Database errors

**Notes:**
- Admin role check: `session.user.role === 'ADMIN'` or similar
- May need to adjust queries based on actual event_type strings being sent by frontend
- Tier churn calculation may be simplified if historical data not available (return 0 or estimate)

---

## Integration with Phase 2 Infrastructure

### Event Tracking
All endpoints trigger events via existing `POST /api/events/track`:

**New event types added:**
- `pick_submitted_guest` - when guest makes prediction
- `signup_from_guest_gate` - when guest converts to authenticated user
- `deposit_started` - when deposit initiated
- `deposit_completed` - when deposit processed (future)
- `notification_opted_in` - when user subscribes to notifications
- `tournament_joined` - when user joins tournament
- `share_card_opened` - social sharing (future)
- `share_card_shared` - social sharing (future)
- `daily_challenge_completed` - gamification (future)
- `ladder_page_viewed` - analytics (future)

### Rate Limiting
All endpoints wrapped with `withRateLimit()`:
- `RateLimitPresets.READONLY` for GET endpoints
- `RateLimitPresets.STANDARD` for POST/PATCH endpoints

### Audit Logging
All endpoints use `createAuditLog()` for security tracking

### Authentication
All protected endpoints use `getServerSession(authOptions)`

### Database Connection
All endpoints use existing `connectToDB()` from `src/app/lib/mongoose.ts`

**No changes to existing Phase 2 infrastructure required.**

---

## Testing Strategy

### Unit Tests (per domain)

**Domain 1: Guest Migration**
- Test idempotency (calling twice doesn't duplicate)
- Test max 3 predictions limit
- Test duplicate prediction handling (skip, don't error)
- Test invalid auction_id
- Test unauthorized access (no session)

**Domain 2: Wallet**
- Test ACH account creation
- Test transaction ID generation (uniqueness)
- Test deposit_count increment
- Test available_date calculation
- Test preferred method update
- Test ACH status for linked/unlinked accounts

**Domain 3: Notifications**
- Test push subscription upsert (multiple devices)
- Test preference updates (partial updates)
- Test phone number validation
- Test get preferences with defaults

**Domain 4: Ladder**
- Test tier calculation for all point ranges
- Test rank calculation within tier
- Test nextTierThreshold for all tiers
- Test qualification window counting
- Test tournament eligibility logic
- Test public vs authenticated tournament schedule

**Domain 5: Analytics**
- Test funnel calculation logic
- Test period filtering (7d, 30d, 90d)
- Test admin role enforcement (403 for non-admin)
- Test WAU calculation
- Test deposit conversion rates

### Integration Tests

- Full request/response cycles for all 10 endpoints
- Authentication validation (401 for missing session)
- Authorization validation (403 for non-admin analytics)
- Rate limiting verification
- Database state changes (create, update operations)
- Error handling (400, 500 responses)

### Test Coverage Target

- **Overall:** 85%+
- **Per domain:** 80%+ minimum
- Match Phase 2 testing standards

---

## Implementation Checklist

### Domain 1: Guest Migration
- [ ] Create `POST /api/guest/migrate` endpoint
- [ ] Add validation for request body
- [ ] Add idempotency logic (check existing predictions)
- [ ] Add unit tests
- [ ] Add integration tests

### Domain 2: Wallet Stubs
- [ ] Create ACH Account model
- [ ] Create Wallet Transaction model
- [ ] Create `POST /api/wallet/deposit/ach` endpoint
- [ ] Create `GET /api/wallet/ach-status` endpoint
- [ ] Create `PATCH /api/wallet/preferred-method` endpoint
- [ ] Extend User model with deposit_count, preferred_payment_method
- [ ] Add unit tests
- [ ] Add integration tests

### Domain 3: Notifications
- [ ] Create Push Subscription model
- [ ] Create `POST /api/notifications/push/subscribe` endpoint
- [ ] Create `GET /api/notifications/preferences` endpoint
- [ ] Create `PATCH /api/notifications/preferences` endpoint
- [ ] Extend User model with phone, notification_preferences
- [ ] Add unit tests
- [ ] Add integration tests

### Domain 4: Ladder Tiers
- [ ] Create `GET /api/tournaments/ladder/me` endpoint
- [ ] Create `GET /api/tournaments/schedule` endpoint
- [ ] Extend User model with ladder_tier
- [ ] Extend Tournament model with tier field
- [ ] Add tier calculation logic
- [ ] Add rank calculation logic
- [ ] Add qualification window logic
- [ ] Add unit tests
- [ ] Add integration tests

### Domain 5: Analytics Funnel
- [ ] Create `GET /api/analytics/funnel` endpoint
- [ ] Add admin role check
- [ ] Add funnel calculation logic
- [ ] Add period filtering
- [ ] Add unit tests
- [ ] Add integration tests

### Cross-Domain
- [ ] Update `.env.example` with any new env vars
- [ ] Update API documentation
- [ ] Run full test suite (363+ tests)
- [ ] Verify no breaking changes to existing endpoints

---

## API Contract Compliance

This design implements all 10 endpoints from the Track 2 API contract:

✅ `POST /api/guest/migrate`
✅ `POST /api/wallet/deposit/ach`
✅ `GET /api/wallet/ach-status`
✅ `PATCH /api/wallet/preferred-method`
✅ `POST /api/notifications/push/subscribe`
✅ `GET /api/notifications/preferences`
✅ `PATCH /api/notifications/preferences`
✅ `GET /api/tournaments/ladder/me`
✅ `GET /api/tournaments/schedule`
✅ `GET /api/analytics/funnel`

**Design decisions aligned with contract:**
- Stub implementations for ACH, push, SMS (Option B chosen)
- Current timestamp for guest migration (Option B chosen)
- Replace old rank_title system (Option A chosen)
- Return existing tournaments with eligibility (Option A chosen)
- Existing field names preserved (no breaking changes)

---

## Next Steps

1. ✅ Design approved
2. ✅ Design document written
3. **→ Create implementation plan** (invoke writing-plans skill)
4. Execute via 5 parallel agents
5. Integration testing
6. Deploy to production

---

## Appendix: Field Name Mappings

**API Contract → Database Mappings:**

| API Contract | Database Field | Notes |
|--------------|---------------|-------|
| `userId` | `user.userId` (in predictions) | Embedded document |
| `userId` | `_id` (in users) | Top-level field |
| `auctionId` | `auction_id` | Consistent naming |
| `tier` | `ladder_tier` (new) | Replaces `rank_title` |
| `entryFee` | `buyInFee` | Existing tournament field |
| `predictedPrice` | `predictedPrice` | Exact match |

**No renaming required - design preserves existing field names.**
