import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: [
    '@startkit/ui',
    '@startkit/auth',
    '@startkit/billing',
    '@startkit/database',
    '@startkit/rbac',
    '@startkit/config',
  ],

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      // AWS S3 buckets for Zenthea
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      // CloudFront (if used)
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },

  // Environment variables that should be available at build time
  env: {
    // Add build-time env vars here if needed
  },

  // Webpack configuration to handle server-only modules
  webpack: (config, { isServer }) => {
    // Mark Node.js built-ins as external for client bundles
    // These modules are server-only and cannot be bundled for the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js built-in modules
        async_hooks: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        os: false,
        fs: false,
        child_process: false,
        // Postgres package uses these Node.js modules
        'pg-native': false,
      }
    }
    return config
  },

  // Experimental features
  experimental: {
    // Enable Turbopack for faster development
    // turbo: {},
  },
}

export default nextConfig
