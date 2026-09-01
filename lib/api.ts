import 'server-only';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Server-side GET against the NestJS API, forwarding the incoming session
 * cookie so the API's AuthGuard sees the caller. Mirrors pcx-admin-v2/src/lib/api.ts.
 * Returns `null` on any non-OK response or network error.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  const cookie = (await headers()).get('cookie') ?? '';
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
