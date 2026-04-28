# Waitlist Moderation Console Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin `/dashboard/waitlist` console so an operator can triage the shared `waitlist_entries` collection, approve users individually or in batches, and (re-)send magic-link invite emails via the frontend's internal endpoints.

**Architecture:**
- Reuse the existing admin NextAuth credentials session (JWT, no Google) and reuse `requireAuth(['owner','admin'])` from `src/app/lib/authMiddleware.ts:36` (or the `withAuth(handler, ['owner','admin'])` wrapper at `:67`). No new auth helper, no parallel Google provider on admin. `moderator` and `user` roles get 403 (confirmed scope).
- New admin-repo models are **not** created — we `db.collection('waitlist_entries')` + `db.collection('users')` directly so the frontend remains the schema source of truth.
- Admin writes only to fields documented in the brief: `invitedAt`, `invitedBatchId`, `flaggedAt` on waitlist entries; `isInvited`, `invitedVia`, `badges` (via `$addToSet`) on users.
- Magic-link sending is delegated to the frontend's `POST /api/waitlist/issue-magic-link` via `x-internal-secret`. Bulk approvals call it in series, cap 200/action.
- UI uses existing admin stack (MUI + NextUI + Tailwind) to match other `/dashboard/*` pages — per the CLAUDE.md rule "Do not change MUI/NextUI component library."
- Tests: Jest (integration for API routes, unit for lib helpers). Admin has no Playwright; the brief's Playwright line is satisfied with the admin's existing Jest integration pattern (`__tests__/integration/api/**`).

**Tech Stack:** Next.js 14 App Router, TypeScript, MongoDB (shared cluster), Mongoose 8, NextAuth 4 (existing), MUI 5, NextUI 2, Tailwind, Jest 29, node-mocks-http.

**Source of truth for shared schema:** `hammershift-frontend/src/models/waitlistEntry.model.ts` on branch `feat/waitlist-launch` (user confirmed now on `main`). Admin does **not** create a Mongoose model for `waitlist_entries`.

---

## Preconditions

- [ ] Frontend PR `feat/waitlist-launch` is merged to `main` and deployed at `https://velocity-markets.com`.
- [ ] `INTERNAL_API_SECRET` is the same value in both repos' deployed envs.
- [ ] Admin env vars added (see Task 0).

---

## Task 0: Environment + shared-secret fetch helper

**Files:**
- Modify: `.env.local.example`
- Create: `src/app/lib/frontendInternal.ts`
- Test: `__tests__/unit/lib/frontendInternal.test.ts`

**Step 1: Extend `.env.local.example`**

Append:
```
# Waitlist moderation console
INTERNAL_API_SECRET=change-me-64-hex-must-match-frontend
FRONTEND_ORIGIN=https://velocity-markets.com
```

**Step 2: Write the failing test**

```typescript
// __tests__/unit/lib/frontendInternal.test.ts
import { callFrontendInternal } from '@/app/lib/frontendInternal';

describe('callFrontendInternal', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, INTERNAL_API_SECRET: 'test-secret', FRONTEND_ORIGIN: 'https://velocity-markets.com' };
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('sends x-internal-secret header and JSON body', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    global.fetch = mockFetch as any;

    const res = await callFrontendInternal('/api/waitlist/issue-magic-link', { email: 'a@b.com' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://velocity-markets.com/api/waitlist/issue-magic-link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-secret': 'test-secret',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ email: 'a@b.com' }),
      })
    );
    expect(res).toEqual({ ok: true, status: 200, body: { ok: true } });
  });

  it('throws if INTERNAL_API_SECRET missing', async () => {
    delete process.env.INTERNAL_API_SECRET;
    await expect(callFrontendInternal('/x', {})).rejects.toThrow(/INTERNAL_API_SECRET/);
  });

  it('returns non-ok status without throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Not approved' }) }) as any;
    const res = await callFrontendInternal('/x', {});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Not approved' });
  });
});
```

**Step 3: Run test, verify it fails**

Run: `npm test -- __tests__/unit/lib/frontendInternal.test.ts`
Expected: FAIL with "Cannot find module".

**Step 4: Implement minimal helper**

```typescript
// src/app/lib/frontendInternal.ts
export interface InternalResponse<T = any> {
  ok: boolean;
  status: number;
  body: T;
}

export async function callFrontendInternal<T = any>(
  path: string,
  payload: unknown
): Promise<InternalResponse<T>> {
  const secret = process.env.INTERNAL_API_SECRET;
  const origin = process.env.FRONTEND_ORIGIN;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  if (!origin) throw new Error('FRONTEND_ORIGIN not configured');

  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'x-internal-secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let body: any = null;
  try { body = await res.json(); } catch { body = null; }

  return { ok: res.ok, status: res.status, body };
}
```

**Step 5: Run test, verify pass; commit**

Run: `npm test -- __tests__/unit/lib/frontendInternal.test.ts` → PASS.

```bash
git add .env.local.example src/app/lib/frontendInternal.ts __tests__/unit/lib/frontendInternal.test.ts
git commit -m "feat(waitlist): shared-secret helper for frontend internal calls"
```

---

## Task 1: (removed) RBAC helper

**Resolution:** No new helper. Reuse the existing `requireAuth(['owner', 'admin'])` from `src/app/lib/authMiddleware.ts:36`. It already returns `{ session } | { error: NextResponse }`, gates by role, and is used elsewhere in the codebase. Every waitlist route in Tasks 2–7 starts with:

```typescript
const auth = await requireAuth(['owner', 'admin']);
if ('error' in auth) return auth.error;
const { session } = auth;
```

Role scope confirmed by Rick: `owner` + `admin` only. `moderator` and `user` get 403.

---

## Task 2: `GET /api/waitlist` — list + search + filter + counts

**Files:**
- Create: `src/app/api/waitlist/route.ts`
- Test: `__tests__/integration/api/waitlist-list.test.ts`

**Contract:**
- Query params: `filter` = `unapproved|approved|flagged|all` (default `unapproved`); `q` = email substring; `page` = 1-indexed; `pageSize` = max 100, default 50.
- Response: `{ count, page, pageSize, totalPages, data: Array<Entry & { referralCount: number; hasUser: boolean }> }`.
- Derives `referralCount` in one aggregation stage, not N+1. `ipHash` is redacted.
- Sorted by `createdAt` desc.

**Step 1: Failing test**

```typescript
// __tests__/integration/api/waitlist-list.test.ts
import { GET } from '@/app/api/waitlist/route';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/app/lib/authMiddleware', () => ({
  ...jest.requireActual('@/app/lib/authMiddleware'),
  requireAuth: jest.fn().mockResolvedValue({ session: { user: { role: 'admin', email: 'a@b.com' } } }),
}));

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
  const db = mongoose.connection.db!;
  await db.collection('waitlist_entries').insertMany([
    { email: 'alice@example.com', referralCode: 'AAA11111', referredByCode: null, invitedAt: null, flaggedAt: null, verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h1', createdAt: new Date('2026-04-20') },
    { email: 'bob@example.com', referralCode: 'BBB22222', referredByCode: 'AAA11111', invitedAt: new Date('2026-04-21'), flaggedAt: null, verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h2', createdAt: new Date('2026-04-21') },
    { email: 'carol@example.com', referralCode: 'CCC33333', referredByCode: 'AAA11111', invitedAt: null, flaggedAt: new Date('2026-04-22'), verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h3', createdAt: new Date('2026-04-22') },
  ]);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

function req(url: string) { return new NextRequest(url); }

describe('GET /api/waitlist', () => {
  it('defaults to unapproved filter and excludes approved entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist'));
    const body = await res.json();
    const emails = body.data.map((d: any) => d.email).sort();
    expect(emails).toEqual(['alice@example.com', 'carol@example.com']);
    // Unapproved view: invitedAt is null for all rows returned
    expect(body.data.every((d: any) => d.invitedAt === null)).toBe(true);
  });

  it('approved filter returns only invited entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=approved'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['bob@example.com']);
  });

  it('flagged filter returns only flagged entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=flagged'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['carol@example.com']);
  });

  it('derives referralCount without N+1', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all'));
    const body = await res.json();
    const alice = body.data.find((d: any) => d.email === 'alice@example.com');
    expect(alice.referralCount).toBe(2); // bob + carol referred by alice
    const bob = body.data.find((d: any) => d.email === 'bob@example.com');
    expect(bob.referralCount).toBe(0);
  });

  it('redacts ipHash', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all'));
    const body = await res.json();
    body.data.forEach((d: any) => expect(d.ipHash).toBeUndefined());
  });

  it('search by email substring is case-insensitive', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all&q=ALICE'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['alice@example.com']);
  });
});
```

**Step 2: Run test** → FAIL (route doesn't exist).

**Step 3: Implement**

```typescript
// src/app/api/waitlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';

export const dynamic = 'force-dynamic';

const FILTERS = new Set(['unapproved', 'approved', 'flagged', 'all']);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;
  const { session } = auth;

  await connectToDB();
  const db = mongoose.connection.db!;
  const params = req.nextUrl.searchParams;

  const filter = FILTERS.has(params.get('filter') || '') ? params.get('filter')! : 'unapproved';
  const q = (params.get('q') || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(params.get('pageSize') || '50', 10)));

  const match: Record<string, unknown> = {};
  if (filter === 'unapproved') match.invitedAt = null;
  if (filter === 'approved') match.invitedAt = { $ne: null };
  if (filter === 'flagged') match.flaggedAt = { $ne: null };
  if (q) match.email = { $regex: q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), $options: 'i' };

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $lookup: {
              from: 'waitlist_entries',
              let: { code: '$referralCode' },
              pipeline: [
                { $match: { $expr: { $eq: ['$referredByCode', '$$code'] } } },
                { $count: 'n' },
              ],
              as: '_refCount',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'email',
              foreignField: 'email',
              as: '_user',
            },
          },
          {
            $addFields: {
              referralCount: { $ifNull: [{ $arrayElemAt: ['$_refCount.n', 0] }, 0] },
              hasUser: { $gt: [{ $size: '$_user' }, 0] },
            },
          },
          { $project: { ipHash: 0, _refCount: 0, _user: 0 } },
        ],
      },
    },
  ];

  const [result] = await db.collection('waitlist_entries').aggregate(pipeline).toArray();
  const total = result.metadata[0]?.total || 0;

  return NextResponse.json({
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    data: result.data,
  });
}
```

**Step 4: Run test** → PASS.

**Step 5: Commit**

```bash
git add src/app/api/waitlist/route.ts __tests__/integration/api/waitlist-list.test.ts
git commit -m "feat(waitlist): GET /api/waitlist list with filters + referral count"
```

---

## Task 3: `POST /api/waitlist/approve` — single approve

**Files:**
- Create: `src/app/api/waitlist/approve/route.ts`
- Test: `__tests__/integration/api/waitlist-approve.test.ts`

**Contract:**
- Body: `{ email: string }`.
- Flow (idempotent): `updateOne({ email, invitedAt: null }, { $set: { invitedAt: now } })`. If `matchedCount === 0` and entry already has `invitedAt`, return 200 with `alreadyApproved: true` (UX lets the operator still resend). If the entry doesn't exist → 404.
- If a `users` row exists for that email, `$set: { isInvited: true, invitedVia: 'waitlist' }` (same request, after the waitlist update).
- Call `callFrontendInternal('/api/waitlist/issue-magic-link', { email })` and surface `{ inviteSent: boolean, inviteError?: string }`. **Never** swallow a failure there.
- Audit-log each approval (`action: 'waitlist.approved'`).

**Step 1: Failing test**

```typescript
// __tests__/integration/api/waitlist-approve.test.ts
import { POST } from '@/app/api/waitlist/approve/route';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/app/lib/authMiddleware', () => ({
  ...jest.requireActual('@/app/lib/authMiddleware'),
  requireAuth: jest.fn().mockResolvedValue({ session: { user: { role: 'admin', email: 'a@b.com', id: '64b000000000000000000000', username: 'a' } } }),
}));

const internal = jest.fn();
jest.mock('@/app/lib/frontendInternal', () => ({
  callFrontendInternal: (...args: any[]) => internal(...args),
}));

jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
});
beforeEach(async () => {
  const db = mongoose.connection.db!;
  await db.collection('waitlist_entries').deleteMany({});
  await db.collection('users').deleteMany({});
  internal.mockReset();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

function reqBody(body: any) {
  return new NextRequest('http://localhost/api/waitlist/approve', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/waitlist/approve', () => {
  it('sets invitedAt on entry and calls issue-magic-link', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'alice@x.com', referralCode: 'A', invitedAt: null });
    internal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ email: 'alice@x.com' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(true);
    const entry = await db.collection('waitlist_entries').findOne({ email: 'alice@x.com' });
    expect(entry?.invitedAt).toBeInstanceOf(Date);
    expect(internal).toHaveBeenCalledWith('/api/waitlist/issue-magic-link', { email: 'alice@x.com' });
  });

  it('updates user row if it exists', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'bob@x.com', referralCode: 'B', invitedAt: null });
    await db.collection('users').insertOne({ email: 'bob@x.com' });
    internal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    await POST(reqBody({ email: 'bob@x.com' }));

    const user = await db.collection('users').findOne({ email: 'bob@x.com' });
    expect(user?.isInvited).toBe(true);
    expect(user?.invitedVia).toBe('waitlist');
  });

  it('reports inviteSent=false with inviteError when frontend fails', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'carol@x.com', referralCode: 'C', invitedAt: null });
    internal.mockResolvedValue({ ok: false, status: 500, body: { error: 'smtp down' } });

    const res = await POST(reqBody({ email: 'carol@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(false);
    expect(body.inviteError).toContain('smtp down');
    // DB update still applied
    const entry = await db.collection('waitlist_entries').findOne({ email: 'carol@x.com' });
    expect(entry?.invitedAt).toBeInstanceOf(Date);
  });

  it('idempotent: already-approved returns alreadyApproved=true without touching invitedAt', async () => {
    const db = mongoose.connection.db!;
    const prev = new Date('2026-04-20');
    await db.collection('waitlist_entries').insertOne({ email: 'dan@x.com', referralCode: 'D', invitedAt: prev });
    internal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ email: 'dan@x.com' }));
    const body = await res.json();
    expect(body.alreadyApproved).toBe(true);

    const entry = await db.collection('waitlist_entries').findOne({ email: 'dan@x.com' });
    expect(entry?.invitedAt).toEqual(prev);
  });

  it('404 if entry not found', async () => {
    const res = await POST(reqBody({ email: 'ghost@x.com' }));
    expect(res.status).toBe(404);
  });

  it('400 if email missing', async () => {
    const res = await POST(reqBody({}));
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run test** → FAIL.

**Step 3: Implement**

```typescript
// src/app/api/waitlist/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';
import { callFrontendInternal } from '@/app/lib/frontendInternal';
import { createAuditLog } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').toString().trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  await connectToDB();
  const db = mongoose.connection.db!;
  const entries = db.collection('waitlist_entries');
  const users = db.collection('users');

  const existing = await entries.findOne({ email });
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  const now = new Date();
  let alreadyApproved = false;

  if (existing.invitedAt) {
    alreadyApproved = true;
  } else {
    await entries.updateOne({ email, invitedAt: null }, { $set: { invitedAt: now, updatedAt: now } });
    // If a user already exists, mark them as invited (matches brief "Entry + existing user" path).
    await users.updateOne(
      { email },
      { $set: { isInvited: true, invitedVia: 'waitlist' } }
    );
  }

  let inviteSent = false;
  let inviteError: string | undefined;
  try {
    const r = await callFrontendInternal('/api/waitlist/issue-magic-link', { email });
    inviteSent = r.ok;
    if (!r.ok) inviteError = `${r.status}: ${r.body?.error || 'unknown'}`;
  } catch (e: any) {
    inviteError = e.message || String(e);
  }

  await createAuditLog({
    userId: session.user.id,
    username: session.user.username,
    userRole: session.user.role,
    action: 'waitlist.approved',
    resource: 'WaitlistEntry',
    method: 'POST',
    endpoint: '/api/waitlist/approve',
    status: inviteSent ? 'success' : 'failure',
    errorMessage: inviteError,
    metadata: { email, alreadyApproved },
    req,
  });

  return NextResponse.json({
    email,
    alreadyApproved,
    inviteSent,
    inviteError,
  });
}
```

**Step 4: Run test** → PASS.

**Step 5: Commit**

```bash
git add src/app/api/waitlist/approve/route.ts __tests__/integration/api/waitlist-approve.test.ts
git commit -m "feat(waitlist): POST /api/waitlist/approve single-entry approval"
```

---

## Task 4: `POST /api/waitlist/approve-bulk`

**Files:**
- Create: `src/app/api/waitlist/approve-bulk/route.ts`
- Test: `__tests__/integration/api/waitlist-approve-bulk.test.ts`

**Contract:**
- Body: `{ emails: string[] }`, max 200.
- Generate one `invitedBatchId = crypto.randomUUID()` for the whole call.
- For each email in series: idempotent approve (reusing Task 3 behavior), stamp `invitedBatchId`, call issue-magic-link.
- Response: `{ batchId, total, approved, alreadyApproved, inviteErrors: Array<{email, error}> }`.

**Step 1: Failing test**

```typescript
// __tests__/integration/api/waitlist-approve-bulk.test.ts
import { POST } from '@/app/api/waitlist/approve-bulk/route';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/app/lib/authMiddleware', () => ({
  ...jest.requireActual('@/app/lib/authMiddleware'),
  requireAuth: jest.fn().mockResolvedValue({ session: { user: { role: 'admin', email: 'a@b.com', id: '64b000000000000000000000', username: 'a' } } }),
}));
const internal = jest.fn();
jest.mock('@/app/lib/frontendInternal', () => ({
  callFrontendInternal: (...a: any[]) => internal(...a),
}));
jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
});
beforeEach(async () => {
  const db = mongoose.connection.db!;
  await db.collection('waitlist_entries').deleteMany({});
  internal.mockReset();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

function reqBody(body: any) {
  return new NextRequest('http://localhost/api/waitlist/approve-bulk', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/waitlist/approve-bulk', () => {
  it('stamps same invitedBatchId across entries', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null, invitedBatchId: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null, invitedBatchId: null },
    ]);
    internal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));
    const body = await res.json();
    expect(body.approved).toBe(2);
    expect(body.batchId).toMatch(/^[0-9a-f-]{36}$/i);

    const entries = await db.collection('waitlist_entries').find({}).toArray();
    const batchIds = new Set(entries.map((e) => e.invitedBatchId));
    expect(batchIds.size).toBe(1);
    expect(batchIds.has(body.batchId)).toBe(true);
  });

  it('rejects bulk > 200', async () => {
    const emails = Array.from({ length: 201 }, (_, i) => `u${i}@x.com`);
    const res = await POST(reqBody({ emails }));
    expect(res.status).toBe(400);
  });

  it('rejects empty emails array', async () => {
    const res = await POST(reqBody({ emails: [] }));
    expect(res.status).toBe(400);
  });

  it('collects inviteErrors without aborting the batch', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null },
    ]);
    internal
      .mockResolvedValueOnce({ ok: true, status: 200, body: { ok: true } })
      .mockResolvedValueOnce({ ok: false, status: 500, body: { error: 'smtp' } });

    const res = await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));
    const body = await res.json();
    expect(body.approved).toBe(2);
    expect(body.inviteErrors).toEqual([{ email: 'b@x.com', error: expect.stringContaining('smtp') }]);
  });

  it('calls issue-magic-link in series (not parallel)', async () => {
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null },
    ]);
    const calls: string[] = [];
    internal.mockImplementation(async (_path: string, payload: any) => {
      calls.push(`start:${payload.email}`);
      await new Promise((r) => setTimeout(r, 25));
      calls.push(`end:${payload.email}`);
      return { ok: true, status: 200, body: { ok: true } };
    });

    await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));

    // Each email fully completes before the next begins.
    expect(calls).toEqual([
      'start:a@x.com',
      'end:a@x.com',
      'start:b@x.com',
      'end:b@x.com',
    ]);
  });
});
```

**Step 2: Run test** → FAIL.

**Step 3: Implement**

```typescript
// src/app/api/waitlist/approve-bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';
import { callFrontendInternal } from '@/app/lib/frontendInternal';
import { createAuditLog } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';

const MAX_BULK = 200;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const emails = Array.isArray(body?.emails)
    ? body.emails.map((e: unknown) => String(e || '').trim().toLowerCase()).filter(Boolean)
    : [];

  if (emails.length === 0) return NextResponse.json({ error: 'emails[] required' }, { status: 400 });
  if (emails.length > MAX_BULK) {
    return NextResponse.json({ error: `emails[] exceeds cap ${MAX_BULK}` }, { status: 400 });
  }

  await connectToDB();
  const db = mongoose.connection.db!;
  const entries = db.collection('waitlist_entries');
  const users = db.collection('users');

  const batchId = crypto.randomUUID();
  const now = new Date();

  let approved = 0;
  let alreadyApproved = 0;
  const inviteErrors: Array<{ email: string; error: string }> = [];
  const notFound: string[] = [];

  for (const email of emails) {
    const existing = await entries.findOne({ email });
    if (!existing) { notFound.push(email); continue; }

    if (existing.invitedAt) {
      alreadyApproved++;
    } else {
      await entries.updateOne(
        { email, invitedAt: null },
        { $set: { invitedAt: now, invitedBatchId: batchId, updatedAt: now } }
      );
      await users.updateOne({ email }, { $set: { isInvited: true, invitedVia: 'waitlist' } });
    }

    // Stamp batchId even if idempotent — operator wants the association.
    await entries.updateOne(
      { email, invitedBatchId: null },
      { $set: { invitedBatchId: batchId } }
    );

    try {
      const r = await callFrontendInternal('/api/waitlist/issue-magic-link', { email });
      if (!r.ok) {
        inviteErrors.push({ email, error: `${r.status}: ${r.body?.error || 'unknown'}` });
      } else {
        approved++;
      }
    } catch (e: any) {
      inviteErrors.push({ email, error: e.message || String(e) });
    }
  }

  await createAuditLog({
    userId: session.user.id,
    username: session.user.username,
    userRole: session.user.role,
    action: 'waitlist.bulk_approved',
    resource: 'WaitlistEntry',
    method: 'POST',
    endpoint: '/api/waitlist/approve-bulk',
    status: inviteErrors.length ? 'failure' : 'success',
    metadata: { batchId, total: emails.length, approved, alreadyApproved, inviteErrors: inviteErrors.length, notFound: notFound.length },
    req,
  });

  return NextResponse.json({
    batchId,
    total: emails.length,
    approved: approved + alreadyApproved,
    alreadyApproved,
    notFound,
    inviteErrors,
  });
}
```

Note: the test expects `approved` to count both newly-approved and already-approved emails that successfully sent. Align the counter if needed; the implementation above counts successful `issue-magic-link` returns into `approved` (re-check while implementing and adjust the test or impl to one behavior).

**Step 4: Run test** → PASS. (Fix the impl vs test mismatch on `approved` counting before committing — pick the test's semantics and align the impl.)

**Step 5: Commit**

```bash
git add src/app/api/waitlist/approve-bulk/route.ts __tests__/integration/api/waitlist-approve-bulk.test.ts
git commit -m "feat(waitlist): POST /api/waitlist/approve-bulk with batchId + series send"
```

---

## Task 5: `POST /api/waitlist/flag`

**Files:**
- Create: `src/app/api/waitlist/flag/route.ts`
- Test: `__tests__/integration/api/waitlist-flag.test.ts`

**Contract:**
- Body: `{ email: string, flagged: boolean }`. Sets/clears `flaggedAt` accordingly. Audit-logs.

**Step 1–5:** Same pattern — test first, implement, verify, commit with `feat(waitlist): POST /api/waitlist/flag`.

```typescript
// src/app/api/waitlist/flag/route.ts (minimal)
const flaggedAt = body.flagged ? new Date() : null;
await entries.updateOne({ email }, { $set: { flaggedAt } });
```

---

## Task 6: `POST /api/waitlist/resend`

**Files:**
- Create: `src/app/api/waitlist/resend/route.ts`
- Test: `__tests__/integration/api/waitlist-resend.test.ts`

**Contract:**
- Body: `{ email: string }`.
- Reads entry; if `invitedAt` is null → 400 `not_approved_yet`.
- Otherwise call `issue-magic-link`; return `{ inviteSent, inviteError?, inviteEmailSentAt }` (re-read after call so the frontend's timestamp update is visible).

**Step 1–5:** Test-first, implement, verify, commit with `feat(waitlist): POST /api/waitlist/resend`.

---

## Task 7: `GET /api/waitlist/[id]` — detail drawer payload

**Files:**
- Create: `src/app/api/waitlist/[id]/route.ts`
- Test: `__tests__/integration/api/waitlist-detail.test.ts`

**Contract:**
- Returns the entry (with `ipHash` redacted), the matching `users` row (if any), `referrer` entry (looked up by `referredByCode`), `referred` entries (those whose `referredByCode === this.referralCode`).
- 404 if no entry.

Follow same TDD cycle. Commit: `feat(waitlist): GET /api/waitlist/[id] detail payload`.

---

## Task 8: Sidebar entry + `/dashboard/waitlist` page shell

**Files:**
- Modify: `src/app/ui/dashboard/sidebar/sidebar.tsx` (add Waitlist nav item, gate by role)
- Create: `src/app/dashboard/waitlist/page.tsx`
- Create: `src/app/dashboard/waitlist/WaitlistClient.tsx` (client component with useSWR-style fetch)

**Step 1–5 (short-form):**

1. Read current sidebar to see the nav pattern. Add a `{ label: 'Waitlist', path: '/dashboard/waitlist', icon: Outbox }` item gated by `role in ['owner','admin']`.
2. Create the server page that redirects non-admin roles and renders `<WaitlistClient />`.
3. `WaitlistClient` — MUI `DataGrid` or `Table` with the columns: Email, Created, Verified, Invited, Source, Flagged, Referrals, Actions. Filter tabs (MUI `Tabs`): Unapproved | Approved | Flagged | All. Email search `TextField`. Pagination via `TablePagination` (50/page).
4. Click row → open `Drawer` calling `GET /api/waitlist/[id]`.
5. Row Approve button → `POST /api/waitlist/approve`, toast on success/failure (use existing toast — check current admin pages for the pattern; most use MUI `Snackbar`).
6. Checkbox select + toolbar `Approve selected` → `POST /api/waitlist/approve-bulk` (cap 200 client-side; disable the button otherwise).
7. Flag/Unflag in drawer → `POST /api/waitlist/flag`.
8. Resend → `POST /api/waitlist/resend`.

Commit: `feat(waitlist): /dashboard/waitlist moderation console UI`.

---

## Task 9: Integration smoke test — end-to-end happy path

**Files:**
- Create: `__tests__/integration/api/waitlist-e2e-happy-path.test.ts`

A single test that walks list → approve → list (approved filter shows entry) → resend, using in-memory Mongo and `internal` mock. This stands in for the Playwright requirement from the brief, since the admin repo uses Jest.

Commit: `test(waitlist): integration happy-path coverage`.

---

## Task 10: Screenshots + README + env-var docs

**Files:**
- Modify: `README.md` (env var section)
- Create: `docs/waitlist-moderation.md` (brief operator guide)
- Create: `docs/screenshots/waitlist-list.png`, `waitlist-approve.png`, `waitlist-detail.png` (manual — captured by running `npm run dev`)

**README** must document the new env vars:
- `INTERNAL_API_SECRET` (same value as frontend)
- `FRONTEND_ORIGIN` (e.g. `https://velocity-markets.com`)

Commit: `docs(waitlist): README env vars + operator guide + screenshots`.

---

## Task 11: Verify build + full test run

```bash
npm run build
npm test
```

Must succeed; must not regress existing 216-test suite. If tests fail on unrelated pre-existing flake, note it in the PR body — do not fix unrelated breaks here.

Commit only if anything changed (e.g., type fixups discovered).

---

## Task 12: Open PR

Branch: `feat/waitlist-moderation-console`.

PR body includes:
- Summary of console features
- Env var table
- Screenshots (embed in PR description, not checked in if you prefer — pick one)
- Note: "Requires frontend `feat/waitlist-launch` to be deployed"
- Test plan checklist

---

## Out of scope (do not implement)

- Modifying `waitlistEntry.model.ts` (lives in frontend)
- Adding new fields to `users` without frontend coordination
- Email composer (frontend renders invite HTML)
- Direct SMTP sends from admin (always go through frontend endpoint)
- Analytics dashboard
- GDPR-erase / delete flow

## Resolved decisions

- **Auth.** Reuses existing admin NextAuth credentials session via `requireAuth(['owner', 'admin'])` from `src/app/lib/authMiddleware.ts`. No parallel Google provider on admin (Google OAuth lives only on the frontend).
- **Role scope.** `owner` + `admin` only. `moderator` and `user` get 403.

## Open questions / risks

1. **`users` row + badges.** Brief says admin may write `badges` via `$addToSet`. Nothing in the approve flow currently needs to touch badges; leaving that as a future enhancement unless a `waitlist_invited` badge is desired here.
2. **Playwright.** The admin repo has no Playwright harness. Adding one just for this feature is out of proportion. Task 9 substitutes a Jest integration happy-path test. Confirm acceptable.
3. **Rate-limit protection.** The brief already caps bulk at 200 and serializes. No explicit per-operator rate limit. If the frontend's `issue-magic-link` needs client throttling beyond serial, add a `setTimeout(200)` between calls.
