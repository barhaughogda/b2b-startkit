/**
 * Tenant Routing Utilities
 * 
 * Handles extraction and resolution of tenant context from various sources:
 * - Custom domains (e.g., portal.acmeclinic.com)
 * - Subdomains (e.g., acme-health.zenthea.ai)
 * - Path-based routing (e.g., zenthea.ai/clinic/acme-health)
 */

// Subdomains that should NOT be treated as tenant subdomains
const EXCLUDED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'staging',
  'dev',
  'test',
  'localhost',
  'admin',
  'superadmin',
  'portal',
  'dashboard',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'assets',
  'static',
];

// Main domains that are NOT custom domains
const MAIN_DOMAINS = [
  'zenthea.ai',
  'zenthea.com',
  'localhost',
  'vercel.app',
];

export interface TenantContext {
  type: 'custom_domain' | 'subdomain' | 'path' | 'none';
  customDomain?: string;
  subdomain?: string;
  slug?: string;
  tenantId?: string;
}

/**
 * Extract tenant context from a request hostname and pathname
 * 
 * Priority order:
 * 1. Custom domain (e.g., portal.acmeclinic.com)
 * 2. Subdomain (e.g., acme-health.zenthea.ai)
 * 3. Path-based (e.g., /clinic/acme-health)
 * 
 * SECURITY: Validates hostname format and handles edge cases
 */
export function extractTenantFromHost(
  hostname: string,
  pathname: string
): TenantContext {
  try {
    // Validate hostname input
    if (!hostname || typeof hostname !== 'string') {
      return { type: 'none' };
    }

    // Normalize hostname (remove port, handle IDN)
    let normalizedHost = (hostname.split(':')[0] || '').toLowerCase();
    
    // Basic validation - reject obviously invalid hostnames
    if (normalizedHost.length > 253) { // Max DNS hostname length
      return { type: 'none' };
    }
    
    // Remove any invalid characters (basic sanitization)
    normalizedHost = normalizedHost.replace(/[^a-z0-9.-]/g, '');
  
  // Check if this is a custom domain (not a main domain)
  const isMainDomain = MAIN_DOMAINS.some(domain => 
    normalizedHost === domain || 
    normalizedHost.endsWith(`.${domain}`) ||
    normalizedHost.includes('localhost')
  );

  if (!isMainDomain) {
    // This is a custom domain
    return {
      type: 'custom_domain',
      customDomain: normalizedHost,
    };
  }

  // Check for subdomain on main domains
  for (const mainDomain of MAIN_DOMAINS) {
    if (normalizedHost.endsWith(`.${mainDomain}`)) {
      const subdomain = normalizedHost.replace(`.${mainDomain}`, '');
      
      // Skip excluded subdomains
      if (EXCLUDED_SUBDOMAINS.includes(subdomain)) {
        break;
      }
      
      // Valid tenant subdomain
      return {
        type: 'subdomain',
        subdomain,
      };
    }
  }

    // Check for path-based routing
    if (pathname && typeof pathname === 'string') {
      const pathMatch = pathname.match(/^\/clinic\/([a-zA-Z0-9-_]+)/);
      if (pathMatch && pathMatch[1]) {
        const slug = pathMatch[1];
        // Validate slug format
        if (isValidSlug(slug)) {
          return {
            type: 'path',
            slug: slug,
          };
        }
      }
    }

    return { type: 'none' };
  } catch (error) {
    // Log error in development, silently fail in production for security
    if (process.env.NODE_ENV === 'development') {
      console.error('Error extracting tenant from host:', error);
    }
    return { type: 'none' };
  }
}

/**
 * Check if a pathname is a public tenant route (no auth required)
 * 
 * Public routes are tenant-specific pages that don't require authentication:
 * - /clinic/[slug] - Landing page
 * - /clinic/[slug]/[pageSlug] - Website builder pages (services, team, contact, etc.)
 * - /clinic/[slug]/book/* - Booking pages
 * - /clinic/[slug]/providers/* - Provider/care team pages
 * - /clinic/[slug]/locations/* - Clinic location pages
 * - /clinic/[slug]/login - Tenant-specific login page
 * - /clinic/[slug]/register - Tenant registration page
 * 
 * Protected routes (require auth) are routes without a tenant slug:
 * - /clinic/dashboard (no slug, direct route)
 * - /clinic/settings (no slug, direct route)
 * - /clinic/calendar (no slug, direct route)
 * - etc.
 * 
 * SECURITY: This function validates pathname format to prevent path traversal attacks.
 * It only allows alphanumeric characters, hyphens, and underscores in slugs.
 * 
 * @param pathname - The pathname to check (e.g., '/clinic/demo-clinic/services')
 * @returns true if the route is public, false otherwise
 */
export function isPublicTenantRoute(pathname: string): boolean {
  // Validate input
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }

  // Security: Prevent path traversal attacks (e.g., /clinic/../admin)
  // Reject paths with directory traversal patterns
  if (pathname.includes('..') || pathname.includes('//')) {
    return false;
  }

  // Security: Reject paths that don't start with /clinic/
  if (!pathname.startsWith('/clinic/')) {
    return false;
  }

  // Landing page: /clinic/[slug] (exactly one segment after /clinic/)
  // Slug validation: alphanumeric, hyphens, underscores only
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+$/)) {
    return true;
  }
  
  // Website builder pages and other tenant sub-routes: /clinic/[slug]/[pageSlug]
  // This pattern matches any route with a tenant slug followed by another segment
  // Examples: /clinic/demo-clinic/services, /clinic/demo-clinic/team, etc.
  // Protected routes like /clinic/dashboard don't match because they lack the second segment
  // Security: Validate slug format to prevent injection
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/)) {
    return true;
  }
  
  // Multi-segment public routes (e.g., /clinic/[slug]/book/step1)
  // Security: Validate slug format for each segment
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/book/)) {
    return true; // Booking pages
  }
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/providers/)) {
    return true; // Provider/care team pages
  }
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/locations/)) {
    return true; // Clinic location pages
  }
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/login/)) {
    return true; // Tenant-specific login page
  }
  if (pathname.match(/^\/clinic\/[a-zA-Z0-9-_]+\/register/)) {
    return true; // Tenant registration page
  }
  
  return false;
}

/**
 * Check if hostname is a tenant domain (custom domain or subdomain)
 */
export function isTenantDomain(hostname: string): boolean {
  const normalizedHost = (hostname.split(':')[0] || '').toLowerCase();
  
  // Check if custom domain
  const isMainDomain = MAIN_DOMAINS.some(domain => 
    normalizedHost === domain || 
    normalizedHost.endsWith(`.${domain}`) ||
    normalizedHost.includes('localhost')
  );

  if (!isMainDomain) {
    return true; // Custom domain
  }

  // Check for subdomain
  for (const mainDomain of MAIN_DOMAINS) {
    if (normalizedHost.endsWith(`.${mainDomain}`)) {
      const subdomain = normalizedHost.replace(`.${mainDomain}`, '');
      if (!EXCLUDED_SUBDOMAINS.includes(subdomain)) {
        return true; // Tenant subdomain
      }
    }
  }

  return false;
}

/**
 * Generate the public landing page URL for a tenant
 */
export function getTenantLandingUrl(
  tenant: { slug?: string | null; domains?: { subdomain?: string | null; customDomain?: string | null; customDomainVerified?: boolean | null } | null },
  baseUrl: string = 'https://zenthea.ai'
): string {
  // Prefer custom domain if verified
  if (tenant.domains?.customDomain && tenant.domains.customDomainVerified) {
    return `https://${tenant.domains.customDomain}`;
  }
  
  // Fall back to subdomain
  if (tenant.domains?.subdomain) {
    const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, '');
    return `https://${tenant.domains.subdomain}.${baseDomain}`;
  }
  
  // Fall back to path-based
  if (tenant.slug) {
    return `${baseUrl}/clinic/${tenant.slug}`;
  }
  
  return baseUrl;
}

/**
 * Generate the login URL for a tenant
 */
export function getTenantLoginUrl(
  tenant: { slug?: string | null; domains?: { subdomain?: string | null; customDomain?: string | null; customDomainVerified?: boolean | null } | null },
  baseUrl: string = 'https://zenthea.ai'
): string {
  const landingUrl = getTenantLandingUrl(tenant, baseUrl);
  return `${landingUrl}/login`;
}

/**
 * Validate a slug format
 */
export function isValidSlug(slug: string): boolean {
  // Allow lowercase letters, numbers, hyphens
  // Must start with a letter
  // 3-50 characters
  const slugRegex = /^[a-z][a-z0-9-]{2,49}$/;
  return slugRegex.test(slug);
}

/**
 * Generate a slug from a string (e.g., tenant name)
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

