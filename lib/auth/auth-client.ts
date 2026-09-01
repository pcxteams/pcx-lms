'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side Better Auth client. No hardcoded `baseURL`: Better Auth uses
 * the current browser origin, so requests hit `/api/auth/*` on this app and
 * are proxied to the NestJS API by a Next.js rewrite (see next.config.ts),
 * keeping the session cookie first-party. Mirrors pcx-admin-v2/src/lib/auth-client.ts.
 */
export const authClient = createAuthClient();
