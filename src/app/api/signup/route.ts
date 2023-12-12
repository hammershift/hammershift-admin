import clientPromise from '@/app/lib/mongoDB';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.json();
  const { email, password } = data;

  // basic validation
  if (!email || !password || !email.includes('@') || password.trim().length < 7) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 422 });
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // insert the new user into the db
    await db.collection('users').insertOne({
      email,
      password: hashedPassword,
    });

    return NextResponse.json({ message: 'User created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error during registration process:', error);
    return NextResponse.json({ message: 'Invalid server error' }, { status: 500 });
  }
}