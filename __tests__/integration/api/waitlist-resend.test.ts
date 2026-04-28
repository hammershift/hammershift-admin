import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../helpers/testDb';
import { createMockSession } from '../../helpers/testFixtures';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockInternal = jest.fn();
jest.mock('@/app/lib/frontendInternal', () => ({
  ...jest.requireActual('@/app/lib/frontendInternal'),
  callFrontendInternal: (...args: any[]) => mockInternal(...args),
}));
jest.mock('@/app/lib/auditLogger', () => ({ createAuditLog: jest.fn() }));

import { POST } from '@/app/api/waitlist/resend/route';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => {
  await resetTestDb();
  mockInternal.mockReset();
  jest.clearAllMocks();
});

function reqBody(body: any) {
  return new NextRequest('http://localhost/api/waitlist/resend', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/waitlist/resend', () => {
  it('401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(reqBody({ email: 'a@x.com' }));
    expect(res.status).toBe(401);
  });

  it('403 for moderator', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('moderator') as any);
    const res = await POST(reqBody({ email: 'a@x.com' }));
    expect(res.status).toBe(403);
  });

  it('400 if email missing', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({}));
    expect(res.status).toBe(400);
  });

  it('404 if entry not found', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const res = await POST(reqBody({ email: 'ghost@x.com' }));
    expect(res.status).toBe(404);
  });

  it('400 not_approved_yet if invitedAt is null', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({ email: 'pending@x.com', referralCode: 'P', invitedAt: null });

    const res = await POST(reqBody({ email: 'pending@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('not_approved_yet');
  });

  it('happy path: re-issues magic link, returns inviteEmailSentAt', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'alice@x.com',
      referralCode: 'A',
      invitedAt: new Date('2026-04-20'),
      inviteEmailSentAt: null,
    });
    // Simulate frontend bumping inviteEmailSentAt during issue-magic-link
    const newSentAt = new Date('2026-04-23T10:00:00Z');
    mockInternal.mockImplementation(async () => {
      await db.collection('waitlist_entries').updateOne(
        { email: 'alice@x.com' },
        { $set: { inviteEmailSentAt: newSentAt } }
      );
      return { ok: true, status: 200, body: { ok: true } };
    });

    const res = await POST(reqBody({ email: 'alice@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(true);
    expect(new Date(body.inviteEmailSentAt).toISOString()).toBe(newSentAt.toISOString());
    expect(mockInternal).toHaveBeenCalledWith('/api/waitlist/issue-magic-link', { email: 'alice@x.com' });
  });

  it('reports inviteSent=false with inviteError when frontend fails', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'bob@x.com',
      referralCode: 'B',
      invitedAt: new Date('2026-04-20'),
      inviteEmailSentAt: new Date('2026-04-21'),
    });
    mockInternal.mockResolvedValue({ ok: false, status: 500, body: { error: 'smtp down' } });

    const res = await POST(reqBody({ email: 'bob@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(false);
    expect(body.inviteError).toContain('smtp down');
    // Existing inviteEmailSentAt preserved
    expect(new Date(body.inviteEmailSentAt).toISOString()).toBe(new Date('2026-04-21').toISOString());
  });

  it('captures thrown error from callFrontendInternal into inviteError', async () => {
    mockGetServerSession.mockResolvedValue(createMockSession('admin') as any);
    const db = mongoose.connection.db!;
    await db.collection('waitlist_entries').insertOne({
      email: 'carol@x.com',
      referralCode: 'C',
      invitedAt: new Date('2026-04-20'),
    });
    mockInternal.mockRejectedValue(new Error('network down'));

    const res = await POST(reqBody({ email: 'carol@x.com' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inviteSent).toBe(false);
    expect(body.inviteError).toContain('network down');
  });
});
