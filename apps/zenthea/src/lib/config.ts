// Application configuration based on environment
export const config = {
  // Application mode: 'demo' | 'production'
  mode: (process.env.APP_MODE || 'production') as 'demo' | 'production',
  
  // Demo mode configuration - enable in development for easier testing
  // or when explicitly set via APP_MODE=demo
  isDemoMode: process.env.APP_MODE === 'demo' || process.env.NODE_ENV === 'development',
  
  // Authentication configuration
  auth: {
    // Note: All authentication now goes through Convex - no hardcoded credentials
    // Demo credentials listed here are for reference/display only
    // Users must be seeded in Convex using: npm run seed:demo-users
    demoCredentials: {
      provider: { email: 'provider@demo.com', password: 'demo123', tenantId: 'demo-tenant' },
      patient: { email: 'patient@demo.com', password: 'demo123', tenantId: 'demo-tenant' },
      admin: { email: 'admin@demo.com', password: 'demo123', tenantId: 'demo-tenant' }
    }
  },
  
  // Data source configuration
  dataSource: {
    // All data now comes from Convex - no mock data fallback
    // Convex URL must be set for authentication and data access
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    convexKey: process.env.CONVEX_DEPLOY_KEY
  },
  
  // Feature flags
  features: {
    // Enable/disable features based on mode
    realTimeUpdates: process.env.APP_MODE !== 'demo',
    auditLogging: process.env.APP_MODE !== 'demo',
    encryption: process.env.APP_MODE !== 'demo',
    mfa: process.env.APP_MODE !== 'demo'
  },
  
  // UI configuration
  ui: {
    showDemoBanner: process.env.APP_MODE === 'demo',
    demoBannerText: 'DEMO MODE - Using mock data for testing',
    showDataSource: process.env.NODE_ENV === 'development'
  }
};

// Helper functions
export const isDemoMode = () => config.isDemoMode;
export const isProductionMode = () => config.mode === 'production';
export const getDemoCredentials = (role: 'provider' | 'patient' | 'admin') => config.auth.demoCredentials[role];
