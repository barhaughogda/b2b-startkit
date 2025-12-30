/**
 * Tenant Authentication Utilities
 * 
 * Handles validation of user access to specific tenants.
 * Used to enforce that users can only login through their own tenant's portal.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Types
export interface TenantAccessResult {
  allowed: boolean;
  reason?: string;
  correctPortalUrl?: string;
  tenantName?: string;
}

export interface UserTenantInfo {
  tenantId: string | null;
  tenantSlug?: string | null;
  role: string;
}

/**
 * Validate that a user can access a specific tenant portal
 * 
 * Rules:
 * - Superadmins can access any portal (but should use main zenthea.ai)
 * - Users can only access their assigned tenant's portal
 * - Users without a tenant can only access main zenthea.ai
 */
export function validateUserTenantAccess(
  user: UserTenantInfo,
  targetTenantId: string | null,
  options?: {
    baseUrl?: string;
  }
): TenantAccessResult {
  const baseUrl = options?.baseUrl || 'https://zenthea.ai';

  // Superadmins can access any portal
  if (user.role === 'super_admin') {
    return { allowed: true };
  }

  // If target is main portal (no tenant specified)
  if (!targetTenantId) {
    // Only superadmins should use main portal
    // Other users should be redirected to their tenant portal
    if (user.tenantId) {
      return {
        allowed: false,
        reason: 'Please use your organization\'s login portal',
        correctPortalUrl: user.tenantSlug 
          ? `${baseUrl}/clinic/${user.tenantSlug}/login`
          : undefined,
        tenantName: undefined, // Would need to fetch this
      };
    }
    // User without tenant trying main portal - should not happen in normal flow
    return { allowed: true };
  }

  // If user has no tenant assigned
  if (!user.tenantId) {
    return {
      allowed: false,
      reason: 'Your account is not associated with any organization',
    };
  }

  // Check if user's tenant matches target tenant
  if (user.tenantId !== targetTenantId) {
    return {
      allowed: false,
      reason: 'Your account is not associated with this organization',
      correctPortalUrl: user.tenantSlug 
        ? `${baseUrl}/clinic/${user.tenantSlug}/login`
        : `${baseUrl}/auth/signin`,
    };
  }

  // User's tenant matches target tenant - allow access
  return { allowed: true };
}

/**
 * Get the correct login URL for a user based on their tenant
 */
export function getCorrectLoginUrl(
  user: UserTenantInfo,
  baseUrl: string = 'https://zenthea.ai'
): string {
  // Superadmins go to main portal
  if (user.role === 'super_admin') {
    return `${baseUrl}/auth/signin`;
  }

  // Users with tenant go to their tenant portal
  if (user.tenantSlug) {
    return `${baseUrl}/clinic/${user.tenantSlug}/login`;
  }

  // Fallback to main portal
  return `${baseUrl}/auth/signin`;
}

/**
 * Check if a hostname is a tenant-specific portal
 */
export function isTenantPortal(hostname: string): boolean {
  // Check for subdomain pattern
  const mainDomains = ['zenthea.ai', 'zenthea.com', 'localhost', 'vercel.app'];
  const normalizedHost = (hostname.split(':')[0] || '').toLowerCase();

  // If it's not a main domain, it's a custom domain (tenant portal)
  const isMainDomain = mainDomains.some(domain => 
    normalizedHost === domain || 
    normalizedHost.endsWith(`.${domain}`) && 
    ['www', 'api', 'app', 'staging', 'dev'].includes(normalizedHost.replace(`.${domain}`, ''))
  );

  if (!isMainDomain) {
    return true;
  }

  // Check for subdomain on main domains
  for (const mainDomain of mainDomains) {
    if (normalizedHost.endsWith(`.${mainDomain}`)) {
      const subdomain = normalizedHost.replace(`.${mainDomain}`, '');
      if (!['www', 'api', 'app', 'staging', 'dev', 'test'].includes(subdomain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract tenant identifier from hostname
 * Returns subdomain or null if on main domain
 */
export function extractTenantFromHostname(hostname: string): string | null {
  const normalizedHost = (hostname.split(':')[0] || '').toLowerCase();
  const mainDomains = ['zenthea.ai', 'zenthea.com', 'localhost', 'vercel.app'];

  // Check for custom domain (not a zenthea domain)
  const isCustomDomain = !mainDomains.some(domain => 
    normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
  );

  if (isCustomDomain) {
    // For custom domains, return the full domain as identifier
    // The actual tenant lookup will be done via customDomain
    return normalizedHost;
  }

  // Check for subdomain on main domains
  for (const mainDomain of mainDomains) {
    if (normalizedHost.endsWith(`.${mainDomain}`)) {
      const subdomain = normalizedHost.replace(`.${mainDomain}`, '');
      const excludedSubdomains = ['www', 'api', 'app', 'staging', 'dev', 'test', 'admin', 'portal'];
      if (!excludedSubdomains.includes(subdomain)) {
        return subdomain;
      }
    }
  }

  return null;
}

/**
 * Error messages for tenant access validation
 */
export const TENANT_ACCESS_ERRORS = {
  WRONG_PORTAL: 'You are trying to sign in at the wrong portal. Please use your organization\'s login page.',
  NOT_ASSOCIATED: 'Your account is not associated with this organization. Please contact your administrator.',
  TENANT_NOT_FOUND: 'This organization was not found. Please check the URL and try again.',
  TENANT_INACTIVE: 'This organization\'s portal is currently unavailable. Please contact support.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked due to too many failed login attempts.',
  PASSWORD_EXPIRED: 'Your password has expired. Please reset your password.',
} as const;

/**
 * Generate a helpful error message with portal redirect link
 */
export function generatePortalErrorMessage(
  error: keyof typeof TENANT_ACCESS_ERRORS,
  correctPortalUrl?: string,
  tenantName?: string
): { message: string; actionUrl?: string; actionText?: string } {
  const baseMessage = TENANT_ACCESS_ERRORS[error];
  
  if (error === 'WRONG_PORTAL' && correctPortalUrl) {
    return {
      message: baseMessage,
      actionUrl: correctPortalUrl,
      actionText: tenantName ? `Go to ${tenantName} Portal` : 'Go to Your Portal',
    };
  }

  return { message: baseMessage };
}

