# Track 2 Backend API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10 new API endpoints for Track 2 features: guest migration, ACH wallet stubs, notification preferences, ladder tier system, and analytics funnel.

**Architecture:** 5 independent domains implemented in parallel, each with models → routes → tests. All domains use existing Phase 2 infrastructure (auth, rate limiting, audit logging, event tracking). Stub implementations for external services (ACH, push notifications, SMS) to enable product validation before vendor selection.

**Tech Stack:** Next.js 14 App Router, MongoDB with Mongoose, NextAuth, Jest/Supertest, TypeScript

---

## Prerequisites

**Required environment variables** (already configured from Phase 2):
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Database name
- `NEXTAUTH_SECRET` - NextAuth JWT secret
- `POSTHOG_API_KEY` - PostHog analytics
- `CUSTOMERIO_API_KEY` - Customer.io integration

**Verify Phase 2 infrastructure is working:**
```bash
npm test -- __tests__/integration/api/leaderboard.test.ts
```
Expected: Tests pass (confirms auth, rate limiting, DB connection work)

---

## Domain 1: Guest Migration

### Task 1.1: Create guest migration API endpoint

**Files:**
- Create: `src/app/api/guest/migrate/route.ts`
- Test: `__tests__/integration/api/guest/migrate.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/guest/migrate.test.ts`:

```typescript
import { POST } from '@/app/api/guest/migrate/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Predictions from '@/app/models/prediction.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/prediction.model');

describe('POST /api/guest/migrate', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should migrate guest predictions successfully', async () => {
    const mockAuctionId = '507f1f77bcf86cd799439012';

    // Mock no existing predictions
    (Predictions.findOne as jest.Mock).mockResolvedValue(null);
    (Predictions.create as jest.Mock).mockResolvedValue({ _id: 'new-prediction-id' });

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: mockAuctionId, predictedPrice: 50000 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(1);
    expect(data.skipped).toBe(0);
  });

  it('should skip duplicate predictions (idempotent)', async () => {
    const mockAuctionId = '507f1f77bcf86cd799439012';

    // Mock existing prediction
    (Predictions.findOne as jest.Mock).mockResolvedValue({ _id: 'existing-id' });

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: mockAuctionId, predictedPrice: 50000 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(0);
    expect(data.skipped).toBe(1);
  });

  it('should reject more than 3 predictions', async () => {
    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: '1', predictedPrice: 1 },
          { auctionId: '2', predictedPrice: 2 },
          { auctionId: '3', predictedPrice: 3 },
          { auctionId: '4', predictedPrice: 4 },
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 3 predictions');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({ predictions: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/guest/migrate.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/guest/migrate/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/guest/migrate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Predictions from '@/app/models/prediction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';
import { Types } from 'mongoose';

interface GuestPrediction {
  auctionId: string;
  predictedPrice: number;
}

/**
 * POST /api/guest/migrate
 *
 * Migrate guest predictions from localStorage to authenticated user account.
 * Idempotent - safe to call multiple times.
 */
export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { predictions } = body;

      if (!predictions || !Array.isArray(predictions)) {
        return NextResponse.json(
          { error: 'predictions array is required' },
          { status: 400 }
        );
      }

      if (predictions.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 predictions allowed per migration' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Get user details
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let migrated = 0;
      let skipped = 0;

      // 5. Process each prediction
      for (const pred of predictions) {
        const { auctionId, predictedPrice } = pred as GuestPrediction;

        // Validate fields
        if (!auctionId || !predictedPrice) {
          continue; // Skip invalid predictions
        }

        // Check if prediction already exists
        const existing = await Predictions.findOne({
          auction_id: new Types.ObjectId(auctionId),
          'user.userId': user._id,
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new prediction
        await Predictions.create({
          auction_id: new Types.ObjectId(auctionId),
          predictedPrice,
          predictionType: 'free',
          isActive: true,
          user: {
            userId: user._id,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
          },
        });

        migrated++;
      }

      return NextResponse.json(
        { migrated, skipped },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Guest Migration API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to migrate predictions', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/guest/migrate.test.ts
```
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/guest/migrate/route.ts __tests__/integration/api/guest/migrate.test.ts
git commit -m "feat(guest): add guest prediction migration endpoint"
```

---

## Domain 2: Wallet Stubs

### Task 2.1: Create ACH Account model

**Files:**
- Create: `src/app/models/achAccount.model.ts`

**Step 1: Write the model**

Create `src/app/models/achAccount.model.ts`:

```typescript
import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface ACHAccount extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  routing_number: string; // Encrypted in real implementation
  account_number_last4: string;
  account_type: 'checking' | 'savings';
  is_verified: boolean;
  created_at: Date;
}

const achAccountSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    routing_number: {
      type: String,
      required: true,
    },
    account_number_last4: {
      type: String,
      required: true,
    },
    account_type: {
      type: String,
      enum: ['checking', 'savings'],
      required: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ach_accounts',
    timestamps: false,
  }
);

// Indexes
achAccountSchema.index({ user_id: 1 });

const ACHAccounts = models.ACHAccount || model('ACHAccount', achAccountSchema);

export default ACHAccounts;
```

**Step 2: Commit**

```bash
git add src/app/models/achAccount.model.ts
git commit -m "feat(wallet): add ACH account model"
```

### Task 2.2: Create Wallet Transaction model

**Files:**
- Create: `src/app/models/walletTransaction.model.ts`

**Step 1: Write the model**

Create `src/app/models/walletTransaction.model.ts`:

```typescript
import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface WalletTransaction extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  transaction_id: string;
  type: 'deposit' | 'withdrawal';
  method: 'ach' | 'card';
  amount: number; // in cents
  status: 'pending' | 'completed' | 'failed';
  available_date: Date;
  created_at: Date;
}

const walletTransactionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      indexed: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal'],
      required: true,
    },
    method: {
      type: String,
      enum: ['ach', 'card'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      required: true,
      default: 'pending',
    },
    available_date: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'wallet_transactions',
    timestamps: false,
  }
);

// Indexes
walletTransactionSchema.index({ user_id: 1, created_at: -1 });
walletTransactionSchema.index({ transaction_id: 1 }, { unique: true });
walletTransactionSchema.index({ status: 1 });

const WalletTransactions = models.WalletTransaction || model('WalletTransaction', walletTransactionSchema);

export default WalletTransactions;
```

**Step 2: Commit**

```bash
git add src/app/models/walletTransaction.model.ts
git commit -m "feat(wallet): add wallet transaction model"
```

### Task 2.3: Extend User model with wallet fields

**Files:**
- Modify: `src/app/models/user.model.ts`

**Step 1: Add fields to User interface and schema**

In `src/app/models/user.model.ts`, add to the `User` interface (after line 36):

```typescript
  deposit_count: number;
  preferred_payment_method: 'ach' | 'card';
```

Add to the schema (after line 72):

```typescript
    deposit_count: { type: Number, default: 0 },
    preferred_payment_method: {
      type: String,
      enum: ['ach', 'card'],
      default: 'card',
    },
```

**Step 2: Commit**

```bash
git add src/app/models/user.model.ts
git commit -m "feat(wallet): add deposit_count and preferred_payment_method to User model"
```

### Task 2.4: Create ACH deposit endpoint with tests

**Files:**
- Create: `src/app/api/wallet/deposit/ach/route.ts`
- Test: `__tests__/integration/api/wallet/ach-deposit.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/wallet/ach-deposit.test.ts`:

```typescript
import { POST } from '@/app/api/wallet/deposit/ach/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import ACHAccounts from '@/app/models/achAccount.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/achAccount.model');
jest.mock('@/app/models/walletTransaction.model');
jest.mock('@/app/models/user.model');

describe('POST /api/wallet/deposit/ach', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create ACH deposit successfully', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      deposit_count: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(null);
    (ACHAccounts.create as jest.Mock).mockResolvedValue({ _id: 'ach-id' });
    (WalletTransactions.create as jest.Mock).mockResolvedValue({ _id: 'txn-id' });

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000, // $100.00
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transactionId).toBeDefined();
    expect(data.status).toBe('pending');
    expect(data.availableDate).toBeDefined();
    expect(mockUser.deposit_count).toBe(1);
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000,
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should validate amount is positive', async () => {
    (Users.findById as jest.Mock).mockResolvedValue({ _id: mockSession.user.id });

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: -1000,
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('positive');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/wallet/ach-deposit.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/wallet/deposit/ach/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/wallet/deposit/ach/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import ACHAccounts from '@/app/models/achAccount.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';
import { Types } from 'mongoose';

/**
 * POST /api/wallet/deposit/ach
 *
 * Initiate ACH deposit (stubbed - does not actually process payment)
 */
export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { amount, routingNumber, accountNumber, accountType } = body;

      if (!amount || !routingNumber || !accountNumber || !accountType) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be positive' },
          { status: 400 }
        );
      }

      if (!['checking', 'savings'].includes(accountType)) {
        return NextResponse.json(
          { error: 'Invalid account type' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Save/update ACH account (store only last 4 digits)
      const accountNumberLast4 = accountNumber.slice(-4);

      const existingAccount = await ACHAccounts.findOne({
        user_id: user._id,
      });

      if (!existingAccount) {
        await ACHAccounts.create({
          user_id: user._id,
          routing_number: routingNumber, // In real impl, encrypt this
          account_number_last4: accountNumberLast4,
          account_type: accountType,
          is_verified: false,
        });
      }

      // 6. Generate mock transaction ID
      const transactionId = `ach_${Date.now()}_${user._id}`;

      // 7. Calculate available date (3 business days from now - simplified)
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + 3);

      // 8. Create transaction record
      await WalletTransactions.create({
        user_id: user._id,
        transaction_id: transactionId,
        type: 'deposit',
        method: 'ach',
        amount,
        status: 'pending',
        available_date: availableDate,
      });

      // 9. Increment deposit count
      user.deposit_count = (user.deposit_count || 0) + 1;
      await user.save();

      return NextResponse.json(
        {
          transactionId,
          status: 'pending',
          availableDate: availableDate.toISOString(),
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[ACH Deposit API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to process ACH deposit', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/wallet/ach-deposit.test.ts
```
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/wallet/deposit/ach/route.ts __tests__/integration/api/wallet/ach-deposit.test.ts
git commit -m "feat(wallet): add ACH deposit endpoint (stub)"
```

### Task 2.5: Create ACH status endpoint with tests

**Files:**
- Create: `src/app/api/wallet/ach-status/route.ts`
- Test: `__tests__/integration/api/wallet/ach-status.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/wallet/ach-status.test.ts`:

```typescript
import { GET } from '@/app/api/wallet/ach-status/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import ACHAccounts from '@/app/models/achAccount.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/achAccount.model');
jest.mock('@/app/models/user.model');

describe('GET /api/wallet/ach-status', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return ACH status when account is linked', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'ach',
    };

    const mockAccount = {
      account_number_last4: '3210',
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(mockAccount);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLinked).toBe(true);
    expect(data.lastFour).toBe('3210');
    expect(data.preferredMethod).toBe('ach');
  });

  it('should return unlinked status when no ACH account exists', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'card',
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLinked).toBe(false);
    expect(data.lastFour).toBeNull();
    expect(data.preferredMethod).toBe('card');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/wallet/ach-status.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/wallet/ach-status/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/wallet/ach-status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import ACHAccounts from '@/app/models/achAccount.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * GET /api/wallet/ach-status
 *
 * Check if user has linked ACH account
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Connect to database
      await connectToDB();

      // 3. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 4. Check for ACH account
      const achAccount = await ACHAccounts.findOne({
        user_id: user._id,
      });

      return NextResponse.json(
        {
          isLinked: !!achAccount,
          lastFour: achAccount ? achAccount.account_number_last4 : null,
          preferredMethod: user.preferred_payment_method || 'card',
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[ACH Status API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get ACH status', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/wallet/ach-status.test.ts
```
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/wallet/ach-status/route.ts __tests__/integration/api/wallet/ach-status.test.ts
git commit -m "feat(wallet): add ACH status endpoint"
```

### Task 2.6: Create preferred payment method endpoint with tests

**Files:**
- Create: `src/app/api/wallet/preferred-method/route.ts`
- Test: `__tests__/integration/api/wallet/preferred-method.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/wallet/preferred-method.test.ts`:

```typescript
import { PATCH } from '@/app/api/wallet/preferred-method/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');

describe('PATCH /api/wallet/preferred-method', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should update preferred payment method', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'card',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'ach' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUser.preferred_payment_method).toBe('ach');
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('should validate method value', async () => {
    (Users.findById as jest.Mock).mockResolvedValue({ _id: mockSession.user.id });

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'bitcoin' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid method');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'ach' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/wallet/preferred-method.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/wallet/preferred-method/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/wallet/preferred-method/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * PATCH /api/wallet/preferred-method
 *
 * Update user's preferred payment method
 */
export const PATCH = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { method } = body;

      if (!method || !['ach', 'card'].includes(method)) {
        return NextResponse.json(
          { error: 'Invalid method. Must be "ach" or "card"' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Update preferred method
      user.preferred_payment_method = method;
      await user.save();

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Preferred Method API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to update preferred method', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/wallet/preferred-method.test.ts
```
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/wallet/preferred-method/route.ts __tests__/integration/api/wallet/preferred-method.test.ts
git commit -m "feat(wallet): add preferred payment method endpoint"
```

---

## Domain 3: Notifications (Stubs)

### Task 3.1: Create Push Subscription model

**Files:**
- Create: `src/app/models/pushSubscription.model.ts`

**Step 1: Write the model**

Create `src/app/models/pushSubscription.model.ts`:

```typescript
import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface PushSubscription extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: Date;
}

const pushSubscriptionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'push_subscriptions',
    timestamps: false,
  }
);

// Indexes
pushSubscriptionSchema.index({ user_id: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

const PushSubscriptions = models.PushSubscription || model('PushSubscription', pushSubscriptionSchema);

export default PushSubscriptions;
```

**Step 2: Commit**

```bash
git add src/app/models/pushSubscription.model.ts
git commit -m "feat(notifications): add push subscription model"
```

### Task 3.2: Extend User model with notification preferences

**Files:**
- Modify: `src/app/models/user.model.ts`

**Step 1: Add fields to User interface and schema**

In `src/app/models/user.model.ts`, add to the `User` interface (after the email_preferences field):

```typescript
  phone: string | null;
  notification_preferences: {
    email_30min: boolean;
    email_rank_drop: boolean;
    push_30min: boolean;
    sms_30min: boolean;
  };
```

Add to the schema (after the email_preferences field definition around line 71):

```typescript
    phone: { type: String, required: false },
    notification_preferences: {
      email_30min: { type: Boolean, default: true },
      email_rank_drop: { type: Boolean, default: true },
      push_30min: { type: Boolean, default: false },
      sms_30min: { type: Boolean, default: false },
    },
```

**Step 2: Commit**

```bash
git add src/app/models/user.model.ts
git commit -m "feat(notifications): add phone and notification_preferences to User model"
```

### Task 3.3: Create push subscribe endpoint with tests

**Files:**
- Create: `src/app/api/notifications/push/subscribe/route.ts`
- Test: `__tests__/integration/api/notifications/push-subscribe.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/notifications/push-subscribe.test.ts`:

```typescript
import { POST } from '@/app/api/notifications/push/subscribe/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import PushSubscriptions from '@/app/models/pushSubscription.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/pushSubscription.model');

describe('POST /api/notifications/push/subscribe', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  const mockSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should save push subscription successfully', async () => {
    (PushSubscriptions.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'sub-id' });

    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: mockSubscription }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should validate subscription object structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'missing-keys' } }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid subscription');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: mockSubscription }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/notifications/push-subscribe.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/notifications/push/subscribe/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/notifications/push/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import PushSubscriptions from '@/app/models/pushSubscription.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * POST /api/notifications/push/subscribe
 *
 * Save Web Push subscription (stub - does not send notifications)
 */
export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { subscription } = body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return NextResponse.json(
          { error: 'Invalid subscription object' },
          { status: 400 }
        );
      }

      if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return NextResponse.json(
          { error: 'Invalid subscription keys' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Upsert push subscription (user can have multiple devices)
      await PushSubscriptions.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        {
          user_id: session.user.id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Push Subscribe API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to save subscription', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/notifications/push-subscribe.test.ts
```
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/notifications/push/subscribe/route.ts __tests__/integration/api/notifications/push-subscribe.test.ts
git commit -m "feat(notifications): add push subscription endpoint (stub)"
```

### Task 3.4: Create notification preferences GET endpoint with tests

**Files:**
- Create: `src/app/api/notifications/preferences/route.ts` (GET handler)
- Test: `__tests__/integration/api/notifications/preferences.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/notifications/preferences.test.ts`:

```typescript
import { GET, PATCH } from '@/app/api/notifications/preferences/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');

describe('Notification Preferences API', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return notification preferences', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        phone: '+1234567890',
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email_30min).toBe(true);
      expect(data.email_rank_drop).toBe(true);
      expect(data.push_30min).toBe(false);
      expect(data.sms_30min).toBe(false);
      expect(data.phone).toBe('+1234567890');
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        phone: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          push_30min: true,
          phone: '+1234567890',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.notification_preferences.push_30min).toBe(true);
      expect(mockUser.phone).toBe('+1234567890');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ sms_30min: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.notification_preferences.email_30min).toBe(true); // unchanged
      expect(mockUser.notification_preferences.sms_30min).toBe(true); // changed
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ push_30min: true }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/notifications/preferences.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/notifications/preferences/route'"

**Step 3: Create the API endpoints (GET and PATCH)**

Create `src/app/api/notifications/preferences/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * GET /api/notifications/preferences
 *
 * Get user's notification preferences
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Connect to database
      await connectToDB();

      // 3. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 4. Return preferences with defaults
      const preferences = user.notification_preferences || {
        email_30min: true,
        email_rank_drop: true,
        push_30min: false,
        sms_30min: false,
      };

      return NextResponse.json(
        {
          email_30min: preferences.email_30min,
          email_rank_drop: preferences.email_rank_drop,
          push_30min: preferences.push_30min,
          sms_30min: preferences.sms_30min,
          phone: user.phone || null,
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Notification Preferences GET API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get preferences', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/notifications/preferences
 *
 * Update user's notification preferences
 */
export const PATCH = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { email_30min, email_rank_drop, push_30min, sms_30min, phone } = body;

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Update preferences (only provided fields)
      if (!user.notification_preferences) {
        user.notification_preferences = {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        };
      }

      if (email_30min !== undefined) {
        user.notification_preferences.email_30min = email_30min;
      }
      if (email_rank_drop !== undefined) {
        user.notification_preferences.email_rank_drop = email_rank_drop;
      }
      if (push_30min !== undefined) {
        user.notification_preferences.push_30min = push_30min;
      }
      if (sms_30min !== undefined) {
        user.notification_preferences.sms_30min = sms_30min;
      }
      if (phone !== undefined) {
        user.phone = phone;
      }

      await user.save();

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Notification Preferences PATCH API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to update preferences', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/notifications/preferences.test.ts
```
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/notifications/preferences/route.ts __tests__/integration/api/notifications/preferences.test.ts
git commit -m "feat(notifications): add notification preferences endpoints"
```

---

## Domain 4: Ladder Tiers

### Task 4.1: Extend User model with ladder_tier field

**Files:**
- Modify: `src/app/models/user.model.ts`

**Step 1: Add field to User interface and schema**

In `src/app/models/user.model.ts`, add to the `User` interface (replace the existing `rank_title` line):

```typescript
  ladder_tier: 'rookie' | 'silver' | 'gold' | 'pro';
```

Update the schema (replace the existing `rank_title` field definition):

```typescript
    ladder_tier: {
      type: String,
      enum: ['rookie', 'silver', 'gold', 'pro'],
      default: 'rookie',
    },
```

**Step 2: Commit**

```bash
git add src/app/models/user.model.ts
git commit -m "feat(ladder): replace rank_title with ladder_tier in User model"
```

### Task 4.2: Extend Tournament model with tier field

**Files:**
- Modify: `src/app/models/tournament.model.ts`

**Step 1: Add field to Tournament interface and schema**

In `src/app/models/tournament.model.ts`, add to the `Tournament` interface (after line 40):

```typescript
  tier: 'rookie' | 'silver' | 'gold' | 'pro' | null;
```

Add to the schema (after the `scoring_version` field around line 165):

```typescript
    tier: {
      type: String,
      enum: ['rookie', 'silver', 'gold', 'pro'],
      required: false,
    },
```

Add index (after line 179):

```typescript
tournamentSchema.index({ tier: 1 });
```

**Step 2: Commit**

```bash
git add src/app/models/tournament.model.ts
git commit -m "feat(ladder): add tier field to Tournament model"
```

### Task 4.3: Create ladder position endpoint with tests

**Files:**
- Create: `src/app/api/tournaments/ladder/me/route.ts`
- Test: `__tests__/integration/api/tournaments/ladder-me.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/tournaments/ladder-me.test.ts`:

```typescript
import { GET } from '@/app/api/tournaments/ladder/me/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');
jest.mock('@/app/models/prediction.model');

describe('GET /api/tournaments/ladder/me', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return rookie tier for 50 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 50,
      ladder_tier: 'rookie',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(5); // 5 users with more points
    (Predictions.distinct as jest.Mock).mockResolvedValue(['t1', 't2']); // 2 tournaments in last 14 days

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('rookie');
    expect(data.points).toBe(50);
    expect(data.rank).toBe(6); // 5 + 1
    expect(data.nextTierThreshold).toBe(100); // silver threshold
    expect(data.qualificationWindow.completed).toBe(2);
  });

  it('should return silver tier for 150 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 150,
      ladder_tier: 'silver',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(2);
    (Predictions.distinct as jest.Mock).mockResolvedValue(['t1']);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('silver');
    expect(data.points).toBe(150);
    expect(data.nextTierThreshold).toBe(300); // gold threshold
  });

  it('should return pro tier for 800 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 800,
      ladder_tier: 'pro',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(0);
    (Predictions.distinct as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('pro');
    expect(data.points).toBe(800);
    expect(data.nextTierThreshold).toBe(750); // already max
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/tournaments/ladder-me.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/tournaments/ladder/me/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/tournaments/ladder/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import connectToDB from '@/app/lib/mongoose';

type LadderTier = 'rookie' | 'silver' | 'gold' | 'pro';

/**
 * Calculate tier from total points
 */
function calculateTier(points: number): LadderTier {
  if (points >= 750) return 'pro';
  if (points >= 300) return 'gold';
  if (points >= 100) return 'silver';
  return 'rookie';
}

/**
 * Get next tier threshold
 */
function getNextTierThreshold(tier: LadderTier): number {
  switch (tier) {
    case 'rookie':
      return 100; // silver
    case 'silver':
      return 300; // gold
    case 'gold':
      return 750; // pro
    case 'pro':
      return 750; // already max
  }
}

/**
 * GET /api/tournaments/ladder/me
 *
 * Get authenticated user's ladder position
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Connect to database
      await connectToDB();

      // 3. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 4. Calculate tier from points
      const points = user.total_points || 0;
      const tier = calculateTier(points);

      // 5. Update user's ladder_tier if changed
      if (user.ladder_tier !== tier) {
        user.ladder_tier = tier;
        await user.save();
      }

      // 6. Calculate rank within tier
      // Count users in same tier with higher points
      const higherRankedCount = await Users.countDocuments({
        ladder_tier: tier,
        total_points: { $gt: points },
      });
      const rank = higherRankedCount + 1;

      // 7. Get next tier threshold
      const nextTierThreshold = getNextTierThreshold(tier);

      // 8. Calculate qualification window (tournaments in last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const completedTournaments = await Predictions.distinct('tournament_id', {
        'user.userId': user._id,
        createdAt: { $gte: fourteenDaysAgo },
        tournament_id: { $ne: null },
      });

      return NextResponse.json(
        {
          tier,
          points,
          rank,
          nextTierThreshold,
          qualificationWindow: {
            required: 2, // Hardcoded for now
            completed: completedTournaments.length,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Ladder Me API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get ladder position', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/tournaments/ladder-me.test.ts
```
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/tournaments/ladder/me/route.ts __tests__/integration/api/tournaments/ladder-me.test.ts
git commit -m "feat(ladder): add ladder position endpoint"
```

### Task 4.4: Create tournament schedule endpoint with tests

**Files:**
- Create: `src/app/api/tournaments/schedule/route.ts`
- Test: `__tests__/integration/api/tournaments/schedule.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/tournaments/schedule.test.ts`:

```typescript
import { GET } from '@/app/api/tournaments/schedule/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Tournaments from '@/app/models/tournament.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/tournament.model');
jest.mock('@/app/models/user.model');

describe('GET /api/tournaments/schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return tournaments with eligibility for authenticated user', async () => {
    const mockSession = {
      user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
    };

    const mockUser = {
      _id: mockSession.user.id,
      ladder_tier: 'silver',
    };

    const mockTournaments = [
      {
        _id: 't1',
        tier: 'rookie',
        type: 'qualifier',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: ['u1', 'u2'],
        maxUsers: 10,
        buyInFee: 500,
      },
      {
        _id: 't2',
        tier: 'gold',
        type: 'final',
        startTime: new Date('2026-03-02'),
        prizePool: 5000,
        users: [],
        maxUsers: 20,
        buyInFee: 1000,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].isEligible).toBe(true); // silver >= rookie
    expect(data[1].isEligible).toBe(false); // silver < gold
  });

  it('should return tournaments without eligibility for unauthenticated users', async () => {
    const mockTournaments = [
      {
        _id: 't1',
        tier: 'rookie',
        type: 'qualifier',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: [],
        maxUsers: 10,
        buyInFee: 0,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(null);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].isEligible).toBe(false); // no session
  });

  it('should return empty array when no active tournaments', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/tournaments/schedule.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/tournaments/schedule/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/tournaments/schedule/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Tournaments from '@/app/models/tournament.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

type LadderTier = 'rookie' | 'silver' | 'gold' | 'pro';

/**
 * Compare tiers (returns true if userTier >= requiredTier)
 */
function meetsT tierRequirement(userTier: LadderTier | null, requiredTier: LadderTier | null): boolean {
  if (!requiredTier) return true; // No tier requirement

  if (!userTier) return false; // User has no tier

  const tierOrder: LadderTier[] = ['rookie', 'silver', 'gold', 'pro'];
  const userIndex = tierOrder.indexOf(userTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);

  return userIndex >= requiredIndex;
}

/**
 * GET /api/tournaments/schedule
 *
 * Get upcoming tournament schedule with eligibility
 * Public endpoint - authentication optional
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Check for session (optional)
      const session = await getServerSession(authOptions);

      // 2. Connect to database
      await connectToDB();

      // 3. Get user's tier if authenticated
      let userTier: LadderTier | null = null;
      if (session?.user?.id) {
        const user = await Users.findById(session.user.id);
        if (user) {
          userTier = user.ladder_tier || null;
        }
      }

      // 4. Fetch active tournaments (endTime > now, isActive=true)
      const now = new Date();
      const tournaments = await Tournaments.find({
        isActive: true,
        endTime: { $gt: now },
      })
        .sort({ startTime: 1 })
        .lean();

      // 5. Map to API format with eligibility
      const schedule = tournaments.map((tournament: any) => ({
        id: tournament._id.toString(),
        tier: tournament.tier || null,
        type: tournament.type,
        startDate: tournament.startTime.toISOString(),
        prizePool: tournament.prizePool,
        filledSpots: tournament.users?.length || 0,
        totalSpots: tournament.maxUsers,
        entryFee: tournament.buyInFee || 0, // buyInFee maps to entryFee
        isEligible: meetsTierRequirement(userTier, tournament.tier),
      }));

      return NextResponse.json(schedule, { status: 200 });
    } catch (error: any) {
      console.error('[Tournament Schedule API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to get tournament schedule', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/tournaments/schedule.test.ts
```
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/tournaments/schedule/route.ts __tests__/integration/api/tournaments/schedule.test.ts
git commit -m "feat(ladder): add tournament schedule endpoint with tier eligibility"
```

---

## Domain 5: Analytics Funnel (Admin Only)

### Task 5.1: Create analytics funnel endpoint with tests

**Files:**
- Create: `src/app/api/analytics/funnel/route.ts`
- Test: `__tests__/integration/api/analytics/funnel.test.ts`

**Step 1: Write the failing test**

Create `__tests__/integration/api/analytics/funnel.test.ts`:

```typescript
import { GET } from '@/app/api/analytics/funnel/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import UserEvents from '@/app/models/userEvent.model';
import Tournaments from '@/app/models/tournament.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');
jest.mock('@/app/models/prediction.model');
jest.mock('@/app/models/walletTransaction.model');
jest.mock('@/app/models/userEvent.model');
jest.mock('@/app/models/tournament.model');

describe('GET /api/analytics/funnel', () => {
  const mockAdminSession = {
    user: { id: 'admin-id', username: 'admin', role: 'ADMIN' },
  };

  const mockUserSession = {
    user: { id: 'user-id', username: 'user', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return funnel metrics for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);

    // Mock count queries
    (Users.countDocuments as jest.Mock).mockResolvedValue(100);
    (Predictions.distinct as jest.Mock).mockResolvedValue(new Array(75)); // 75 users with picks
    (WalletTransactions.distinct as jest.Mock).mockResolvedValue(new Array(30)); // 30 users deposited
    (UserEvents.distinct as jest.Mock).mockResolvedValue(new Array(50)); // 50 WAU
    (UserEvents.countDocuments as jest.Mock).mockResolvedValue(100); // 100 tournament joins
    (Tournaments.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { users: [1, 2, 3], maxUsers: 10 }, // 30% fill
        { users: [1, 2], maxUsers: 10 }, // 20% fill
      ]),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.signupToFirstPick).toBe(75); // 75/100 * 100
    expect(data.pickToDeposit).toBe(40); // 30/75 * 100
    expect(data.weeklyActiveUsers).toBe(50);
  });

  it('should reject non-admin users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockUserSession);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Admin access required');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should validate period parameter', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=invalid');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid period');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/integration/api/analytics/funnel.test.ts
```
Expected: FAIL - "Cannot find module '@/app/api/analytics/funnel/route'"

**Step 3: Create the API endpoint**

Create `src/app/api/analytics/funnel/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import UserEvents from '@/app/models/userEvent.model';
import Tournaments from '@/app/models/tournament.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * Calculate period date range
 */
function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    default:
      throw new Error('Invalid period');
  }
  return now;
}

/**
 * GET /api/analytics/funnel
 *
 * Admin-only analytics for conversion funnel
 */
export const GET = withRateLimit(
  RateLimitPresets.READONLY,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Check admin role
      // Note: Adjust this check based on your actual admin role field
      const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'admin';
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // 3. Get period parameter
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '7d';

      if (!['7d', '30d', '90d'].includes(period)) {
        return NextResponse.json(
          { error: 'Invalid period. Must be 7d, 30d, or 90d' },
          { status: 400 }
        );
      }

      // 4. Connect to database
      await connectToDB();

      // 5. Calculate period start date
      const startDate = getPeriodDate(period);

      // 6. Calculate signupToFirstPick
      const newUsers = await Users.countDocuments({
        createdAt: { $gte: startDate },
      });

      const usersWithPicks = await Predictions.distinct('user.userId', {
        createdAt: { $gte: startDate },
      });

      const signupToFirstPick = newUsers > 0 ? (usersWithPicks.length / newUsers) * 100 : 0;

      // 7. Calculate pickToDeposit
      const usersWithDeposits = await WalletTransactions.distinct('user_id', {
        type: 'deposit',
        created_at: { $gte: startDate },
      });

      const pickToDeposit = usersWithPicks.length > 0
        ? (usersWithDeposits.length / usersWithPicks.length) * 100
        : 0;

      // 8. Calculate WAU (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyActiveUsers = await UserEvents.distinct('user_id', {
        created_at: { $gte: sevenDaysAgo },
      });

      // 9. Calculate entriesPerUserPerWeek
      const tournamentJoins = await UserEvents.countDocuments({
        event_type: 'tournament_joined',
        created_at: { $gte: sevenDaysAgo },
      });

      const usersWhoJoinedTournaments = await UserEvents.distinct('user_id', {
        event_type: 'tournament_joined',
        created_at: { $gte: sevenDaysAgo },
      });

      const entriesPerUserPerWeek = usersWhoJoinedTournaments.length > 0
        ? tournamentJoins / usersWhoJoinedTournaments.length
        : 0;

      // 10. Calculate deposit conversion by rail (simplified - using events)
      const achStartedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_started',
        'event_data.method': 'ach',
        created_at: { $gte: startDate },
      });

      const achCompletedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_completed',
        'event_data.method': 'ach',
        created_at: { $gte: startDate },
      });

      const cardStartedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_started',
        'event_data.method': 'card',
        created_at: { $gte: startDate },
      });

      const cardCompletedEvents = await UserEvents.countDocuments({
        event_type: 'deposit_completed',
        'event_data.method': 'card',
        created_at: { $gte: startDate },
      });

      const depositConversionByRail = {
        ach: achStartedEvents > 0 ? (achCompletedEvents / achStartedEvents) * 100 : 0,
        card: cardStartedEvents > 0 ? (cardCompletedEvents / cardStartedEvents) * 100 : 0,
      };

      // 11. Calculate tournament fill rate
      const endedTournaments = await Tournaments.find({
        endTime: { $gte: startDate, $lte: new Date() },
      }).lean();

      let totalFillRate = 0;
      if (endedTournaments.length > 0) {
        const fillRates = endedTournaments.map((t: any) =>
          (t.users?.length || 0) / t.maxUsers
        );
        totalFillRate = (fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 100;
      }

      // 12. Tier churn rate (simplified - return 0 for now, requires historical tracking)
      const tierChurnRate = {
        rookie: 0,
        silver: 0,
        gold: 0,
        pro: 0,
      };

      return NextResponse.json(
        {
          signupToFirstPick: Math.round(signupToFirstPick),
          pickToDeposit: Math.round(pickToDeposit),
          weeklyActiveUsers: weeklyActiveUsers.length,
          entriesPerUserPerWeek: Math.round(entriesPerUserPerWeek * 10) / 10,
          depositConversionByRail: {
            ach: Math.round(depositConversionByRail.ach),
            card: Math.round(depositConversionByRail.card),
          },
          tournamentFillRate: Math.round(totalFillRate),
          tierChurnRate,
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[Analytics Funnel API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to calculate analytics', message: error.message },
        { status: 500 }
      );
    }
  }
);
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/integration/api/analytics/funnel.test.ts
```
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/app/api/analytics/funnel/route.ts __tests__/integration/api/analytics/funnel.test.ts
git commit -m "feat(analytics): add admin funnel analytics endpoint"
```

---

## Final Integration Testing

### Task 6.1: Run full test suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (including existing 363 tests + new Track 2 tests)

**Step 2: Check test coverage**

```bash
npm test -- --coverage
```

Expected: Overall coverage ≥ 85%

**Step 3: If any tests fail, fix them before proceeding**

Debug failing tests one at a time:
```bash
npm test -- <failing-test-file> --verbose
```

**Step 4: Commit if fixes were needed**

```bash
git add .
git commit -m "fix: resolve integration test failures"
```

### Task 6.2: Update .env.example if needed

**Files:**
- Modify: `.env.example`

**Step 1: Check if new env vars are needed**

Review all endpoints - Track 2 uses existing env vars (no new ones needed).

**Step 2: If no changes needed, skip to next task**

### Task 6.3: Create summary commit

**Step 1: Create final commit**

```bash
git add .
git commit -m "$(cat <<'EOF'
feat(track-2): implement all 10 Track 2 API endpoints

- Guest migration (1 endpoint)
- Wallet stubs (3 endpoints + 2 models)
- Notifications (3 endpoints + 1 model + user preferences)
- Ladder tiers (2 endpoints + tier calculation)
- Analytics funnel (1 admin endpoint)

All features use stubs for external services (ACH, push, SMS).
Test coverage: 85%+

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Success Criteria

All 10 endpoints implemented:
- ✅ `POST /api/guest/migrate`
- ✅ `POST /api/wallet/deposit/ach`
- ✅ `GET /api/wallet/ach-status`
- ✅ `PATCH /api/wallet/preferred-method`
- ✅ `POST /api/notifications/push/subscribe`
- ✅ `GET /api/notifications/preferences`
- ✅ `PATCH /api/notifications/preferences`
- ✅ `GET /api/tournaments/ladder/me`
- ✅ `GET /api/tournaments/schedule`
- ✅ `GET /api/analytics/funnel`

All tests passing (85%+ coverage)
No breaking changes to existing endpoints
All commits follow conventional commit format

---

## Notes for Implementer

- **TDD approach**: Write test first, run to see it fail, implement, run to see it pass, commit
- **Frequent commits**: Commit after each task completion
- **DRY**: Use existing Phase 2 infrastructure (rate limiting, auth, audit logging)
- **YAGNI**: Stub implementations only - no real ACH/push/SMS integration yet
- **Field names**: Preserve existing field names - no renaming
- **Test isolation**: Each test file should be independently runnable

## Execution Strategy

**Parallel execution**: All 5 domains are independent and can be implemented in parallel by different agents or developers. No blocking dependencies between domains.

**Recommended order if sequential**:
1. Domain 1 (Guest Migration) - Simplest, good warm-up
2. Domain 2 (Wallet) - Most models/endpoints
3. Domain 3 (Notifications) - User model extension
4. Domain 4 (Ladder) - Tier calculation logic
5. Domain 5 (Analytics) - Admin-only, aggregation logic

**Estimated time per domain**:
- Domain 1: 30-45 minutes
- Domain 2: 60-90 minutes
- Domain 3: 45-60 minutes
- Domain 4: 60-75 minutes
- Domain 5: 45-60 minutes

**Total if parallel**: 90 minutes (limited by Domain 2)
**Total if sequential**: 4-5 hours
