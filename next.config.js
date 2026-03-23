/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Next 14: keep Mongoose on the server (avoids duplicate instances / broken models in API routes).
    serverComponentsExternalPackages: ['mongoose'],
  },
};

module.exports = nextConfig;
