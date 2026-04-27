import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../helpers/testDb';
import { createMockSession } from '../../helpers/testFixtures';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

import { GET } from '@/app/api/waitlist/[id]/route';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => {
  await resetTestDb();
  jest.clearAllMocks();
});

function req(url: string) { return new NextRequest(url); }

describe('GET /api/waitlist/[id]', () => {
  it('401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(req('http://localhost/api/waitlist/aaaaaaaaaaaaaaaaaaaaaaaa'), { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
    expect(res.status).toBe(401);
  });

  it('403 for moderator', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('moderator') as any);
    const res = await GET(req('http://localhost/api/waitlist/aaaaaaaaaaaaaaaaaaaaaaaa'), { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
    expect(res.status).toBe(403);
  });

  it('400 for invalid id', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await GET(req('http://localhost/api/waitlist/not-an-id'), { params: { id: 'not-an-id' } });
    expect(res.status).toBe(400);
  });

  it('404 if entry not found', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const id = new ObjectId().toHexString();
    const res = await GET(req(`http://localhost/api/waitlist/${id}`), { params: { id } });
    expect(res.status).toBe(404);
  });

  it('returns entry, user, referrer, referred chain with ipHash redacted', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;

    const aliceId = new ObjectId();
    const bobId = new ObjectId();
    const carolId = new ObjectId();

    await db.collection('waitlist_entries').insertMany([
      { _id: aliceId, email: 'alice@example.com', referralCode: 'AAA111', referredByCode: null, ipHash: 'IPALICE', createdAt: new Date('2026-04-20') },
      { _id: bobId, email: 'bob@example.com', referralCode: 'BBB222', referredByCode: 'AAA111', ipHash: 'IPBOB', createdAt: new Date('2026-04-21') },
      { _id: carolId, email: 'carol@example.com', referralCode: 'CCC333', referredByCode: 'AAA111', ipHash: 'IPCAROL', createdAt: new Date('2026-04-22') },
    ]);
    await db.collection('users').insertOne({ email: 'alice@example.com', isInvited: true });

    const res = await GET(req(`http://localhost/api/waitlist/${aliceId.toHexString()}`), { params: { id: aliceId.toHexString() } });
    const body = await res.json();

    // Alice's entry
    expect(body.entry.email).toBe('alice@example.com');
    expect(body.entry.ipHash).toBeUndefined();

    // Matching user
    expect(body.user?.email).toBe('alice@example.com');
    expect(body.user?.isInvited).toBe(true);

    // No referrer (alice was not referred)
    expect(body.referrer).toBeNull();

    // Referred chain — bob and carol, sorted createdAt desc
    expect(body.referred.map((r: any) => r.email)).toEqual(['carol@example.com', 'bob@example.com']);
    body.referred.forEach((r: any) => expect(r.ipHash).toBeUndefined());
  });

  it('returns null user when no matching users row', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    const id = new ObjectId();
    await db.collection('waitlist_entries').insertOne({ _id: id, email: 'orphan@x.com', referralCode: 'O', referredByCode: null, ipHash: 'IPO', createdAt: new Date() });

    const res = await GET(req(`http://localhost/api/waitlist/${id.toHexString()}`), { params: { id: id.toHexString() } });
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it('resolves referrer when referredByCode set', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;

    const aliceId = new ObjectId();
    const bobId = new ObjectId();
    await db.collection('waitlist_entries').insertMany([
      { _id: aliceId, email: 'alice@example.com', referralCode: 'AAA111', referredByCode: null, ipHash: 'IPA', createdAt: new Date('2026-04-20') },
      { _id: bobId, email: 'bob@example.com', referralCode: 'BBB222', referredByCode: 'AAA111', ipHash: 'IPB', createdAt: new Date('2026-04-21') },
    ]);

    const res = await GET(req(`http://localhost/api/waitlist/${bobId.toHexString()}`), { params: { id: bobId.toHexString() } });
    const body = await res.json();
    expect(body.referrer?.email).toBe('alice@example.com');
    expect(body.referrer?.ipHash).toBeUndefined();
  });
});
