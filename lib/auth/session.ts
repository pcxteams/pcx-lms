import 'server-only';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
}

export interface Session {
  user: SessionUser;
  session: { id: string; userId: string; expiresAt: string };
}

/**
 * Reads the current session by forwarding the incoming cookies to the NestJS
 * API's Better Auth `get-session` endpoint. Mirrors pcx-admin-v2/src/lib/session.ts
 * — keep both in sync. Returns `null` when there is no valid session.
 *
 * Replaces the previous hand-rolled `pcx_session` cookie scheme, which called
 * a `/auth/sign-in` endpoint that does not exist on this backend.
 */
export async function getSession(): Promise<Session | null> {
  const cookie = (await headers()).get('cookie') ?? '';
  if (!cookie) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Session | null;
    return data?.user ? data : null;
  } catch {
    return null;
  }
}
