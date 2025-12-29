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

  // Exclude dev dependencies from server bundles
  // This prevents Next.js from trying to bundle @playwright/test
  serverExternalPackages: ['@playwright/test'],

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
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
}

export default nextConfig
