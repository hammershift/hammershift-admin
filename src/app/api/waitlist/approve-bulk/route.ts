import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';
import { callFrontendInternal, extractError } from '@/app/lib/frontendInternal';
import { createAuditLog } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — bulk loop with 10s timeout × up to 200 emails worst case

const MAX_BULK = 200;

/**
 * POST /api/waitlist/approve-bulk
 *
 * Approves up to MAX_BULK waitlist entries in a single batch. A single
 * `invitedBatchId` (UUID v4) is stamped onto every processed entry so the
 * cohort can be queried later. Idempotent per email: an already-approved
 * entry does NOT have its invitedAt bumped, but DOES still get a fresh
 * magic link issued and the new batchId stamped (if it had none).
 *
 * Magic-link issuance runs in series (not parallel) to keep load on the
 * frontend bounded and to ensure a hung iteration cannot cascade.
 *
 * Body: { emails: string[] }
 * Response: { batchId, total, approved, alreadyApproved, notFound, inviteErrors }
 *
 * Response counters:
 *  - approved: emails for which issue-magic-link returned ok (includes idempotent re-sends)
 *  - alreadyApproved: emails that already had invitedAt set (independent of send outcome)
 *  - notFound: emails with no waitlist_entries row
 *  - inviteErrors: per-email send failures
 *
 * Note: an already-approved email whose magic-link send fails contributes to
 * alreadyApproved AND inviteErrors but NOT approved.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const startedAtMs = Date.now();

  const body = await req.json().catch(() => ({}));
  const emails: string[] = Array.from(
    new Set(
      Array.isArray(body?.emails)
        ? body.emails
            .map((e: unknown) => String(e ?? '').trim().toLowerCase())
            .filter((e: string) => e.length > 0)
        : [],
    ),
  );

  if (emails.length === 0) {
    return NextResponse.json({ error: 'emails[] required' }, { status: 400 });
  }
  if (emails.length > MAX_BULK) {
    return NextResponse.json(
      { error: `emails[] exceeds cap ${MAX_BULK}` },
      { status: 400 },
    );
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

  // Series — `for...of await` deliberately. Do not Promise.all this loop.
  for (const email of emails) {
    const existing = await entries.findOne({ email });
    if (!existing) {
      notFound.push(email);
      continue;
    }

    if (existing.invitedAt) {
      alreadyApproved++;
    } else {
      // Filter on invitedAt: null guards against a concurrent approval racing us.
      await entries.updateOne(
        { email, invitedAt: null },
        { $set: { invitedAt: now, invitedBatchId: batchId, updatedAt: now } },
      );
      // No upsert: only existing user rows get the invite flag.
      await users.updateOne(
        { email },
        { $set: { isInvited: true, invitedVia: 'waitlist' } },
      );
    }

    // Stamp batchId on the idempotent path too — only if the entry has none yet.
    await entries.updateOne(
      { email, invitedBatchId: null },
      { $set: { invitedBatchId: batchId } },
    );

    try {
      const r = await callFrontendInternal('/api/waitlist/issue-magic-link', {
        email,
      });
      if (!r.ok) {
        inviteErrors.push({
          email,
          error: `${r.status}: ${extractError(r.body)}`,
        });
      } else {
        approved++;
      }
    } catch (e: unknown) {
      inviteErrors.push({
        email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log('[waitlist:bulk_approved]', {
    batchId,
    total: emails.length,
    approved,
    alreadyApproved,
    notFound: notFound.length,
    inviteErrors: inviteErrors.length,
    durationMs: Date.now() - startedAtMs,
  });

  await createAuditLog({
    userId: session.user.id,
    username: session.user.username,
    userRole: session.user.role,
    action: 'waitlist.bulk_approved',
    resource: 'WaitlistEntry',
    method: 'POST',
    endpoint: '/api/waitlist/approve-bulk',
    status: inviteErrors.length ? 'failure' : 'success',
    metadata: {
      batchId,
      total: emails.length,
      approved,
      alreadyApproved,
      inviteErrors: inviteErrors.length,
      notFound: notFound.length,
    },
    req,
  });

  return NextResponse.json({
    batchId,
    total: emails.length,
    approved,
    alreadyApproved,
    notFound,
    inviteErrors,
  });
}
