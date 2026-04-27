import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../helpers/testDb';
import { createMockSession } from '../../helpers/testFixtures';
import { getServerSession } from 'next-auth';

// Mock next-auth so requireAuth can read whatever session we want per test.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock the frontend internal helper. We don't want to make real HTTP calls.
const mockInternal = jest.fn();
jest.mock('@/app/lib/frontendInternal', () => ({
  callFrontendInternal: (...args: any[]) => mockInternal(...args),
}));

// Audit logger is a side-effect we don't need to assert on here.
jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

// Import POST after mocks are registered.
import { POST } from '@/app/api/waitlist/approve-bulk/route';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  mockInternal.mockReset();
  jest.clearAllMocks();
});

function reqBody(body: any) {
  return new NextRequest('http://localhost/api/waitlist/approve-bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/waitlist/approve-bulk', () => {
  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(reqBody({ emails: ['a@x.com'] }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for moderator', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('moderator') as any);
    const res = await POST(reqBody({ emails: ['a@x.com'] }));
    expect(res.status).toBe(403);
  });

  it('rejects empty emails array', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ emails: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects bulk > 200', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const emails = Array.from({ length: 201 }, (_, i) => `u${i}@x.com`);
    const res = await POST(reqBody({ emails }));
    expect(res.status).toBe(400);
  });

  it('stamps same batchId across entries and counts approved', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null, invitedBatchId: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null, invitedBatchId: null },
    ]);
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));
    const body = await res.json();
    expect(body.approved).toBe(2);
    expect(body.alreadyApproved).toBe(0);
    expect(body.batchId).toMatch(/^[0-9a-f-]{36}$/i);

    const rows = await db.collection('waitlist_entries').find({}).toArray();
    const batchIds = new Set(rows.map((e) => e.invitedBatchId));
    expect(batchIds.size).toBe(1);
    expect(batchIds.has(body.batchId)).toBe(true);
  });

  it('collects inviteErrors without aborting', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null },
    ]);
    mockInternal
      .mockResolvedValueOnce({ ok: true, status: 200, body: { ok: true } })
      .mockResolvedValueOnce({ ok: false, status: 500, body: { error: 'smtp' } });

    const res = await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));
    const body = await res.json();
    expect(body.approved).toBe(1);
    expect(body.inviteErrors).toEqual([
      { email: 'b@x.com', error: expect.stringContaining('smtp') },
    ]);
  });

  it('issues magic-link calls in series, not parallel', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertMany([
      { email: 'a@x.com', referralCode: 'A', invitedAt: null },
      { email: 'b@x.com', referralCode: 'B', invitedAt: null },
    ]);
    const sequence: string[] = [];
    mockInternal.mockImplementation(async (_path: string, payload: any) => {
      sequence.push(`start:${payload.email}`);
      await new Promise((r) => setTimeout(r, 25));
      sequence.push(`end:${payload.email}`);
      return { ok: true, status: 200, body: { ok: true } };
    });

    await POST(reqBody({ emails: ['a@x.com', 'b@x.com'] }));
    expect(sequence).toEqual([
      'start:a@x.com',
      'end:a@x.com',
      'start:b@x.com',
      'end:b@x.com',
    ]);
  });

  it('records notFound for missing entries without aborting', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db
      .collection('waitlist_entries')
      .insertOne({ email: 'present@x.com', referralCode: 'P', invitedAt: null });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ emails: ['present@x.com', 'missing@x.com'] }));
    const body = await res.json();
    expect(body.notFound).toEqual(['missing@x.com']);
    expect(body.approved).toBe(1);
  });

  it('dedupes input emails (case-insensitive) and processes each unique email once', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'a@x.com', referralCode: 'A', invitedAt: null });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ emails: ['A@x.com', 'a@x.com', '  a@x.com  '] }));
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.approved).toBe(1);
    expect(mockInternal).toHaveBeenCalledTimes(1);
  });

  it('idempotent: alreadyApproved counted, invitedAt not bumped, magic-link still sent', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    const prev = new Date('2026-04-20');
    await db.collection('waitlist_entries').insertOne({
      email: 'old@x.com',
      referralCode: 'O',
      invitedAt: prev,
      invitedBatchId: null,
    });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ emails: ['old@x.com'] }));
    const body = await res.json();
    expect(body.alreadyApproved).toBe(1);
    expect(body.approved).toBe(1); // magic-link still sent

    const entry = await db
      .collection('waitlist_entries')
      .findOne({ email: 'old@x.com' });
    expect(entry?.invitedAt).toEqual(prev); // not bumped
    expect(entry?.invitedBatchId).toBe(body.batchId); // batchId stamped
  });
});
