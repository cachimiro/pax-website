import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.gitpod.dev',
    '*.eu-central-1-01.gitpod.dev',
    '3000--019cd0d4-5fba-7188-bcca-a4b96ff3c9b3.eu-central-1-01.gitpod.dev',
  ],
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 2000,
        aggregateTimeout: 600,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }
    return config;
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    {
      // Allow tracking pixel/click endpoints to be embedded in emails
      source: '/api/track/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'paxbespoke.uk' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
