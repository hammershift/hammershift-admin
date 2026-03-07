export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import PolygonMarket from '@/app/models/PolygonMarket.model';
import { createAuditLog } from '@/app/lib/auditLogger';
import { z } from 'zod';
import connectToDB from '@/app/lib/mongoose';

const patchSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'RESOLVED', 'DISPUTED']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { marketId } = await params;

    const body = await req.json();
    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    await connectToDB();

    const market = await PolygonMarket.findByIdAndUpdate(
      marketId,
      { status: validation.data.status },
      { new: true }
    );

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      username: session.user.email || 'unknown',
      userRole: session.user.role || 'admin',
      action: 'polygon_market.status_changed',
      resource: 'PolygonMarket',
      resourceId: marketId,
      method: 'PATCH',
      endpoint: `/api/admin/polygon-markets/${marketId}`,
      status: 'success',
      metadata: { newStatus: validation.data.status },
      req,
    });

    return NextResponse.json({ success: true, market });
  } catch (error) {
    console.error('[PATCH /api/admin/polygon-markets/[marketId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
