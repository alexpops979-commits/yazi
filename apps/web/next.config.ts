import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

// Single source of truth for env: repo-root .env
const parsed = loadEnv({ path: path.resolve(process.cwd(), '../../.env') }).parsed ?? {};
for (const [key, value] of Object.entries(parsed)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const apiUrl = process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  allowedDevOrigins: ['lvh.me', '*.lvh.me', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }],
  },
  async rewrites() {
    return [
      // Same-origin API access from the browser: cookies stay first-party, no CORS.
      { source: '/api/proxy/:path*', destination: `${apiUrl}/:path*` },
    ];
  },
};

export default nextConfig;
