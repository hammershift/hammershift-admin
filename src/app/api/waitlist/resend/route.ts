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
 * POST /api/waitlist/resend
 *
 * Re-issues a magic-link invite for an already-approved waitlist entry.
 * The entry MUST already be approved (invitedAt set) — otherwise this
 * returns 400 not_approved_yet so the caller routes to the approve flow
 * instead. The frontend's issue-magic-link endpoint bumps
 * inviteEmailSentAt as a side effect; we re-read after the call so the
 * response surfaces the fresh timestamp.
 *
 * Body: { email: string }
 * Response: { email, inviteSent, inviteError?, inviteEmailSentAt: Date | null }
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

  const existing = await entries.findOne({ email });
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }
  if (!existing.invitedAt) {
    return NextResponse.json({ error: 'not_approved_yet' }, { status: 400 });
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

  // Re-read so the response carries the frontend-bumped inviteEmailSentAt.
  // On helper failure, the prior timestamp (if any) is still surfaced.
  const refreshed = await entries.findOne({ email });

  await createAuditLog({
    userId: session.user.id,
    username: session.user.username,
    userRole: session.user.role,
    action: 'waitlist.invite_resent',
    resource: 'WaitlistEntry',
    method: 'POST',
    endpoint: '/api/waitlist/resend',
    status: inviteSent ? 'success' : 'failure',
    errorMessage: inviteError,
    metadata: { email },
    req,
  });

  return NextResponse.json({
    email,
    inviteSent,
    inviteError,
    inviteEmailSentAt: refreshed?.inviteEmailSentAt ?? null,
  });
}
