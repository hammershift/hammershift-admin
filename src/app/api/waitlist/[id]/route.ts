import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import connectToDB from '@/app/lib/mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/waitlist/[id]
 *
 * Returns the detail-drawer payload for a single waitlist entry:
 *  - the entry itself (ipHash redacted)
 *  - the matching `users` document (by email), or null
 *  - the referrer entry (whose referralCode === this.referredByCode), or null
 *  - the entries this entry has referred (where referredByCode === this.referralCode),
 *    sorted by createdAt desc, ipHash redacted on each
 */

function redact<T extends Record<string, any>>(doc: T | null): T | null {
  if (!doc) return null;
  const { ipHash: _ip, ...rest } = doc;
  return rest as T;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;

  const { id } = params;
  // Pin to the 24-char hex format — Mongo treats some 12-byte strings as
  // valid ObjectIds, which would let unintended values through.
  if (!id || id.length !== 24 || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await connectToDB();
  const db = mongoose.connection.db!;
  const entries = db.collection('waitlist_entries');
  const users = db.collection('users');

  const entry = await entries.findOne({ _id: new ObjectId(id) });
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const [user, referrer, referred] = await Promise.all([
    users.findOne({ email: entry.email }),
    entry.referredByCode
      ? entries.findOne({ referralCode: entry.referredByCode })
      : Promise.resolve(null),
    entries
      .find({ referredByCode: entry.referralCode })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  return NextResponse.json({
    entry: redact(entry),
    user: user ?? null,
    referrer: redact(referrer),
    referred: referred.map((r) => redact(r)),
  });
}
