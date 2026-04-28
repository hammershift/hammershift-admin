# Waitlist Moderation — Operator Guide

The admin console exposes a moderation surface for the shared `waitlist_entries` collection at **`/dashboard/waitlist`**. This page is gated to `owner` and `admin` roles only.

## Workflows

### Approve a single entry
1. Open `/dashboard/waitlist`. The default tab is **Unapproved**.
2. Click **Approve** on the row.
3. The entry's `invitedAt` is set, the matching `users` row (if any) is marked `isInvited`, and the frontend's `issue-magic-link` endpoint sends the magic-link email.
4. A toast confirms success or surfaces the SMTP/HTTP error. If the email failed, **Resend** appears on the row in the **Approved** tab.

### Approve a batch
1. Select rows via the row checkbox or the header checkbox (per-page select).
2. Click **Approve N selected** in the bulk action bar.
3. Cap is **200 per call**. Selection persists across pages, so you can build a multi-page batch before clicking.
4. The route generates one `invitedBatchId` for the entire batch and stamps it on every entry. Magic-link sends are serialized (one per second worst-case) to respect SMTP quotas.
5. The toast reports `approved`, `alreadyApproved`, `notFound`, and `inviteErrors` counts. A non-zero `inviteErrors` flips the toast to error variant.

### Flag / unflag
1. Click the flag toggle on the row, or open the detail dialog and use the action there.
2. Flagged entries surface in the **Flagged** tab.

### Resend an invite
1. Open the **Approved** tab or the detail dialog of an already-approved entry.
2. Click **Resend**. The frontend re-issues the magic link and bumps `inviteEmailSentAt`.

### Detail dialog
- Click the email in any row to open.
- Shows: entry fields (with `ipHash` redacted), matching `users` row, referrer entry (looked up by `referredByCode`), referred entries (sorted newest first), UTM, flags.
- Action buttons mirror the row actions.

## Filters & search
- **Tabs:** Unapproved (default), Approved, Flagged, All.
- **Search:** case-insensitive email substring, debounced 300 ms.
- **Sort:** newest first by `createdAt`.
- **Pagination:** 50 / 100 per page; selection persists across pages.

## What the admin writes
Per the brief, only the following fields are mutated by this console:

| Collection | Field | Endpoint |
| --- | --- | --- |
| `waitlist_entries` | `invitedAt`, `invitedBatchId`, `updatedAt` | approve, approve-bulk |
| `waitlist_entries` | `flaggedAt`, `updatedAt` | flag |
| `users` | `isInvited`, `invitedVia` (only when row exists; never upserted) | approve, approve-bulk |

`inviteEmailSentAt` is set by the frontend on a successful magic-link send and read back by the resend route.

## Auth & access
- Reuses the existing admin NextAuth credentials session (JWT, no Google).
- Every API route is gated by `requireAuth(['owner', 'admin'])` from `src/app/lib/authMiddleware.ts`.
- `moderator` and `user` roles get 403 from every waitlist endpoint and the sidebar entry is hidden.

## Audit logging
Every mutation writes one entry to `audit_logs` with the operator's userId/username/role:

| Action | Endpoint |
| --- | --- |
| `waitlist.approved` | `POST /api/waitlist/approve` |
| `waitlist.bulk_approved` | `POST /api/waitlist/approve-bulk` |
| `waitlist.flag_toggled` | `POST /api/waitlist/flag` |
| `waitlist.invite_resent` | `POST /api/waitlist/resend` |

Bulk metadata stores counts only (not full email arrays) to keep the audit collection bounded.

## Required env
Set in admin's deployment env:
- `INTERNAL_API_SECRET` — must match the frontend.
- `FRONTEND_ORIGIN` — e.g. `https://velocity-markets.com`.

The helper at `src/app/lib/frontendInternal.ts` enforces a 10-second AbortSignal timeout per call and throws when either env var is missing. The bulk route sets `maxDuration = 300` so a worst-case batch fits under the deployment timeout.
