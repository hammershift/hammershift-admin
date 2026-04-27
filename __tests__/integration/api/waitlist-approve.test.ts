import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../helpers/testDb';
import { createMockSession } from '../../helpers/testFixtures';
import { getServerSession } from 'next-auth';

// Mock next-auth so requireAuth can read whatever session we want per test.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock the frontend internal helper. We don't want to make real HTTP calls.
// Keep the real `extractError` since it's a pure helper now co-located in this module.
const mockInternal = jest.fn();
jest.mock('@/app/lib/frontendInternal', () => ({
  ...jest.requireActual('@/app/lib/frontendInternal'),
  callFrontendInternal: (...args: any[]) => mockInternal(...args),
}));

// Audit logger is a side-effect we don't need to assert on here.
jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

// Import POST after mocks are registered.
import { POST } from '@/app/api/waitlist/approve/route';

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
  return new NextRequest('http://localhost/api/waitlist/approve', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/waitlist/approve', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(reqBody({ email: 'a@x.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is moderator', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('moderator') as any);
    const res = await POST(reqBody({ email: 'a@x.com' }));
    expect(res.status).toBe(403);
  });

  it('sets invitedAt on entry and calls issue-magic-link', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'alice@x.com',
      referralCode: 'A',
      invitedAt: null,
    });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ email: 'alice@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(true);
    expect(body.alreadyApproved).toBe(false);

    const entry = await db
      .collection('waitlist_entries')
      .findOne({ email: 'alice@x.com' });
    expect(entry?.invitedAt).toBeInstanceOf(Date);
    expect(mockInternal).toHaveBeenCalledWith(
      '/api/waitlist/issue-magic-link',
      { email: 'alice@x.com' },
    );
  });

  it('updates user row if it exists', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'bob@x.com',
      referralCode: 'B',
      invitedAt: null,
    });
    await db.collection('users').insertOne({ email: 'bob@x.com' });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    await POST(reqBody({ email: 'bob@x.com' }));

    const user = await db.collection('users').findOne({ email: 'bob@x.com' });
    expect(user?.isInvited).toBe(true);
    expect(user?.invitedVia).toBe('waitlist');
  });

  it('does not upsert a user row when none exists', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'noone@x.com',
      referralCode: 'N',
      invitedAt: null,
    });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    await POST(reqBody({ email: 'noone@x.com' }));

    const userCount = await db
      .collection('users')
      .countDocuments({ email: 'noone@x.com' });
    expect(userCount).toBe(0);
  });

  it('reports inviteSent=false with inviteError when frontend fails', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'carol@x.com',
      referralCode: 'C',
      invitedAt: null,
    });
    mockInternal.mockResolvedValue({
      ok: false,
      status: 500,
      body: { error: 'smtp down' },
    });

    const res = await POST(reqBody({ email: 'carol@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(false);
    expect(body.inviteError).toContain('smtp down');
    const entry = await db
      .collection('waitlist_entries')
      .findOne({ email: 'carol@x.com' });
    expect(entry?.invitedAt).toBeInstanceOf(Date);
  });

  it('captures thrown error from callFrontendInternal into inviteError', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'eve@x.com',
      referralCode: 'E',
      invitedAt: null,
    });
    mockInternal.mockRejectedValue(new Error('FRONTEND_ORIGIN not configured'));

    const res = await POST(reqBody({ email: 'eve@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(false);
    expect(body.inviteError).toContain('FRONTEND_ORIGIN not configured');
  });

  it('idempotent: already-approved returns alreadyApproved=true and does not bump invitedAt', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    const prev = new Date('2026-04-20');
    await db.collection('waitlist_entries').insertOne({
      email: 'dan@x.com',
      referralCode: 'D',
      invitedAt: prev,
    });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ email: 'dan@x.com' }));
    const body = await res.json();
    expect(body.alreadyApproved).toBe(true);
    expect(body.inviteSent).toBe(true);

    const entry = await db
      .collection('waitlist_entries')
      .findOne({ email: 'dan@x.com' });
    expect(entry?.invitedAt).toEqual(prev);
    // Magic link is still re-issued for already-approved entries.
    expect(mockInternal).toHaveBeenCalledWith(
      '/api/waitlist/issue-magic-link',
      { email: 'dan@x.com' },
    );
  });

  it('lowercases and trims the input email before lookup', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'lower@x.com',
      referralCode: 'L',
      invitedAt: null,
    });
    mockInternal.mockResolvedValue({ ok: true, status: 200, body: { ok: true } });

    const res = await POST(reqBody({ email: '   LOWER@x.com  ' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.email).toBe('lower@x.com');
  });

  it('404 if entry not found', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ email: 'ghost@x.com' }));
    expect(res.status).toBe(404);
  });

  it('400 if email missing', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({}));
    expect(res.status).toBe(400);
  });
});
