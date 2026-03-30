export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import PolygonMarket from '@/app/models/PolygonMarket.model';
import { createAuditLog } from '@/app/lib/auditLogger';
import { z } from 'zod';
import connectToDB from '@/app/lib/mongoose';

const patchSchema = z
  .object({
    status: z.enum(['PENDING', 'ACTIVE', 'RESOLVED', 'DISPUTED']).optional(),
    predictedPrice: z.number().positive().optional(),
    question: z.string().min(1).max(200).optional(),
    closesAt: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

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

    // Build $set from validated fields
    const update: Record<string, unknown> = {};
    if (validation.data.status) update.status = validation.data.status;
    if (validation.data.predictedPrice) {
      update.predictedPrice = validation.data.predictedPrice;
      // Sync the question text with new price
      if (!validation.data.question) {
        const existing = await PolygonMarket.findById(marketId).lean() as { question?: string } | null;
        if (existing?.question) {
          // Replace dollar amount in question
          const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(validation.data.predictedPrice);
          update.question = existing.question.replace(/\$[\d,]+/, formatted);
        }
      }
    }
    if (validation.data.question) update.question = validation.data.question;
    if (validation.data.closesAt) update.closesAt = new Date(validation.data.closesAt);

    const market = await PolygonMarket.findByIdAndUpdate(
      marketId,
      { $set: update },
      { new: true }
    );

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      username: session.user.email || 'unknown',
      userRole: session.user.role || 'admin',
      action: 'polygon_market.updated',
      resource: 'PolygonMarket',
      resourceId: marketId,
      method: 'PATCH',
      endpoint: `/api/admin/polygon-markets/${marketId}`,
      status: 'success',
      metadata: update,
      req,
    });

    return NextResponse.json({ success: true, market });
  } catch (error) {
    console.error('[PATCH /api/admin/polygon-markets/[marketId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
