/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Without this, the App Router's client-side router cache can keep
  // serving a stale /dashboard or /review payload after navigating away and
  // back, even with server-side caching already disabled. See
  // lib/supabaseServer.ts for the full caching bug writeup.
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
};

module.exports = nextConfig;
