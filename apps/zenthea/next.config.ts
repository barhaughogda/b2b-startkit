import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Transpile workspace packages
  transpilePackages: [
    '@startkit/ui',
    '@startkit/auth',
    '@startkit/billing',
    '@startkit/database',
    '@startkit/rbac',
    '@startkit/config',
  ],

  // Environment variables that should be available at build time
  env: {
    // Server-side environment variables (temporary - Convex/NextAuth)
    CONVEX_DEPLOYMENT_URL: process.env.CONVEX_DEPLOYMENT_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    HIPAA_COMPLIANCE: process.env.HIPAA_COMPLIANCE || 'true',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PHI_ENCRYPTION_KEY: process.env.PHI_ENCRYPTION_KEY,
    // Client-side environment variables
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },

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
      // Zenthea domains
      {
        protocol: 'https',
        hostname: 'app.zenthea.ai',
      },
      {
        protocol: 'https',
        hostname: 'cdn.zenthea.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.zenthea.com',
      },
      {
        protocol: 'https',
        hostname: 'secure.zenthea.com',
      },
      {
        protocol: 'https',
        hostname: 'medical-assets.zenthea.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        util: false,
        querystring: false,
        path: false,
        os: false,
        child_process: false,
        // Postgres package uses these Node.js modules
        'pg-native': false,
      }
    }
    return config
  },

  // HIPAA-compliant security headers
  async headers() {
    const devConnectSrc = process.env.NODE_ENV !== 'production'
      ? ' http://127.0.0.1:7245 http://localhost:7245'
      : ''

    return [
      // Website builder preview route - allow same-origin iframe embedding
      {
        source: '/website-preview',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://maps.googleapis.com blob: data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "media-src 'self' https://res.cloudinary.com https://*.cloudinary.com blob: data:",
              `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.openai.com https://api.elevenlabs.io https://api.us.elevenlabs.io wss://api.us.elevenlabs.io https://human.biodigital.com https://maps.googleapis.com https://*.googleapis.com https://res.cloudinary.com https://*.cloudinary.com https://analytics-api-s.cloudinary.com https://video-analytics-api.cloudinary.com${devConnectSrc}`,
              "frame-src 'self' https://human.biodigital.com https://www.google.com https://maps.google.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
        ],
      },
      // Default headers for all other routes (exclude preview route)
      {
        source: '/((?!website-preview).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://maps.googleapis.com blob: data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "media-src 'self' https://res.cloudinary.com https://*.cloudinary.com blob: data:",
              `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.openai.com https://api.elevenlabs.io https://api.us.elevenlabs.io wss://api.us.elevenlabs.io https://human.biodigital.com https://maps.googleapis.com https://*.googleapis.com https://res.cloudinary.com https://*.cloudinary.com https://analytics-api-s.cloudinary.com https://video-analytics-api.cloudinary.com${devConnectSrc}`,
              "frame-src 'self' https://human.biodigital.com https://www.google.com https://maps.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=(self)',
              'geolocation=()',
              'interest-cohort=()',
              'payment=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()'
            ].join(', '),
          },
          {
            key: 'X-HIPAA-Compliant',
            value: 'true',
          },
          {
            key: 'X-Content-Security-Policy-Report-Only',
            value: "default-src 'self'; report-uri /api/security/csp-report",
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
      // API routes specific headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-API-Version',
            value: '1.0',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },

  // Redirects
  async redirects() {
    return [
      // Force HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://zenthea.com/:path*',
          permanent: true,
        },
      ] : []),
      // Patient portal redirects
      {
        source: '/patient',
        destination: '/patient/dashboard',
        permanent: true,
      },
    ]
  },

  // Experimental features
  experimental: {
    // Enable Turbopack for faster development
    // turbo: {},
  },

  // Standalone output for Docker/ECS deployment
  output: 'standalone',
}

export default nextConfig
