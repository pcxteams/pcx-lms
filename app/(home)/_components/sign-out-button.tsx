'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/auth-client';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    // Navigate to /login regardless of outcome so the button is never a dead
    // click on a network error.
    try {
      await authClient.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      Sign out
    </button>
  );
}
