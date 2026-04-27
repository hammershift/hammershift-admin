import { callFrontendInternal } from '@/app/lib/frontendInternal';

describe('callFrontendInternal', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, INTERNAL_API_SECRET: 'test-secret', FRONTEND_ORIGIN: 'https://velocity-markets.com' };
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('sends x-internal-secret header and JSON body', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    global.fetch = mockFetch as any;

    const res = await callFrontendInternal('/api/waitlist/issue-magic-link', { email: 'a@b.com' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://velocity-markets.com/api/waitlist/issue-magic-link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-secret': 'test-secret',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ email: 'a@b.com' }),
      })
    );
    expect(res).toEqual({ ok: true, status: 200, body: { ok: true } });
  });

  it('throws if INTERNAL_API_SECRET missing', async () => {
    delete process.env.INTERNAL_API_SECRET;
    await expect(callFrontendInternal('/x', {})).rejects.toThrow(/INTERNAL_API_SECRET/);
  });

  it('returns non-ok status without throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Not approved' }) }) as any;
    const res = await callFrontendInternal('/x', {});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Not approved' });
  });

  it('passes an AbortSignal to fetch (default timeout)', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = mockFetch as any;
    await callFrontendInternal('/x', {});
    const optsArg = mockFetch.mock.calls[0][1];
    expect(optsArg.signal).toBeDefined();
    // AbortSignal.timeout produces a real AbortSignal instance:
    expect(optsArg.signal.constructor.name).toBe('AbortSignal');
  });

  it('honors caller-provided timeoutMs override', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = mockFetch as any;
    await callFrontendInternal('/x', {}, { timeoutMs: 250 });
    const optsArg = mockFetch.mock.calls[0][1];
    expect(optsArg.signal).toBeDefined();
  });
});
