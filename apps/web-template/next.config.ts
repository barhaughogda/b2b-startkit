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
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Environment variables that should be available at build time
  env: {
    // Add build-time env vars here if needed
  },

  // Experimental features
  experimental: {
    // Enable Turbopack for faster development
    // turbo: {},
  },
}

export default nextConfig
