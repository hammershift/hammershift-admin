# Admin Phase 4: Financial Controls & Revenue Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a revenue dashboard, wallet browser with manual adjustment, transaction browser with filters, enhanced withdrawal page, and bulk refund API to the admin panel.

**Architecture:** 3 new UI pages under `/dashboard/financials/` + 5 new API routes under `/api/admin/financials/` + enhancement of existing withdrawal page. All API routes use raw MongoDB via `mongoose.connection.db!` (same pattern as Phase 2/3). All mutations require RBAC + audit logging.

**Tech Stack:** Next.js 14 App Router, TypeScript, Mongoose 8, Recharts 2.10.3 (already installed), Tailwind + inline styles (dark theme #0C1924)

---

## Known Codebase Patterns (MUST follow)

| Pattern | Detail |
|---------|--------|
| DB connect | `import connectToDB from "@/app/lib/mongoose"` (NOT `@/app/lib/dbConnect`) |
| RBAC | `getServerSession(authOptions)` from `next-auth`, check `["owner","admin"].includes(session.user.role)` |
| Auth options | `import { authOptions } from "@/app/api/auth/[...nextauth]/options"` |
| Audit logger | `import { createAuditLog, AuditActions, AuditResources } from "@/app/lib/auditLogger"` |
| Audit resources | UPPERCASE keys: `AuditResources.TRANSACTION`, `AuditResources.USER` |
| Route export | Add `export const dynamic = "force-dynamic"` to all API routes |
| Event handler types | Explicitly type: `(e: React.ChangeEvent<HTMLInputElement>) =>` |
| Recharts Tooltip | `formatter` signature: `(v: number, n: string) => [string, string]` |
| bulkWrite typing | Avoid — use individual `updateOne`/`insertOne` calls in loops (known TS issues) |
| Sidebar | Already has "Financial Dashboard" at `/dashboard/financials` and "Transactions" at `/dashboard/transactions` |

## Existing Transaction Models

Two separate models exist — the new API routes use **raw MongoDB queries** so they don't depend on either model directly, but the field names matter:

- `transaction.model.ts`: fields `userID`, `transactionType`, `amount`, `type` (+/-), `status` (processing/success/failed), `transactionDate`
- `walletTransaction.model.ts`: fields `user_id`, `type` (deposit/withdrawal), `amount` (cents), `status`
- Collection likely: `transactions` and `wallet_transactions`

The spec uses a **different field naming** (`user`, `createdAt`, `type` as string like 'deposit'). This is intentional — the new financials routes query the `transactions` collection with a broader schema that may include records from the frontend's newer transaction patterns. The spec's field names should be used as-is.

---

## Task 1: Financial Summary API

**Files:**
- Create: `src/app/api/admin/financials/summary/route.ts`

**Step 1: Create the route file**

Write the full summary API route with:
- RBAC check (getServerSession + role check)
- `export const dynamic = "force-dynamic"`
- `connectToDB` from `@/app/lib/mongoose`
- 7 parallel aggregations on `transactions` collection for: revenue, payouts, deposits, refunds, pending withdrawals, tournament revenue, GTH revenue
- Return `FinancialSummary` shape matching the page interface

Use the exact aggregation pipeline from the spec (lines 267-358) but fix:
- Import path: `@/app/lib/mongoose` not `@/app/lib/dbConnect`
- Add full RBAC block
- Add `export const dynamic`

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/app/api/admin/financials/summary/route.ts` or just verify via build later.

**Step 3: Commit**

```bash
git add src/app/api/admin/financials/summary/route.ts
git commit -m "feat(phase4): add financial summary API route"
```

---

## Task 2: Revenue Chart API

**Files:**
- Create: `src/app/api/admin/financials/revenue-chart/route.ts`

**Step 1: Create the route file**

Write the revenue chart API route with:
- RBAC check + `export const dynamic`
- `connectToDB` from `@/app/lib/mongoose`
- Accept `?range=7d|30d|90d` query param
- Two parallel aggregations: revenue by day/source and payouts by day/type
- Build date-keyed maps, initialize all days in range to zero
- Populate maps from aggregation rows
- Format date labels (short weekday for 7d, month+day for 30d/90d)
- Return `{ revenue: ChartPoint[], payouts: PayoutPoint[] }`

Use the exact pipeline from spec (lines 362-478) but fix import path and add RBAC.

**Step 2: Commit**

```bash
git add src/app/api/admin/financials/revenue-chart/route.ts
git commit -m "feat(phase4): add revenue chart API route"
```

---

## Task 3: Revenue Dashboard Page

**Files:**
- Create: `src/app/dashboard/financials/page.tsx`

**Step 1: Create the page file**

Write the financials dashboard page with:
- `"use client"` directive
- Recharts imports: `ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area`
- `TimeRange` type, `FinancialSummary`/`ChartPoint`/`PayoutPoint` interfaces
- State: summary, chartData, payoutData, timeRange, loading
- `load(range)` fetches both `/api/admin/financials/summary` and `/api/admin/financials/revenue-chart?range=` in parallel
- Header with links to Wallet Browser, All Transactions, Withdrawal Requests
- 8 summary cards grid (2x4) with accent colors
- Revenue chart (ComposedChart with stacked bars + refunds line)
- Payout chart (AreaChart with gradient fills)
- Dark theme: `#0C1924` background, `#13202D` card bg, `#2A3A4A` borders, `#F2CA16` accent

Use the exact JSX from spec (lines 52-263). The `useEffect` on line 116 will trigger an eslint warning about `timeRange` dep — that's fine, `load` captures it.

The Recharts `Tooltip` `formatter` prop types: ensure the callback matches `(value: number, name: string) => [string, string]`.

**Step 2: Commit**

```bash
git add src/app/dashboard/financials/page.tsx
git commit -m "feat(phase4): add financial dashboard page with revenue charts"
```

---

## Task 4: Wallet Browser API

**Files:**
- Create: `src/app/api/admin/financials/wallets/route.ts`

**Step 1: Create the route file**

Write the wallet browser API with two handlers:

**GET** — two modes:
1. `?search=<term>` — find users by username/email regex, join with `wallets` collection for balance, aggregate `transactions` for totals
2. `?userId=<id>&history=1` — return last 100 transactions for a user

**PATCH** — manual wallet adjustment (HIGH-RISK):
- RBAC check
- Require `userId`, `amount`, `reason` (reason is mandatory)
- Check wallet won't go negative
- `$inc` wallet balance
- Insert `adjustment` transaction record
- **Write audit log** with `createAuditLog()` — action `AuditActions.USER_BALANCE_UPDATE`, resource `AuditResources.USER`, include userId, amount, reason, newBalance in changes

Use spec code (lines 860-1017) but fix:
- Import `@/app/lib/mongoose`
- Add full RBAC blocks to both GET and PATCH
- Add `export const dynamic`
- Add real audit log call in PATCH (spec has placeholder comment)

**Step 2: Commit**

```bash
git add src/app/api/admin/financials/wallets/route.ts
git commit -m "feat(phase4): add wallet browser API with manual adjustment"
```

---

## Task 5: Wallet Browser Page

**Files:**
- Create: `src/app/dashboard/financials/wallets/page.tsx`

**Step 1: Create the page file**

Write the wallet browser page with:
- Search bar → calls `GET /api/admin/financials/wallets?search=`
- Wallet list (left column) → click to select
- Wallet detail (right 2 columns) → balance cards + tx history table
- Adjustment modal → +/- toggle, amount, mandatory reason field, warning banner
- Calls `PATCH /api/admin/financials/wallets` on submit
- All event handlers explicitly typed

Use spec code (lines 482-857). Fix:
- All `onChange={e =>` to `onChange={(e: React.ChangeEvent<HTMLInputElement>) =>`
- The `select` onChange should use `React.ChangeEvent<HTMLSelectElement>` if any

**Step 2: Commit**

```bash
git add src/app/dashboard/financials/wallets/page.tsx
git commit -m "feat(phase4): add wallet browser page with adjustment modal"
```

---

## Task 6: Transaction Browser API

**Files:**
- Create: `src/app/api/admin/financials/transactions/route.ts`

**Step 1: Create the route file**

Write the transaction browser API:
- GET with query params: page, limit, type, from, to, minAmount, maxAmount, user
- Type filter maps to multiple DB types (e.g., `prize` → `['prize','payout','winnings']`)
- Date range filter on `createdAt`
- Amount range filter
- User search: find matching user IDs first, then filter transactions
- Aggregation pipeline with `$lookup` to join user data
- Return `{ transactions, total, page, totalPages }`

Use spec code (lines 1241-1354) but fix import path and add RBAC + `export const dynamic`.

**Step 2: Commit**

```bash
git add src/app/api/admin/financials/transactions/route.ts
git commit -m "feat(phase4): add transaction browser API with filtering"
```

---

## Task 7: Transaction Browser Page

**Files:**
- Create: `src/app/dashboard/financials/transactions/page.tsx`

**Step 1: Create the page file**

Write the transaction browser page with:
- Filter bar: type select, date range inputs, amount range inputs, user search input, Apply button
- Paginated table: Date, User, Type (color-coded badge), Amount (+/- colored), Description, Source, Status
- Pagination controls: Previous/Next with page count
- `useCallback` for `load()` with all filter deps

Use spec code (lines 1019-1239). Fix:
- All `onChange` handlers explicitly typed
- `select` onChange: `React.ChangeEvent<HTMLSelectElement>`

**Step 2: Commit**

```bash
git add src/app/dashboard/financials/transactions/page.tsx
git commit -m "feat(phase4): add transaction browser page with filters and pagination"
```

---

## Task 8: Enhance Existing Withdrawal Page

**Files:**
- Modify: `src/app/dashboard/transactions/page.tsx`
- Modify: `src/app/ui/dashboard/transactionsPage/TransactionsPage.tsx`

**Step 1: Read current files**

Read both files fully before modifying. Current state:
- Page fetches 30 withdrawal transactions from `/api/transactions?limit=30`
- UI component renders a table with approve/decline modals
- No filtering, no pagination, no CSV export

**Step 2: Enhance the page component**

Add to `src/app/dashboard/transactions/page.tsx`:
- State for: `statusFilter` ('all'|'processing'|'success'|'failed'), `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `userSearch`, `page`
- Pass filter state as query params to existing `/api/transactions` endpoint (append `&status=&from=&to=&minAmount=&maxAmount=&search=&page=`)
- Pass filter state + setters + pagination to UI component

**Step 3: Enhance the UI component**

Add to `TransactionsPage.tsx`:
- Filter bar above the table (same style as transaction browser)
- Pagination controls below the table
- CSV export button in the header that generates a Blob download from current data
- **Do NOT break** the existing approve/decline modal functionality

The existing component uses `props: any` — keep that for now, just add the new props.

**Step 4: Commit**

```bash
git add src/app/dashboard/transactions/page.tsx src/app/ui/dashboard/transactionsPage/TransactionsPage.tsx
git commit -m "feat(phase4): enhance withdrawal page with filters, pagination, and CSV export"
```

---

## Task 9: Bulk Refund API

**Files:**
- Create: `src/app/api/admin/financials/bulk-refund/route.ts`

**Step 1: Create the route file**

Write the bulk refund API:
- POST handler, RBAC check
- Accept `{ source: 'tournament'|'gth', referenceId: string, reason: string }`
- Find all completed, non-refunded entry transactions for the reference
- For each: credit wallet, create refund transaction, mark original as refunded
- **Use individual operations** (not bulkWrite) to avoid TypeScript typing issues
- Write audit log with refund count, total amount, reason

Use spec code (lines 1373-1459) but:
- Fix import to `@/app/lib/mongoose`
- Add RBAC + `export const dynamic`
- Replace `bulkWrite` calls with a loop of individual `updateOne`/`insertOne` operations
- Add real audit log call

**Step 2: Commit**

```bash
git add src/app/api/admin/financials/bulk-refund/route.ts
git commit -m "feat(phase4): add bulk refund API route"
```

---

## Task 10: Build Verification & Final Commit

**Step 1: Run build**

```bash
npm run build
```

Expected: TypeScript compilation succeeds (zero type errors). The "Collecting page data" step may fail due to missing `MONGODB_URI` — that's a runtime env issue, not a type error.

**Step 2: Fix any type errors**

Common issues to watch for:
- `searchParams` possibly null → use optional chaining `?.`
- Recharts `formatter` type mismatch → cast or adjust signature
- `onChange` implicit `any` → add explicit event handler types
- `AuditResources` key not found → use UPPERCASE keys

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: admin Phase 4 — financial controls and revenue dashboard"
```

---

## Task 11: Sidebar Navigation Update (if needed)

**Files:**
- Modify: `src/app/ui/dashboard/sidebar/sidebar.tsx`

The sidebar already has "Financial Dashboard" → `/dashboard/financials` and "Transactions" → `/dashboard/transactions`. Check if sub-routes (wallets, all-transactions) need sidebar entries. If the Financial Dashboard page links to them (it does via header buttons), no sidebar changes are needed.

If the user wants sidebar sub-links, add under "Financials":
- "Wallet Browser" → `/dashboard/financials/wallets`
- "All Transactions" → `/dashboard/financials/transactions`

---

## File Summary

| # | File | Type | Task |
|---|------|------|------|
| 1 | `src/app/api/admin/financials/summary/route.ts` | Create | Task 1 |
| 2 | `src/app/api/admin/financials/revenue-chart/route.ts` | Create | Task 2 |
| 3 | `src/app/dashboard/financials/page.tsx` | Create | Task 3 |
| 4 | `src/app/api/admin/financials/wallets/route.ts` | Create | Task 4 |
| 5 | `src/app/dashboard/financials/wallets/page.tsx` | Create | Task 5 |
| 6 | `src/app/api/admin/financials/transactions/route.ts` | Create | Task 6 |
| 7 | `src/app/dashboard/financials/transactions/page.tsx` | Create | Task 7 |
| 8 | `src/app/dashboard/transactions/page.tsx` | Modify | Task 8 |
| 9 | `src/app/ui/dashboard/transactionsPage/TransactionsPage.tsx` | Modify | Task 8 |
| 10 | `src/app/api/admin/financials/bulk-refund/route.ts` | Create | Task 9 |

**8 new files, 2 modified files.**
