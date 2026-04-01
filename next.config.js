/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/9.x/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Next 14: keep Mongoose on the server (avoids duplicate instances / broken models in API routes).
    serverComponentsExternalPackages: ['mongoose'],
  },
};

module.exports = nextConfig;
