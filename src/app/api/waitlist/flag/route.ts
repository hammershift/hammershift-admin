import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';
import { createAuditLog } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/waitlist/flag
 *
 * Toggles the moderation flag on a single waitlist entry. The `flaggedAt`
 * field is the source of truth: a Date when flagged, `null` when cleared.
 * The boolean `flagged` in the request body controls the direction.
 *
 * Body: { email: string, flagged: boolean }
 * Response: { email, flagged, flaggedAt: Date | null }
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
  if (typeof body?.flagged !== 'boolean') {
    return NextResponse.json({ error: 'flagged (boolean) required' }, { status: 400 });
  }
  const flagged: boolean = body.flagged;

  await connectToDB();
  const db = mongoose.connection.db!;
  const entries = db.collection('waitlist_entries');

  const existing = await entries.findOne({ email });
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const now = new Date();
  const flaggedAt: Date | null = flagged ? now : null;

  await entries.updateOne(
    { email },
    { $set: { flaggedAt, updatedAt: now } },
  );

  await createAuditLog({
    userId: session.user.id,
    username: session.user.username,
    userRole: session.user.role,
    action: 'waitlist.flag_toggled',
    resource: 'WaitlistEntry',
    method: 'POST',
    endpoint: '/api/waitlist/flag',
    status: 'success',
    metadata: { email, flagged },
    req,
  });

  return NextResponse.json({ email, flagged, flaggedAt });
}
