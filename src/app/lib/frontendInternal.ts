export interface InternalResponse<T = any> {
  ok: boolean;
  status: number;
  body: T;
}

export async function callFrontendInternal<T = any>(
  path: string,
  payload: unknown
): Promise<InternalResponse<T>> {
  const secret = process.env.INTERNAL_API_SECRET;
  const origin = process.env.FRONTEND_ORIGIN;
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  if (!origin) throw new Error('FRONTEND_ORIGIN not configured');

  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'x-internal-secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let body: any = null;
  try { body = await res.json(); } catch { body = null; }

  return { ok: res.ok, status: res.status, body };
}
