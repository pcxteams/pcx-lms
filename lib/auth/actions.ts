'use server';

import { redirect } from 'next/navigation';
import { createSession } from './session';

export type LoginState = {
  error: string | null;
};

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim();
  const password = formData.get('password') as string | null;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  let data: {
    token: string;
    userId: number;
    email: string;
    isLeader: boolean;
    isAgent: boolean;
    isSysAdmin: boolean;
  };

  try {
    const res = await fetch(`${process.env.PCX_API_URL}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        return { error: body.message ?? 'Invalid email or password.' };
      }
      return { error: 'Something went wrong. Please try again.' };
    }

    data = await res.json();
  } catch {
    return { error: 'Unable to reach the server. Please try again later.' };
  }

  if (!data.isAgent) {
    return { error: 'This portal is for agents only. Contact your administrator.' };
  }

  await createSession({
    token: data.token,
    userId: data.userId,
    email: data.email,
    isLeader: data.isLeader,
    isAgent: data.isAgent,
    isSysAdmin: data.isSysAdmin,
  });

  redirect('/essentials');
}

export async function logout(): Promise<void> {
  const { destroySession } = await import('./session');
  await destroySession();
  redirect('/login');
}
