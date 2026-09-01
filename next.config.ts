import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // Proxy the Better Auth API to the NestJS backend so the session cookie is
  // set first-party on this origin. Mirrors pcx-admin-v2/next.config.ts —
  // keep both in sync.
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${API_URL}/api/auth/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
