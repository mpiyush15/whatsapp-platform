import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Configure image optimization with remotePatterns (domains is deprecated) */
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  /* React strict mode for development */
  reactStrictMode: true,
  /* Disable Turbopack to avoid native module issues in Vercel */
  experimental: {
    turbopack: false,
  },
};

export default nextConfig;

