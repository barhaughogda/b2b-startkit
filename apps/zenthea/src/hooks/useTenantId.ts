'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Hook to extract tenant ID from various sources
 * 
 * Priority order:
 * 1. URL query parameter (?tenantId=...)
 * 2. Subdomain (e.g., clinic-123.zenthea.com)
 * 3. Environment variable (for single-tenant deployments)
 * 
 * Returns null if tenant cannot be determined (no default fallback)
 * 
 * @returns {string | null} Tenant ID or null if cannot be determined
 */
export function useTenantId(): string | null {
  const searchParams = useSearchParams();

  return useMemo(() => {
    // 1. Check URL query parameter
    const queryTenantId = searchParams?.get('tenantId');
    if (queryTenantId && queryTenantId.trim().length > 0) {
      return queryTenantId.trim();
    }

    // 2. Check subdomain (e.g., clinic-123.zenthea.com)
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host && host.includes('.')) {
        const parts = host.split('.');
        const subdomain = parts[0];
        
        // Only consider it a tenant ID if it matches our pattern
        // Exclude common non-tenant subdomains
        const excludedSubdomains = ['www', 'api', 'app', 'staging', 'dev', 'test', 'localhost'];
        if (
          subdomain &&
          !excludedSubdomains.includes(subdomain.toLowerCase()) &&
          subdomain.length > 3
        ) {
          return subdomain;
        }
      }
    }

    // 3. Check environment variable (for single-tenant deployments)
    // Note: Only NEXT_PUBLIC_* env vars are available in client components
    const envTenantId = process.env.NEXT_PUBLIC_TENANT_ID;
    if (envTenantId && envTenantId.trim().length > 0) {
      return envTenantId.trim();
    }

    // Return null if tenant cannot be determined
    // This prevents cross-tenant data leakage
    return null;
  }, [searchParams]);
}

/**
 * Validates that a tenant ID is in a valid format
 * 
 * @param tenantId - Tenant ID to validate
 * @returns {boolean} True if tenant ID is valid
 */
export function isValidTenantId(tenantId: string | null): tenantId is string {
  if (!tenantId || tenantId.trim().length === 0) {
    return false;
  }

  // Basic validation: alphanumeric, hyphens, underscores, length 3-50
  const tenantIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
  return tenantIdPattern.test(tenantId.trim());
}

