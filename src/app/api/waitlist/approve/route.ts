import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';
import { callFrontendInternal } from '@/app/lib/frontendInternal';
import { createAuditLog } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';

function extractError(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const v = (body as { error?: unknown }).error;
    return v == null ? 'unknown' : String(v);
  }
  return 'unknown';
}

/**
 * POST /api/waitlist/approve
 *
 * Approves a single waitlist entry. Idempotent: re-approving an already-
 * approved entry does NOT bump invitedAt, but DOES re-issue the magic link.
 *
 * Body: { email: string }
 * Response: { email, alreadyApproved, inviteSent, inviteError? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  await connectToDB();
  const db = mongoose.connection.db!;
  const entries = db.collection('waitlist_entries');
  const users = db.collection('users');

  const existing = await entries.findOne({ email });
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const now = new Date();
  let alreadyApproved = false;

  if (existing.invitedAt) {
    alreadyApproved = true;
  } else {
    // Filter on invitedAt: null guards against a concurrent approval racing us.
    await entries.updateOne(
      { email, invitedAt: null },
      { $set: { invitedAt: now, updatedAt: now } },
    );
    // No upsert: only existing user rows get the invite flag.
    await users.updateOne(
      { email },
      { $set: { isInvited: true, invitedVia: 'waitlist' } },
    );
  }

  let inviteSent = false;
  let inviteError: string | undefined;
  try {
    const r = await callFrontendInternal('/api/waitlist/issue-magic-link', {
      email,
    });
    inviteSent = r.ok;
    if (!r.ok) {
      inviteError = `${r.status}: ${extractError(r.body)}`;
    }
  } catch (e: unknown) {
    inviteError = e instanceof Error ? e.message : String(e);
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
