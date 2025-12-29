import { NextRequest } from "next/server";

/**
 * Routes that require support access validation for superadmin
 * These routes access user/tenant data and require a valid support access request
 */
const SUPPORT_ACCESS_REQUIRED_ROUTES = [
  // User-specific routes (with ID in pathname)
  /^\/api\/superadmin\/users\/[^/]+/, // /api/superadmin/users/[id]
  /^\/api\/superadmin\/users\/[^/]+\/role/, // /api/superadmin/users/[id]/role
  /^\/superadmin\/users\/[^/]+/, // /superadmin/users/[id]
  
  // Tenant-specific routes (with ID in pathname)
  /^\/api\/superadmin\/tenants\/[^/]+/, // /api/superadmin/tenants/[id]
  /^\/superadmin\/tenants\/[^/]+/, // /superadmin/tenants/[id]
  
  // Base routes (may have query parameters with IDs)
  // Note: Query parameter extraction happens in extractSupportAccessTargets()
  /^\/api\/superadmin\/users$/, // /api/superadmin/users (may have ?tenantId= or ?userId=)
  /^\/api\/superadmin\/tenants$/, // /api/superadmin/tenants (may have ?id=)
] as const;

/**
 * Check if a route requires support access validation
 * @param pathname - The pathname to check
 * @returns true if the route requires support access validation
 */
export function requiresSupportAccess(pathname: string): boolean {
  return SUPPORT_ACCESS_REQUIRED_ROUTES.some(pattern => pattern.test(pathname));
}

/**
 * Extract target user ID and tenant ID from a request pathname
 * @param pathname - The request pathname
 * @param searchParams - URL search parameters
 * @returns Object with targetUserId and targetTenantId (may be undefined)
 */
export function extractSupportAccessTargets(
  pathname: string,
  searchParams?: URLSearchParams
): {
  targetUserId?: string;
  targetTenantId?: string;
} {
  const result: {
    targetUserId?: string;
    targetTenantId?: string;
  } = {};

  // Extract user ID from pathname patterns like /api/superadmin/users/[id]
  const userMatch = pathname.match(/^\/api\/superadmin\/users\/([^/]+)/) ||
                    pathname.match(/^\/superadmin\/users\/([^/]+)/);
  if (userMatch) {
    result.targetUserId = userMatch[1];
  }

  // Extract tenant ID from pathname patterns like /api/superadmin/tenants/[id]
  const tenantMatch = pathname.match(/^\/api\/superadmin\/tenants\/([^/]+)/) ||
                      pathname.match(/^\/superadmin\/tenants\/([^/]+)/);
  if (tenantMatch) {
    result.targetTenantId = tenantMatch[1];
  }

  // Extract from query parameters
  if (searchParams) {
    const tenantId = searchParams.get('tenantId');
    if (tenantId && !result.targetTenantId) {
      result.targetTenantId = tenantId;
    }

    const userId = searchParams.get('userId');
    if (userId && !result.targetUserId) {
      result.targetUserId = userId;
    }

    // Also check for 'id' parameter in tenant routes
    const id = searchParams.get('id');
    if (id && pathname.includes('/tenants') && !result.targetTenantId) {
      result.targetTenantId = id;
    }
  }

  return result;
}

/**
 * Get support access validation error message
 * @param reason - The reason for validation failure
 * @returns User-friendly error message
 */
export function getSupportAccessErrorMessage(reason: string): string {
  if (reason.includes('pending')) {
    return 'Support access request is pending approval. Please wait for the user to approve your request.';
  }
  if (reason.includes('expired')) {
    return 'Support access request has expired. Support access is limited to 1 hour. Please request new access.';
  }
  if (reason.includes('No approved')) {
    return 'No approved support access request found. Please request access first and wait for approval.';
  }
  return 'Support access validation failed. Please request access first and wait for approval.';
}

