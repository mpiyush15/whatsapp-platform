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
    ],
  },

  /* React strict mode for development */
  reactStrictMode: true,

  /* Webpack optimization for tree-shaking and code splitting */
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate node_modules from app code
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Extract common code shared between pages
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'common',
          },
          // Socket.io client bundle separately
          socket: {
            test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
            name: 'socket-io',
            priority: 15,
          },
          // Separate charts/visualization libraries if used
          charts: {
            test: /[\\/]node_modules[\\/](recharts|chart\.js)[\\/]/,
            name: 'charts',
            priority: 12,
          },
        },
      },
    };
    return config;
  },

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

