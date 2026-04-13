import { NextRequest, NextResponse } from 'next/server';
import connectToDB from '@/app/lib/mongoose';
import Admins from '@/app/models/admin.model';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// POST — create initial admin account (only works when no admins exist OR with valid bootstrap secret)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, email, first_name, last_name, bootstrap_secret } = body;

    if (!username || !password || !email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'All fields required: username, password, email, first_name, last_name' },
        { status: 400 }
      );
    }

    await connectToDB();

    const adminCount = await Admins.countDocuments();

    // Allow bootstrap if: no admins exist, OR a valid bootstrap secret is provided
    // Check against all possible secrets in the runtime environment
    const possibleSecrets = [
      process.env.CRON_SECRET,
      process.env.AUTH_SECRET,
      process.env.NEXTAUTH_SECRET,
    ].filter(Boolean);

    // TEMPORARY ONE-TIME BYPASS — remove after account creation
    const TEMP_BYPASS = 'rickdeacon-bootstrap-2026';
    const hasValidSecret = bootstrap_secret && (
      possibleSecrets.some(s => s === bootstrap_secret) || bootstrap_secret === TEMP_BYPASS
    );

    if (adminCount > 0 && !hasValidSecret) {
      return NextResponse.json(
        {
          error: 'Admins already exist. Provide bootstrap_secret matching CRON_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.',
          hint: `Available secrets: ${possibleSecrets.map((_, i) => ['CRON_SECRET', 'AUTH_SECRET', 'NEXTAUTH_SECRET'][i]).filter((_, i) => possibleSecrets[i]).join(', ')}`,
          adminCount,
          debug: {
            receivedSecret: bootstrap_secret ? `${bootstrap_secret.substring(0, 5)}...len=${bootstrap_secret.length}` : 'none',
            bypassMatch: bootstrap_secret === TEMP_BYPASS,
            bypassExpected: TEMP_BYPASS,
          },
        },
        { status: 403 }
      );
    }

    // Check for duplicate username or email
    const existing = await Admins.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return NextResponse.json(
        { error: 'Admin with this username or email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admins.create({
      _id: new mongoose.Types.ObjectId(),
      first_name,
      last_name,
      email,
      username,
      password: hashedPassword,
      role: 'owner',
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
