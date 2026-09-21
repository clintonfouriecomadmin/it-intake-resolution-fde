/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Client navigations were keeping stale /dashboard and /review payloads.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

module.exports = nextConfig;
