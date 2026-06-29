/** @type {import('next').NextConfig} */
const nextConfig = {
  /* PHASE 5: Performance Optimization - Code Splitting */
  
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pixels-official.s3.ap-south-1.amazonaws.com',
      },
    ],
  },

  /* React strict mode for development */
  reactStrictMode: true,

  /* Experimental features for better performance */
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'tailwind-merge',
      'clsx',
    ],
  },

  /* Disable SWC minification to use Terser for better tree-shaking */
  swcMinify: true,

  /* Compress CSS and optimize CSS in production */
  compress: true,

  /* Enable production source maps for debugging (optional - comment out for smaller builds) */
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
