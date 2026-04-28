import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../helpers/testDb';
import { createMockSession } from '../../helpers/testFixtures';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

import { POST } from '@/app/api/waitlist/flag/route';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => {
  await resetTestDb();
  jest.clearAllMocks();
});

function reqBody(body: any) {
  return new NextRequest('http://localhost/api/waitlist/flag', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/waitlist/flag', () => {
  it('401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(reqBody({ email: 'a@x.com', flagged: true }));
    expect(res.status).toBe(401);
  });

  it('403 for moderator', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('moderator') as any);
    const res = await POST(reqBody({ email: 'a@x.com', flagged: true }));
    expect(res.status).toBe(403);
  });

  it('400 if flagged is not a boolean', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ email: 'a@x.com', flagged: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('400 if email missing', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ flagged: true }));
    expect(res.status).toBe(400);
  });

  it('404 if entry not found', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ email: 'ghost@x.com', flagged: true }));
    expect(res.status).toBe(404);
  });

  it('flags an entry, sets flaggedAt to a Date', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'alice@x.com', referralCode: 'A', flaggedAt: null });

    const res = await POST(reqBody({ email: 'alice@x.com', flagged: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.flagged).toBe(true);
    const entry = await db.collection('waitlist_entries').findOne({ email: 'alice@x.com' });
    expect(entry?.flaggedAt).toBeInstanceOf(Date);
  });

  it('unflags an entry, sets flaggedAt back to null', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'bob@x.com', referralCode: 'B', flaggedAt: new Date('2026-04-22') });

    const res = await POST(reqBody({ email: 'bob@x.com', flagged: false }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.flagged).toBe(false);
    expect(body.flaggedAt).toBeNull();
    const entry = await db.collection('waitlist_entries').findOne({ email: 'bob@x.com' });
    expect(entry?.flaggedAt).toBeNull();
  });
});
