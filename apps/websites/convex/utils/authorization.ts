import { QueryCtx, MutationCtx, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";

/**
 * Authorization helper functions for patient profile mutations
 * Ensures HIPAA compliance by verifying user access rights
 */

export interface AuthorizationResult {
  authorized: boolean;
  userId?: Id<"users">;
  userRole?: string;
  isOwner?: boolean;
  departments?: string[];
  error?: string;
}

/**
 * Result of a permission check with detailed information
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  error?: string;
  path?: string; // The path that was checked (e.g., "patients.features.list.enabled")
  viewScope?: "all_clinic" | "department" | "care_team" | "own_only"; // View scope if applicable
}

/**
 * Type for permission tree nodes during navigation
 * Represents the various shapes a permission node can take in the hierarchical tree
 */
type PermissionNode =
  | {
      enabled?: boolean;
      viewScope?: "all_clinic" | "department" | "care_team" | "own_only";
      features?: Record<string, PermissionNode>;
      components?: Record<string, PermissionNode>;
      tabs?: Record<string, PermissionNode>;
      [key: string]: PermissionNode | boolean | "all_clinic" | "department" | "care_team" | "own_only" | undefined;
    }
  | boolean
  | undefined;

/**
 * Type guard to check if a PermissionNode is an object (not boolean, null, or undefined)
 */
function isPermissionObject(node: PermissionNode): node is Exclude<PermissionNode, boolean | undefined> {
  return node !== undefined && node !== null && typeof node === 'object';
}

/**
 * Check if a user has clinic user role (clinic_user, admin, or provider).
 * Supports backward compatibility with admin/provider roles during migration.
 * 
 * @param role - User role string
 * @returns true if user has clinic user role, false otherwise
 */
function isClinicUserRole(role: string | undefined): boolean {
  if (!role) {
    return false;
  }
  return role === 'clinic_user' || role === 'admin' || role === 'provider';
}

/**
 * Verify user is authenticated and get user information
 * Updated to support clinic_user role with backward compatibility for admin/provider roles.
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user (from NextAuth session)
 * @returns Authorization result with user info including isOwner and departments, or error
 */
export async function verifyUserAuthentication(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined
): Promise<AuthorizationResult> {
  if (!userEmail) {
    return {
      authorized: false,
      error: "Authentication required. Please sign in to access patient data.",
    };
  }

  // Find user by email
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", userEmail))
    .first();

  if (!user) {
    // Auto-provision user if they exist in Clerk but not in Convex yet
    // This is common in development environments without webhooks configured
    if (userEmail) {
      // For the website builder and initial setup, we'll allow this
      // In a production app, you'd want a more secure sync or webhook
      const now = Date.now();
      try {
        // We can't use runMutation here because we might be in a query
        // But if we are in a mutation context, we can provision
        if ('insert' in ctx.db) {
          const userId = await (ctx as MutationCtx).db.insert("users", {
            email: userEmail,
            name: userEmail.split('@')[0], // Fallback name
            role: "admin", // Default to admin for first-time users
            passwordHash: "clerk-authenticated", // No local password needed
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
          
          return {
            authorized: true,
            userId,
            userRole: "admin",
            isOwner: true,
            departments: [],
          };
        }
      } catch (e) {
        // Fallback to error if insertion fails
      }
    }

    return {
      authorized: false,
      error: "User not found. Please sign in with a valid account.",
    };
  }

  if (!user.isActive) {
    return {
      authorized: false,
      error: "Account is inactive. Please contact support.",
    };
  }

  return {
    authorized: true,
    userId: user._id,
    userRole: user.role,
    isOwner: user.isOwner ?? false,
    departments: user.departments ?? [],
  };
}

/**
 * Verify clinic user has access to a resource within a tenant.
 * This is a general-purpose function that verifies:
 * 1. User is authenticated
 * 2. User has clinic_user role (with backward compatibility for admin/provider)
 * 3. User belongs to the specified tenant (tenant isolation)
 * 
 * This function can be used for any resource access check that requires
 * clinic user authentication and tenant isolation.
 * 
 * For permission-based access checks, use this function in combination
 * with permission checking functions (see Task 2.3.4).
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user (from NextAuth session)
 * @param tenantId - ID of the tenant to verify access for
 * @returns Authorization result with user info, or error if not authorized
 * 
 * @example
 * ```typescript
 * // Verify clinic user can access resources in their tenant
 * const result = await verifyClinicUserAccess(ctx, userEmail, resourceTenantId);
 * if (!result.authorized) {
 *   throw new Error(result.error);
 * }
 * // Use result.userId, result.isOwner, result.departments for further checks
 * ```
 */
export async function verifyClinicUserAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  tenantId: string
): Promise<AuthorizationResult> {
  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return authResult;
  }

  // Check if user is a clinic user (clinic_user, admin, or provider)
  if (!authResult.userRole || !isClinicUserRole(authResult.userRole)) {
    return {
      authorized: false,
      error: "Only clinic users can perform this action.",
    };
  }

  // Validate tenant isolation - ensure user belongs to the tenant they're trying to access
  const user = await ctx.db.get(authResult.userId!);
  
  // If user exists but has no tenantId, and we're in a mutation, auto-link them
  // This helps with initial setup in development environments
  if (user && !user.tenantId && 'patch' in ctx.db) {
    await (ctx as MutationCtx).db.patch(user._id, { tenantId });
    return {
      authorized: true,
      userId: authResult.userId,
      userRole: authResult.userRole,
      isOwner: authResult.isOwner,
      departments: authResult.departments,
    };
  }

  if (!user || user.tenantId !== tenantId) {
    return {
      authorized: false,
      error: "You do not have access to this organization. Clinic users can only access resources in their own organization.",
    };
  }

  return {
    authorized: true,
    userId: authResult.userId,
    userRole: authResult.userRole,
    isOwner: authResult.isOwner,
    departments: authResult.departments,
  };
}

/**
 * Verify patient can access their own profile
 * @param ctx - Convex context
 * @param patientId - ID of the patient being accessed
 * @param userEmail - Email of the authenticated user
 * @returns Authorization result
 */
export async function verifyPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
  userEmail: string | undefined
): Promise<AuthorizationResult> {
  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return authResult;
  }

  // Get patient record
  const patient = await ctx.db.get(patientId);
  if (!patient) {
    return {
      authorized: false,
      error: "Patient not found.",
    };
  }

  // Check if user is the patient themselves (email match)
  if (patient.email && patient.email.toLowerCase() === userEmail?.toLowerCase()) {
    return {
      authorized: true,
      userId: authResult.userId,
      userRole: authResult.userRole,
      isOwner: authResult.isOwner,
      departments: authResult.departments,
    };
  }

  // Check if user is a clinic user (clinic_user, admin, or provider) with access to this tenant
  if (authResult.userRole && isClinicUserRole(authResult.userRole)) {
    // Verify user belongs to the same tenant as the patient
    const user = await ctx.db.get(authResult.userId!);
    if (user && user.tenantId === patient.tenantId) {
      return {
        authorized: true,
        userId: authResult.userId,
        userRole: authResult.userRole,
        isOwner: authResult.isOwner,
        departments: authResult.departments,
      };
    }
  }

  return {
    authorized: false,
    error: "You do not have permission to access this patient's profile. Patients can only access their own profile, and clinic users can only access patients in their organization.",
  };
}

/**
 * Verify clinic user access to patient
 * Updated to support clinic_user role with backward compatibility for admin/provider roles.
 * 
 * @param ctx - Convex context
 * @param patientId - ID of the patient being accessed
 * @param userEmail - Email of the authenticated user
 * @returns Authorization result
 */
export async function verifyProviderAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
  userEmail: string | undefined
): Promise<AuthorizationResult> {
  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return authResult;
  }

  // Check if user is a clinic user (clinic_user, admin, or provider)
  if (!authResult.userRole || !isClinicUserRole(authResult.userRole)) {
    return {
      authorized: false,
      error: "Only clinic users (providers and administrators) can perform this action.",
    };
  }

  // Get patient record
  const patient = await ctx.db.get(patientId);
  if (!patient) {
    return {
      authorized: false,
      error: "Patient not found.",
    };
  }

  // Verify user belongs to the same tenant as the patient
  const user = await ctx.db.get(authResult.userId!);
  if (!user || user.tenantId !== patient.tenantId) {
    return {
      authorized: false,
      error: "You do not have access to patients outside your organization.",
    };
  }

  return {
    authorized: true,
    userId: authResult.userId,
    userRole: authResult.userRole,
    isOwner: authResult.isOwner,
    departments: authResult.departments,
  };
}

/**
 * Verify user is clinic owner and has access to the specified tenant.
 * Clinic owners have full administrative access to their clinic's settings,
 * including role management, department management, and user invitations.
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user (from NextAuth session)
 * @param tenantId - ID of the tenant to verify ownership for
 * @returns Authorization result with user info, or error if not owner or tenant mismatch
 */
export async function verifyOwnerAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  tenantId: string
): Promise<AuthorizationResult> {
  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return authResult;
  }

  // Check if user is an owner
  if (!authResult.isOwner) {
    return {
      authorized: false,
      error: "Only clinic owners can perform this action.",
    };
  }

  // Validate tenant context - ensure user belongs to the tenant they're trying to access
  const user = await ctx.db.get(authResult.userId!);
  if (!user || user.tenantId !== tenantId) {
    return {
      authorized: false,
      error: "You do not have access to this organization. Owners can only access their own clinic.",
    };
  }

  return {
    authorized: true,
    userId: authResult.userId,
    userRole: authResult.userRole,
    isOwner: authResult.isOwner,
    departments: authResult.departments,
  };
}

/**
 * Check if a user has a specific permission in the hierarchical permission tree.
 * 
 * Navigates the permission tree structure: section > feature > component > card > tab
 * Returns true only if all levels in the path are enabled.
 * 
 * Owners always have full access (returns true for any permission check).
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user (from NextAuth session)
 * @param path - The permission path to check (e.g., "patients.features.create" or "patients.features.list.components.patientCard.tabs.overview")
 * @returns Detailed permission check result with error information if denied
 * 
 * @example
 * ```typescript
 * // Check if user can create patients
 * const result = await checkPermission(ctx, userEmail, 'patients.features.create');
 * if (!result.hasPermission) {
 *   throw new Error(result.error);
 * }
 * 
 * // Check if user can view patient card overview tab
 * const result = await checkPermission(ctx, userEmail, 'patients.features.list.components.patientCard.tabs.overview');
 * if (result.hasPermission) {
 *   // User has access, also check viewScope if needed
 *   const viewScope = result.viewScope; // e.g., "department", "all_clinic"
 * }
 * ```
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  path: string
): Promise<PermissionCheckResult> {
  // Helper to create error result
  const createErrorResult = (error: string, checkedPath: string): PermissionCheckResult => {
    return {
      hasPermission: false,
      error,
      path: checkedPath
    };
  };

  // Helper to create success result
  const createSuccessResult = (checkedPath: string, viewScope?: "all_clinic" | "department" | "care_team" | "own_only"): PermissionCheckResult => {
    return {
      hasPermission: true,
      path: checkedPath,
      viewScope
    };
  };

  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return createErrorResult(authResult.error || "Authentication required", path);
  }

  // Owner override: owners have full access
  if (authResult.isOwner) {
    return createSuccessResult(path);
  }

  // Get user to fetch custom role permissions
  const user = await ctx.db.get(authResult.userId!);
  if (!user) {
    return createErrorResult("User not found", path);
  }

  // Get permissions from custom role if user has one
  let permissions: any = undefined;
  if (user.customRoleId) {
    try {
      const customRole = await ctx.db.get(user.customRoleId);
      if (customRole) {
        permissions = customRole.permissions;
      }
    } catch (error) {
      // If custom role not found or error, permissions will remain undefined
      // This is acceptable - user will have no permissions
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Could not fetch permissions for custom role ${user.customRoleId}:`, error);
      }
    }
  }

  // If no permissions provided, deny access
  if (!permissions) {
    return createErrorResult('No permissions assigned to user', path);
  }

  // Split path into parts (e.g., "patients.features.create" -> ["patients", "features", "create"])
  const rawParts = path.split('.');
  
  // Check for empty parts (e.g., "patients..features" has an empty part)
  if (rawParts.some(part => part === '')) {
    return createErrorResult('Invalid permission path: contains empty segments', path);
  }
  
  const pathParts = rawParts.filter(Boolean);
  
  if (pathParts.length === 0) {
    return createErrorResult('Empty permission path', path);
  }

  // Navigate the permission tree
  let current: PermissionNode = permissions as PermissionNode;
  const checkedPath: string[] = [];
  let sectionViewScope: "all_clinic" | "department" | "care_team" | "own_only" | undefined = undefined;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (part === undefined) continue;
    checkedPath.push(part);

    // Validate current level
    if (!current || typeof current !== 'object') {
      return createErrorResult(
        `Permission path invalid at "${checkedPath.join('.')}": not an object`,
        checkedPath.join('.')
      );
    }

    // Handle section-level (first part)
    if (i === 0) {
      if (!isPermissionObject(current)) {
        return createErrorResult(`Section "${part}" not found in permissions`, part);
      }
      const section = current[part];
      // Exclude string literals (viewScope values) - they're not PermissionNode objects
      if (typeof section === 'string' || !isPermissionObject(section)) {
        return createErrorResult(`Section "${part}" not found in permissions`, part);
      }

      if (section.enabled !== true) {
        return createErrorResult(`Section "${part}" is not enabled`, part);
      }

      // Extract view scope from section if it exists
      if (section.viewScope) {
        sectionViewScope = section.viewScope;
      }

      // If only checking section access
      if (pathParts.length === 1) {
        return createSuccessResult(part, sectionViewScope);
      }

      current = section;
      continue;
    }

    // Handle "features" keyword
    if (part === 'features') {
      if (!isPermissionObject(current) || !current.features || !isPermissionObject(current.features)) {
        return createErrorResult(
          `Section "${checkedPath[0]}" has no features`,
          checkedPath.join('.')
        );
      }
      current = current.features;
      continue;
    }

    // Handle "components" keyword
    if (part === 'components') {
      if (!isPermissionObject(current) || !current.components || !isPermissionObject(current.components)) {
        return createErrorResult(
          `Feature "${checkedPath[checkedPath.length - 2]}" has no components`,
          checkedPath.join('.')
        );
      }
      current = current.components;
      continue;
    }

    // Handle "tabs" keyword
    if (part === 'tabs') {
      if (!isPermissionObject(current) || !current.tabs || !isPermissionObject(current.tabs)) {
        return createErrorResult(
          `Component "${checkedPath[checkedPath.length - 2]}" has no tabs`,
          checkedPath.join('.')
        );
      }
      current = current.tabs;
      continue;
    }

    // Check current level for the part
    // At this point, we know current is an object (from validation above)
    if (!isPermissionObject(current)) {
      return createErrorResult(
        `Permission path invalid at "${checkedPath.join('.')}": not an object`,
        checkedPath.join('.')
      );
    }
    const value = current[part];

    // If value is undefined, path is invalid
    if (value === undefined) {
      return createErrorResult(
        `Permission path invalid: "${part}" not found at "${checkedPath.join('.')}"`,
        checkedPath.join('.')
      );
    }

    // If value is boolean, return it (this is a leaf node)
    if (typeof value === 'boolean') {
      if (value) {
        return createSuccessResult(checkedPath.join('.'), sectionViewScope);
      } else {
        return createErrorResult(`Permission "${part}" is disabled`, checkedPath.join('.'));
      }
    }

    // Exclude string literals (viewScope values) - they're not PermissionNode objects
    if (typeof value === 'string') {
      return createErrorResult(
        `Permission path invalid: "${part}" has unexpected string value at "${checkedPath.join('.')}"`,
        checkedPath.join('.')
      );
    }

    // If value is an object, check if it has enabled property
    if (isPermissionObject(value)) {
      // Check enabled flag if it exists
      if ('enabled' in value && value.enabled !== true) {
        return createErrorResult(
          `Permission "${part}" is not enabled`,
          checkedPath.join('.')
        );
      }

      // If this is the last part, permission is granted (object exists and is enabled)
      if (i === pathParts.length - 1) {
        return createSuccessResult(checkedPath.join('.'), sectionViewScope);
      }

      // Continue navigating
      current = value;
      continue;
    }

    // Unexpected value type
    return createErrorResult(
      `Permission path invalid: "${part}" has unexpected type at "${checkedPath.join('.')}"`,
      checkedPath.join('.')
    );
  }

  // If we've navigated the entire path, permission is granted
  return createSuccessResult(checkedPath.join('.'), sectionViewScope);
}

/**
 * Result of a support access verification
 */
export interface SupportAccessResult {
  authorized: boolean;
  requestId?: Id<"supportAccessRequests">;
  error?: string;
  expiresAt?: number;
}

/**
 * Verify superadmin has valid support access request for accessing user/tenant data.
 * 
 * This function validates that:
 * 1. User is a superadmin
 * 2. A support access request exists and is approved
 * 3. The request has not expired (1 hour limit)
 * 4. Digital signature is present
 * 5. Access is logged to the audit trail
 * 
 * @param ctx - Convex context (must be MutationCtx to update audit trail)
 * @param userEmail - Email of the authenticated superadmin
 * @param targetUserId - Optional ID of the user account being accessed
 * @param targetTenantId - ID of the tenant being accessed
 * @param ipAddress - Optional IP address for audit logging
 * @param userAgent - Optional user agent for audit logging
 * @returns Support access result with authorization status and request details
 * 
 * @example
 * ```typescript
 * // Verify superadmin can access tenant data
 * const result = await verifySupportAccess(ctx, superadminEmail, undefined, tenantId);
 * if (!result.authorized) {
 *   throw new Error(result.error);
 * }
 * // Access granted - result.requestId contains the request ID
 * // result.expiresAt contains expiration timestamp
 * ```
 */
export async function verifySupportAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  targetUserId: Id<"users"> | undefined,
  targetTenantId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SupportAccessResult> {
  // Helper to create error result
  const createErrorResult = (error: string): SupportAccessResult => {
    return {
      authorized: false,
      error
    };
  };

  // First verify user is authenticated
  const authResult = await verifyUserAuthentication(ctx, userEmail);
  if (!authResult.authorized) {
    return createErrorResult(authResult.error || "Authentication required");
  }

  // Check if user is a superadmin
  const user = await ctx.db.get(authResult.userId!);
  if (!user) {
    return createErrorResult("User not found");
  }

  if (user.role !== "super_admin") {
    return createErrorResult("Only superadmins can perform support access. This action requires elevated privileges.");
  }

  // Find the support access request
  // Query by superadmin, target tenant, and status
  const now = Date.now();
  
  // First try to find an approved request
  const approvedRequests = await ctx.db
    .query("supportAccessRequests")
    .withIndex("by_superadmin_status", (q) => 
      q.eq("superadminId", authResult.userId!).eq("status", "approved")
    )
    .collect();

  // Filter by target tenant and optional target user
  let matchingRequest = approvedRequests.find(request => {
    const tenantMatches = request.targetTenantId === targetTenantId;
    const userMatches = targetUserId 
      ? request.targetUserId === targetUserId 
      : request.targetUserId === undefined; // Tenant-level access
    
    return tenantMatches && userMatches;
  });

  // If no matching request found, check for pending requests (for better error messages)
  if (!matchingRequest) {
    const pendingRequests = await ctx.db
      .query("supportAccessRequests")
      .withIndex("by_superadmin_status", (q) => 
        q.eq("superadminId", authResult.userId!).eq("status", "pending")
      )
      .collect();

    const pendingMatch = pendingRequests.find(request => {
      const tenantMatches = request.targetTenantId === targetTenantId;
      const userMatches = targetUserId 
        ? request.targetUserId === targetUserId 
        : request.targetUserId === undefined;
      return tenantMatches && userMatches;
    });

    if (pendingMatch) {
      return createErrorResult("Support access request is pending approval. Please wait for the user to approve your request.");
    }

    return createErrorResult("No approved support access request found. Please request access first and wait for approval.");
  }

  // Check if request has expired
  if (!matchingRequest.expirationTimestamp) {
    return createErrorResult("Support access request is missing expiration timestamp. Please request new access.");
  }

  if (now > matchingRequest.expirationTimestamp) {
    // Update request status to expired if we're in a mutation context
    if ('runMutation' in ctx) {
      try {
        await ctx.db.patch(matchingRequest._id, {
          status: "expired",
          updatedAt: now,
          auditTrail: [
            ...matchingRequest.auditTrail,
            {
              action: "expired",
              timestamp: now,
              userId: authResult.userId!,
              details: { reason: "Access expired during verification" },
              ipAddress,
              userAgent,
            }
          ]
        });
      } catch (error) {
        // Log error in development, but don't expose in production
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to update expired request status:", error);
        }
        // Continue with error response even if update fails
        // Note: In production, consider using structured logging/monitoring
      }
    }
    
    return createErrorResult("Support access request has expired. Support access is limited to 1 hour. Please request new access.");
  }

  // Check if digital signature exists
  if (!matchingRequest.digitalSignature) {
    return createErrorResult("Support access request is missing digital signature. Digital signature is required for HIPAA compliance.");
  }

  // Verify signature timestamp is reasonable (not in the future, not too old)
  const signatureAge = now - matchingRequest.digitalSignature.signedAt;
  const maxSignatureAge = 2 * 60 * 60 * 1000; // 2 hours (should be within 1 hour of approval, but allow some buffer)
  if (signatureAge < 0 || signatureAge > maxSignatureAge) {
    return createErrorResult("Support access request has invalid signature timestamp. Please request new access.");
  }

  // Log access to audit trail (only in mutation context)
  if ('runMutation' in ctx) {
    try {
      await ctx.db.patch(matchingRequest._id, {
        updatedAt: now,
        auditTrail: [
          ...matchingRequest.auditTrail,
          {
            action: "accessed",
            timestamp: now,
            userId: authResult.userId!,
            details: {
              targetUserId: targetUserId || null,
              targetTenantId,
              purpose: matchingRequest.purpose,
            },
            ipAddress,
            userAgent,
          }
        ]
      });
    } catch (error) {
      // Log error in development, but don't expose in production
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to log support access to audit trail:", error);
      }
      // Don't fail the verification if audit logging fails, but log the error
      // Note: In production, consider using structured logging/monitoring for HIPAA compliance
    }
  }

  return {
    authorized: true,
    requestId: matchingRequest._id,
    expiresAt: matchingRequest.expirationTimestamp,
  };
}

/**
 * Query wrapper for verifyOwnerAccess to be used from actions
 * Actions can't directly call verifyOwnerAccess because it needs QueryCtx | MutationCtx
 * This query wrapper allows actions to call verifyOwnerAccess via ctx.runQuery
 */
export const verifyOwnerAccessQuery = query({
  args: {
    userEmail: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await verifyOwnerAccess(ctx, args.userEmail, args.tenantId);
  },
});

