import { NextRequest, NextResponse } from 'next/server';
import connectToDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';
import { requireAuth } from '@/app/lib/authMiddleware';

export const dynamic = 'force-dynamic';

const FILTERS = new Set(['unapproved', 'approved', 'flagged', 'all']);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['owner', 'admin']);
  if ('error' in auth) return auth.error;

  await connectToDB();
  const db = mongoose.connection.db!;
  const params = req.nextUrl.searchParams;

  const rawFilter = params.get('filter') || '';
  const filter = FILTERS.has(rawFilter) ? rawFilter : 'unapproved';
  const q = (params.get('q') || '').trim().toLowerCase();
  const parsedPage = parseInt(params.get('page') || '1', 10);
  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const parsedSize = parseInt(params.get('pageSize') || '50', 10);
  const pageSize = Math.min(100, Math.max(1, isNaN(parsedSize) ? 50 : parsedSize));

  const match: Record<string, unknown> = {};
  if (filter === 'unapproved') match.invitedAt = null;
  if (filter === 'approved') match.invitedAt = { $ne: null };
  if (filter === 'flagged') match.flaggedAt = { $ne: null };
  if (q) {
    const escaped = q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    match.email = { $regex: escaped, $options: 'i' };
  }

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
              referralCount: {
                $ifNull: [{ $arrayElemAt: ['$_refCount.n', 0] }, 0],
              },
              hasUser: { $gt: [{ $size: '$_user' }, 0] },
            },
          },
          { $project: { ipHash: 0, _refCount: 0, _user: 0 } },
        ],
      },
    },
  ];

  const [result] = await db
    .collection('waitlist_entries')
    .aggregate(pipeline)
    .toArray();
  const total = result?.metadata?.[0]?.total || 0;

  return NextResponse.json({
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    data: result?.data ?? [],
  });
}
