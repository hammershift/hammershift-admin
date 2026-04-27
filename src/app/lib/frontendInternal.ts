export interface InternalResponse<T = any> {
  ok: boolean;
  status: number;
  body: T;
}

export interface CallFrontendInternalOptions {
  /**
   * Per-call timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT_MS}.
   * Implemented via `AbortSignal.timeout` (Node 18+ / modern runtimes).
   * If the underlying `fetch` aborts, the resulting error propagates so that
   * callers (e.g. the bulk-approve loop) can catch it and continue with the
   * next item rather than stalling on a hung frontend.
   */
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 10_000;

export async function callFrontendInternal<T = any>(
  path: string,
  payload: unknown,
  options?: CallFrontendInternalOptions
): Promise<InternalResponse<T>> {
  const secret = process.env.INTERNAL_API_SECRET;
  const origin = process.env.FRONTEND_ORIGIN;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  if (!origin) throw new Error('FRONTEND_ORIGIN not configured');

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'x-internal-secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  let body: any = null;
  try { body = await res.json(); } catch { body = null; }

  return { ok: res.ok, status: res.status, body };
}
