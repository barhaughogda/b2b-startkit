'use client';

import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/convex/_generated/api';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { convex } from '@/lib/convex';

/**
 * Hook to fetch and update clinic/tenant profile data
 * Handles errors gracefully and prevents render-phase state updates
 * 
 * Includes mutations for:
 * - Branding (logo, colors, favicon)
 * - Contact info (phone, email, website, address)
 * - Info (name, tagline, description)
 * - Slug (URL path)
 * - Domains (subdomain, custom domain, preferred access)
 */
export function useClinicProfile() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;
  const [queryError, setQueryError] = useState<Error | null>(null);

  // Check if we can use Convex queries
  const canQuery = useMemo(() => {
    return tenantId && canUseConvexQuery(session?.user?.id, tenantId);
  }, [tenantId, session?.user?.id]);

  // Determine query args - memoized to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    if (!canQuery || !tenantId || !convex) {
      return 'skip';
    }
    return { tenantId };
  }, [canQuery, tenantId]);

  // Fetch tenant branding data (includes name, branding, contactInfo, slug, domains, etc.)
  // Uses tenantBranding API for more complete data including URL/domain settings
  // Always pass the query function - Convex handles 'skip' internally
  // Note: useQuery returns undefined when loading, null when not found, or data when successful
  // If the deployed Convex function throws, the error boundary will catch it
  const tenantData = useQuery(
    api.tenantBranding.getTenantBranding,
    queryArgs
  );

  // Clear error when query succeeds - use effect to avoid render-phase updates
  useEffect(() => {
    if (tenantData !== undefined) {
      // Only clear error if we got a result (null or data)
      if (tenantData !== null || !canQuery) {
        setQueryError(null);
      }
    }
  }, [tenantData, canQuery]);

  // Update mutations for branding (logo, colors, favicon)
  const updateBranding = useMutation(
    api.tenantBranding.updateTenantBranding
  );

  // Update mutations for contact info (phone, email, website, address)
  const updateContactInfo = useMutation(
    api.tenants.updateTenantContactInfo
  );

  // Update mutations for basic info (name, tagline, description)
  const updateInfo = useMutation(
    api.tenantBranding.updateTenantInfo
  );

  // Update mutations for URL slug
  const updateSlug = useMutation(
    api.tenantBranding.updateTenantSlug
  );

  // Update mutations for domain settings (subdomain, custom domain, preferred access)
  const updateDomains = useMutation(
    api.tenantBranding.updateTenantDomains
  );

  // Handle loading state: undefined means loading, null means tenant not found
  const isLoading = tenantData === undefined && canQuery && !queryError;
  const hasError = (tenantData === null && canQuery) || !!queryError;

  return {
    tenantData: tenantData ?? null, // Normalize to null if undefined (when not querying)
    updateBranding,
    updateContactInfo,
    updateInfo,
    updateSlug,
    updateDomains,
    isLoading,
    hasError,
    tenantId,
    canQuery: !!canQuery,
    error: queryError,
  };
}

