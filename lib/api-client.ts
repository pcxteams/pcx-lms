/**
 * Browser-side fetch helpers against the NestJS API. Uses relative `/api/*`
 * paths, proxied same-origin by the `/api/:path*` rewrite in next.config.ts —
 * this keeps the session cookie first-party, same reason auth-client.ts has
 * no hardcoded baseURL. Client-component counterpart to lib/api.ts's
 * server-only apiGet (that one can't be used here — it's `server-only` and
 * reads headers() directly, neither of which works in the browser).
 */

export async function apiClientGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiClientPost<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api${path}`, { method: 'POST' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
