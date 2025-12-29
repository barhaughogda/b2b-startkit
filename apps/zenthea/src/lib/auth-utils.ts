import type { User, PermissionTree, ViewScope } from '@/types';

/**
 * Shared authentication utility functions
 * Used for consistent callbackUrl parsing and redirect handling across login forms
 */

/**
 * Check if a user has clinic user role (clinic_user, admin, or provider).
 * Supports backward compatibility with admin/provider roles during migration.
 * 
 * @param userOrRole - User object with role property, or role string directly
 * @returns true if user has clinic user role, false otherwise
 * 
 * @example
 * ```typescript
 * isClinicUser({ role: 'clinic_user' }) // Returns true
 * isClinicUser({ role: 'admin' }) // Returns true (backward compatibility)
 * isClinicUser({ role: 'provider' }) // Returns true (backward compatibility)
 * isClinicUser({ role: 'patient' }) // Returns false
 * isClinicUser('clinic_user') // Returns true
 * ```
 */
export function isClinicUser(
  userOrRole: User | { role?: string } | string | null | undefined
): boolean {
  if (!userOrRole) {
    return false;
  }

  const role = typeof userOrRole === 'string' 
    ? userOrRole 
    : userOrRole.role;

  if (!role) {
    return false;
  }

  // Check for clinic_user role (new) or admin/provider (backward compatibility)
  return role === 'clinic_user' || role === 'admin' || role === 'provider';
}

/**
 * Check if a user is a clinic owner.
 * Clinic owners have full administrative access to their clinic's settings,
 * including role management, department management, and user invitations.
 * 
 * @param userOrIsOwner - User object with isOwner property, or boolean directly
 * @returns true if user is a clinic owner, false otherwise
 * 
 * @example
 * ```typescript
 * isOwner({ isOwner: true }) // Returns true
 * isOwner({ isOwner: false }) // Returns false
 * isOwner({ isOwner: undefined }) // Returns false (defaults to false)
 * isOwner(true) // Returns true
 * isOwner(false) // Returns false
 * ```
 */
export function isOwner(
  userOrIsOwner: User | { isOwner?: boolean } | boolean | null | undefined
): boolean {
  if (userOrIsOwner === null || userOrIsOwner === undefined) {
    return false;
  }

  // Handle direct boolean input
  if (typeof userOrIsOwner === 'boolean') {
    return userOrIsOwner;
  }

  // Handle user object with isOwner property
  // Defaults to false if isOwner is undefined (as per schema: optional field defaults to false)
  return userOrIsOwner.isOwner === true;
}

/**
 * Get user's department IDs.
 * Returns an array of department IDs that the user belongs to.
 * Returns an empty array if departments is undefined or null (as per schema: optional field defaults to empty array).
 * 
 * @param user - User object with departments property
 * @returns Array of department IDs, or empty array if undefined/null
 * 
 * @example
 * ```typescript
 * getUserDepartments({ departments: ['dept-1', 'dept-2'] }) // Returns ['dept-1', 'dept-2']
 * getUserDepartments({ departments: [] }) // Returns []
 * getUserDepartments({ departments: undefined }) // Returns []
 * getUserDepartments({}) // Returns []
 * getUserDepartments(null) // Returns []
 * ```
 */
export function getUserDepartments(
  user: User | { departments?: string[]; [key: string]: any } | null | undefined
): string[] {
  if (!user) {
    return [];
  }

  // Return departments array if present, otherwise return empty array
  // This matches the schema behavior where optional field defaults to empty array
  return user.departments ?? [];
}

/**
 * Get user's clinic IDs.
 * Returns an array of clinic IDs that the user belongs to.
 * Returns an empty array if clinics is undefined or null (as per schema: optional field defaults to empty array).
 * 
 * @param user - User object with clinics property
 * @returns Array of clinic IDs, or empty array if undefined/null
 * 
 * @example
 * ```typescript
 * getUserClinics({ clinics: ['clinic-1', 'clinic-2'] }) // Returns ['clinic-1', 'clinic-2']
 * getUserClinics({ clinics: [] }) // Returns []
 * getUserClinics({ clinics: undefined }) // Returns []
 * getUserClinics({}) // Returns []
 * getUserClinics(null) // Returns []
 * ```
 */
export function getUserClinics(
  user: User | { clinics?: string[] } | null | undefined
): string[] {
  if (!user) {
    return [];
  }

  // Return clinics array if present, otherwise return empty array
  // This matches the schema behavior where optional field defaults to empty array
  return user.clinics ?? [];
}

/**
 * Result of a permission check with detailed error information
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  error?: string;
  path?: string; // The path that was checked (e.g., "patients.features.list.enabled")
}

/**
 * Check if a user has a specific permission in the hierarchical permission tree.
 * 
 * Navigates the permission tree structure: section > feature > component > card > tab
 * Returns true only if all levels in the path are enabled.
 * 
 * Owners always have full access (returns true for any permission check).
 * 
 * @param permissions - The permission tree to check against
 * @param path - The permission path to check (e.g., "patients.features.create" or "patients.features.list.components.patientCard.tabs.overview")
 * @param user - Optional user object to check for owner override
 * @param options - Optional configuration
 * @param options.returnDetails - If true, returns detailed result object instead of boolean
 * @returns Boolean indicating if permission is granted, or PermissionCheckResult if returnDetails is true
 * 
 * @example
 * ```typescript
 * // Check if user can create patients
 * hasPermission(permissions, 'patients.features.create') // Returns boolean
 * 
 * // Check if user can view patient card overview tab
 * hasPermission(permissions, 'patients.features.list.components.patientCard.tabs.overview')
 * 
 * // Check with owner override
 * hasPermission(permissions, 'patients.features.create', { isOwner: true }) // Always returns true
 * 
 * // Get detailed result
 * const result = hasPermission(permissions, 'patients.features.create', undefined, { returnDetails: true })
 * // Returns { hasPermission: true/false, error?: string, path?: string }
 * ```
 */
export function hasPermission(
  permissions: PermissionTree | null | undefined,
  path: string,
  user?: User | { isOwner?: boolean } | null,
  options?: { returnDetails?: boolean }
): boolean | PermissionCheckResult {
  // Owner override: owners have full access
  if (user && isOwner(user)) {
    if (options?.returnDetails) {
      return {
        hasPermission: true,
        path
      };
    }
    return true;
  }

  // Helper to create error result
  const createErrorResult = (error: string, checkedPath: string): PermissionCheckResult | boolean => {
    if (options?.returnDetails) {
      return {
        hasPermission: false,
        error,
        path: checkedPath
      };
    }
    return false;
  };

  // Helper to create success result
  const createSuccessResult = (checkedPath: string): PermissionCheckResult | boolean => {
    if (options?.returnDetails) {
      return {
        hasPermission: true,
        path: checkedPath
      };
    }
    return true;
  };

  // If no permissions provided, deny access
  if (!permissions) {
    return createErrorResult('No permissions provided', path);
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
  let current: any = permissions;
  const checkedPath: string[] = [];

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
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
      const section = current[part];
      if (!section || typeof section !== 'object') {
        return createErrorResult(`Section "${part}" not found in permissions`, part);
      }

      if (section.enabled !== true) {
        return createErrorResult(`Section "${part}" is not enabled`, part);
      }

      // If only checking section access
      if (pathParts.length === 1) {
        return createSuccessResult(part);
      }

      current = section;
      continue;
    }

    // Handle "features" keyword
    if (part === 'features') {
      if (!current.features || typeof current.features !== 'object') {
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
      if (!current.components || typeof current.components !== 'object') {
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
      if (!current.tabs || typeof current.tabs !== 'object') {
        return createErrorResult(
          `Component "${checkedPath[checkedPath.length - 2]}" has no tabs`,
          checkedPath.join('.')
        );
      }
      current = current.tabs;
      continue;
    }

    // Check current level for the part
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
      if (options?.returnDetails) {
        return {
          hasPermission: value,
          path: checkedPath.join('.'),
          error: value ? undefined : `Permission "${part}" is disabled`
        };
      }
      return value;
    }

    // If value is an object, check if it has enabled property
    if (value && typeof value === 'object') {
      // Check enabled flag if it exists
      if ('enabled' in value && value.enabled !== true) {
        return createErrorResult(
          `Permission "${part}" is not enabled`,
          checkedPath.join('.')
        );
      }

      // If this is the last part, permission is granted (object exists and is enabled)
      if (i === pathParts.length - 1) {
        return createSuccessResult(checkedPath.join('.'));
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
  return createSuccessResult(checkedPath.join('.'));
}

/**
 * Result of a patient access check with detailed information
 */
export interface PatientAccessResult {
  canAccess: boolean;
  reason?: string; // Reason for access grant/denial
}

/**
 * Check if a user can access a patient based on view scope and department membership.
 * 
 * @deprecated This function uses the legacy viewScope-based access model.
 * For the new sharing-based model, use the Convex dataAccess.canAccessPatient query instead.
 * 
 * The new model:
 * - Data visibility is controlled by user sharing settings (private/care_team/company)
 * - Explicit shares grant specific access to individual patients
 * - Care team membership is determined by appointments, medical record members, and explicit assignments
 * - Access checking happens server-side via Convex queries
 * 
 * Migration note: This function is kept for backwards compatibility during the transition period.
 * Once all code paths use the Convex dataAccess service, this function will be removed.
 * 
 * This function implements the access control logic for patient data based on:
 * - Owner override (owners always have access)
 * - View scope (all_clinic, department, care_team, own_only)
 * - Department membership
 * - Care team assignments
 * 
 * @param user - User object to check access for
 * @param patient - Patient object or minimal patient info (id, department, tenantId)
 * @param viewScope - View scope from permissions (all_clinic, department, care_team, own_only)
 * @param options - Optional configuration
 * @param options.careTeamProviderIds - Array of provider IDs who have appointments with the patient (for care_team scope)
 * @param options.userProviderId - User's provider ID if they are a provider (for care_team and own_only scope)
 * @param options.patientUserId - Patient's user ID if patient is also a user (for own_only scope)
 * @param options.returnDetails - If true, returns detailed result object instead of boolean
 * @returns Boolean indicating if access is granted, or PatientAccessResult if returnDetails is true
 * 
 * @example
 * ```typescript
 * // NEW WAY: Use Convex dataAccess service (recommended)
 * const access = await convex.query(api.dataAccess.canAccessPatient, {
 *   userId,
 *   patientId,
 *   tenantId
 * });
 * if (access.hasAccess) {
 *   // User has access with permission: access.permission
 * }
 * 
 * // LEGACY WAY (deprecated):
 * // Check department-based access
 * canAccessPatient(user, patient, 'clinic') // Returns boolean
 * 
 * // Check care team access
 * canAccessPatient(user, patient, 'care_team', {
 *   careTeamProviderIds: ['provider-1', 'provider-2'],
 *   userProviderId: 'provider-1'
 * }) // Returns true if user's provider is in care team
 * ```
 */
export function canAccessPatient(
  user: User | { id: string; tenantId?: string; clinics?: string[]; isOwner?: boolean } | null | undefined,
  patient: { id: string; clinic?: string; tenantId: string; userId?: string; department?: string } | null | undefined,
  viewScope: ViewScope,
  options?: {
    careTeamProviderIds?: string[];
    userProviderId?: string;
    patientUserId?: string;
    returnDetails?: boolean;
  }
): boolean | PatientAccessResult {
  // Helper to create error result
  const createErrorResult = (reason: string): PatientAccessResult | boolean => {
    if (options?.returnDetails) {
      return {
        canAccess: false,
        reason
      };
    }
    return false;
  };

  // Helper to create success result
  const createSuccessResult = (reason?: string): PatientAccessResult | boolean => {
    if (options?.returnDetails) {
      return {
        canAccess: true,
        reason
      };
    }
    return true;
  };

  // Validate inputs
  if (!user) {
    return createErrorResult('User is required');
  }

  if (!patient) {
    return createErrorResult('Patient is required');
  }

  // Tenant isolation: users can only access patients in their own tenant
  // CRITICAL: This check MUST happen before owner override to enforce HIPAA multi-tenant isolation
  // Even owners cannot access patients from different tenants - this is a fundamental security requirement
  if (user.tenantId && patient.tenantId && user.tenantId !== patient.tenantId) {
    return createErrorResult('Patient belongs to different tenant');
  }

  // Owner override: owners always have full access within their own tenant
  if (isOwner(user)) {
    return createSuccessResult('User is clinic owner');
  }

  // Handle different view scopes
  switch (viewScope) {
    case 'all_clinic':
      // All clinic: user can access all patients in the clinic (same tenant)
      return createSuccessResult('View scope allows access to all clinic patients');

    case 'clinic':
      // Clinic: user can only access patients in their clinics
      const userClinics = getUserClinics(user);
      
      if (userClinics.length === 0) {
        return createErrorResult('User has no clinic assignments');
      }

      if (!patient.clinic) {
        return createErrorResult('Patient has no clinic assignment');
      }

      if (userClinics.includes(patient.clinic)) {
        return createSuccessResult(`Patient clinic (${patient.clinic}) matches user clinics`);
      }

      return createErrorResult(`Patient clinic (${patient.clinic}) does not match user clinics (${userClinics.join(', ')})`);

    case 'department':
      // Department: user can only access patients in their departments
      const userDepartments = getUserDepartments(user);
      
      if (userDepartments.length === 0) {
        return createErrorResult('User has no department assignments');
      }

      if (!patient.department) {
        return createErrorResult('Patient has no department assignment');
      }

      if (userDepartments.includes(patient.department)) {
        return createSuccessResult(`Patient department (${patient.department}) matches user departments`);
      }

      return createErrorResult(`Patient department (${patient.department}) does not match user departments (${userDepartments.join(', ')})`);

    case 'care_team':
      // Care team: user can only access patients where they are part of the care team
      // Care team is defined as providers who have appointments with the patient
      if (!options?.careTeamProviderIds || options.careTeamProviderIds.length === 0) {
        return createErrorResult('Patient has no care team members');
      }

      if (!options?.userProviderId) {
        return createErrorResult('User is not a provider or provider ID not provided');
      }

      if (options.careTeamProviderIds.includes(options.userProviderId)) {
        return createSuccessResult(`User provider (${options.userProviderId}) is in patient's care team`);
      }

      return createErrorResult(`User provider (${options.userProviderId}) is not in patient's care team`);

    case 'own_only':
      // Own only: user can only access their own patient record
      // This applies when:
      // 1. Patient is also a user (patient.userId matches user.id)
      // 2. User is the assigned provider for the patient (if applicable)
      
      // Check if patient is the user themselves
      if (options?.patientUserId && user.id === options.patientUserId) {
        return createSuccessResult('User is accessing their own patient record');
      }

      // Check if user is the assigned provider (if userProviderId is provided)
      // Note: This would require additional patient data (primaryProviderId) which isn't in the minimal interface
      // For now, we'll only check the patientUserId case
      
      return createErrorResult('User can only access their own patient record');

    default:
      // Unknown view scope
      return createErrorResult(`Unknown view scope: ${viewScope}`);
  }
}

/**
 * Parse callbackUrl and extract pathname if it's a valid URL.
 * Handles Vercel preview deployments and same-domain redirects.
 * 
 * @param callbackUrl - The callback URL to parse (can be relative or absolute)
 * @param currentHost - The current hostname for domain validation
 * @returns The parsed pathname with query string, or null if invalid
 * 
 * @example
 * ```typescript
 * parseCallbackUrl('/admin/dashboard', 'example.com') // Returns '/admin/dashboard'
 * parseCallbackUrl('https://preview.vercel.app/admin', 'preview-2.vercel.app') // Returns '/admin'
 * parseCallbackUrl('https://evil.com/admin', 'example.com') // Returns null (security)
 * ```
 */
export function parseCallbackUrl(
  callbackUrl: string | null,
  currentHost: string
): string | null {
  if (!callbackUrl) {
    return null;
  }

  try {
    // If it's already a relative path, return as-is
    if (callbackUrl.startsWith('/')) {
      return callbackUrl;
    }

    // If it's a full URL, extract the pathname
    if (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) {
      const callbackUrlObj = new URL(callbackUrl);
      const callbackHost = callbackUrlObj.hostname;

      // For Vercel preview deployments, always extract the pathname
      // Different preview deployments are expected and we should trust the pathname
      const isVercelPreview =
        callbackHost.endsWith('.vercel.app') || currentHost.endsWith('.vercel.app');

      // Allow same domain or matching subdomains
      // Include localhost/127.0.0.1 for local development
      const isLocalhost = callbackHost === 'localhost' || callbackHost === '127.0.0.1';
      const isSameDomain =
        callbackHost === currentHost ||
        (callbackHost.endsWith('.zenthea.ai') && currentHost.endsWith('.zenthea.ai')) ||
        (isLocalhost && (currentHost === 'localhost' || currentHost === '127.0.0.1'));

      // Always extract pathname for Vercel preview deployments or same domain
      if (isVercelPreview || isSameDomain) {
        return callbackUrlObj.pathname + callbackUrlObj.search;
      } else {
        // Different domain - reject for security
        return null;
      }
    }

    // Not a valid URL format
    return null;
  } catch (e) {
    // URL parsing failed - log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to parse callbackUrl:', callbackUrl, e);
    }
    return null;
  }
}
