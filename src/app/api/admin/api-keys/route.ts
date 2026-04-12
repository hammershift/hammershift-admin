import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import connectToDB from '@/app/lib/mongoose';
import MMApiKeyModel from '@/app/models/MMApiKey.model';
import { createAuditLog } from '@/app/lib/auditLogger';
import { AuditActions, AuditResources } from '@/app/lib/auditLogger';

export const dynamic = 'force-dynamic';

// GET — list all API keys (hashed keys not exposed)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const keys = await MMApiKeyModel.find({}, {
      apiKey: 0, // Never expose hashed key
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('API keys list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — generate a new API key
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDB();
    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate plain key (shown once) and hash for storage
    const plainKey = MMApiKeyModel.generateKey();
    const hashedKey = await MMApiKeyModel.hashKey(plainKey);

    const apiKey = await MMApiKeyModel.create({
      userId: session.user.id,
      apiKey: hashedKey,
      name,
      isActive: true,
    });

    await createAuditLog({
      userId: session.user.id,
      username: session.user.email || 'unknown',
      userRole: session.user.role,
      action: AuditActions.ADMIN_CREATE,
      resource: AuditResources.ADMIN,
      resourceId: apiKey._id.toString(),
      method: 'POST',
      endpoint: '/api/admin/api-keys',
      status: 'success',
      metadata: { name, keyId: apiKey._id.toString(), type: 'api_key' },
      req,
    });

    return NextResponse.json({
      key: {
        id: apiKey._id,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        isActive: apiKey.isActive,
      },
      // Plain key shown ONCE — cannot be retrieved again
      plainKey,
    });
  } catch (error) {
    console.error('API key create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — revoke an API key
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['owner', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const keyId = searchParams.get('id');
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    await connectToDB();
    const result = await MMApiKeyModel.findByIdAndUpdate(keyId, {
      $set: { isActive: false, revokedAt: new Date() },
    });

    if (!result) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      username: session.user.email || 'unknown',
      userRole: session.user.role,
      action: AuditActions.ADMIN_DELETE,
      resource: AuditResources.ADMIN,
      resourceId: keyId,
      method: 'DELETE',
      endpoint: '/api/admin/api-keys',
      status: 'success',
      metadata: { keyId, action: 'revoked' },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API key revoke error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
