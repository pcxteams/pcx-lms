import 'server-only';

import { cookies } from 'next/headers';

const SESSION_COOKIE = 'pcx_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionData = {
  token: string;
  userId: number;
  email: string;
  isLeader: boolean;
  isAgent: boolean;
  isSysAdmin: boolean;
  expiresAt: string;
};

export async function createSession(data: Omit<SessionData, 'expiresAt'>): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session: SessionData = { ...data, expiresAt: expiresAt.toISOString() };
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionData;
    if (new Date(session.expiresAt) < new Date()) {
      await destroySession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
