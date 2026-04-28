import { GET } from '@/app/api/waitlist/route';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/app/lib/authMiddleware', () => ({
  ...jest.requireActual('@/app/lib/authMiddleware'),
  requireAuth: jest.fn().mockResolvedValue({ session: { user: { role: 'admin', email: 'a@b.com' } } }),
}));

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
  const db = mongoose.connection.db!;
  await db.collection('waitlist_entries').insertMany([
    { email: 'alice@example.com', referralCode: 'AAA11111', referredByCode: null, invitedAt: null, flaggedAt: null, verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h1', createdAt: new Date('2026-04-20') },
    { email: 'bob@example.com', referralCode: 'BBB22222', referredByCode: 'AAA11111', invitedAt: new Date('2026-04-21'), flaggedAt: null, verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h2', createdAt: new Date('2026-04-21') },
    { email: 'carol@example.com', referralCode: 'CCC33333', referredByCode: 'AAA11111', invitedAt: null, flaggedAt: new Date('2026-04-22'), verifiedAt: null, inviteEmailSentAt: null, userId: null, utm: {}, ipHash: 'h3', createdAt: new Date('2026-04-22') },
  ]);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

function req(url: string) { return new NextRequest(url); }

describe('GET /api/waitlist', () => {
  it('defaults to unapproved filter and excludes approved entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist'));
    const body = await res.json();
    const emails = body.data.map((d: any) => d.email).sort();
    expect(emails).toEqual(['alice@example.com', 'carol@example.com']);
    expect(body.data.every((d: any) => d.invitedAt === null)).toBe(true);
  });

  it('approved filter returns only invited entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=approved'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['bob@example.com']);
  });

  it('flagged filter returns only flagged entries', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=flagged'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['carol@example.com']);
  });

  it('derives referralCount without N+1', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all'));
    const body = await res.json();
    const alice = body.data.find((d: any) => d.email === 'alice@example.com');
    expect(alice.referralCount).toBe(2);
    const bob = body.data.find((d: any) => d.email === 'bob@example.com');
    expect(bob.referralCount).toBe(0);
  });

  it('redacts ipHash', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all'));
    const body = await res.json();
    body.data.forEach((d: any) => expect(d.ipHash).toBeUndefined());
  });

  it('search by email substring is case-insensitive', async () => {
    const res = await GET(req('http://localhost/api/waitlist?filter=all&q=ALICE'));
    const body = await res.json();
    expect(body.data.map((d: any) => d.email)).toEqual(['alice@example.com']);
  });
});
