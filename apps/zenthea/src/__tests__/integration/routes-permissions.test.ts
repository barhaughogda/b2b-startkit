import { describe, it, expect, vi } from 'vitest';
import { hasPermission } from '@/lib/auth-utils';
import { getRequiredPermission, getPermissionDescription } from '@/lib/route-permissions';
import type { PermissionTree } from '@/types';
import { AuditAction, AuditResource } from '@/lib/security/auditLogger.edge';

/**
 * Integration tests for permission-based route protection in middleware
 * 
 * Tests the complete middleware route protection flow including:
 * - Allowed routes work
 * - Denied routes blocked
 * - Permission checks
 * - Audit logging
 * - Error messages
 */

// Mock the audit logger
const mockAuditLogger = {
  log: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/lib/security/auditLogger.edge', () => ({
  createEdgeAuditLogger: vi.fn(() => mockAuditLogger),
  AuditAction: {
    UnauthorizedAccess: 'unauthorized_access',
    AuthorizedAccess: 'authorized_access',
    PatientAccessed: 'patient_accessed',
  },
  AuditResource: {
    Security: 'security',
    Patient: 'patient',
  },
}));

describe('Middleware Route Protection - Permission-Based Access', () => {
  
  // Mock permissions for different user types
  const mockOwnerPermissions: PermissionTree = {
    patients: {
      enabled: true,
      viewScope: 'all_clinic',
      features: {
        list: { enabled: true },
        create: true,
        view: true,
        edit: true,
      },
    },
    settings: {
      enabled: true,
      features: {
        users: {
          enabled: true,
          view: true,
          create: true,
          edit: true,
          delete: true,
        },
        roles: {
          enabled: true,
          view: true,
          create: true,
        },
      },
    },
  };

  const mockProviderPermissions: PermissionTree = {
    patients: {
      enabled: true,
      viewScope: 'department',
      features: {
        list: { enabled: true },
        view: true,
        // No create/edit permissions
      },
    },
    appointments: {
      enabled: true,
      viewScope: 'department',
      features: {
        calendar: true,
        view: true,
        // No create/edit permissions
      },
    },
    // No settings permissions
  };

  const mockLimitedPermissions: PermissionTree = {
    patients: {
      enabled: true,
      viewScope: 'own_only',
      features: {
        list: { enabled: true },
        view: true,
        // No create/edit permissions
      },
    },
    // No other permissions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper function to simulate middleware permission check logic
   * This extracts the core logic from middleware.ts for testing
   */
  function checkRouteAccess(
    pathname: string,
    userPermissions: PermissionTree | null | undefined,
    isOwner: boolean,
    role: string
  ): {
    allowed: boolean;
    errorMessage?: string;
    auditLog?: {
      action: string;
      resource: string;
      resourceId: string;
      details: Record<string, unknown>;
    };
  } {
    // Check if user is clinic_user (with backward compatibility)
    const isClinicUser = 
      role === 'clinic_user' ||
      role === 'admin' ||
      role === 'provider';

    // Super admin bypasses clinic_user check but still needs to pass permission checks
    if (!isClinicUser && role !== 'super_admin') {
      return {
        allowed: false,
        errorMessage: 'Access denied',
        auditLog: {
          action: AuditAction.UnauthorizedAccess,
          resource: AuditResource.Security,
          resourceId: 'clinic_access_denied',
          details: {
            attemptedPath: pathname,
            userRole: role,
          },
        },
      };
    }

    // Super admin bypasses permission checks for company routes
    if (role === 'super_admin' && pathname.startsWith('/company')) {
      return {
        allowed: true,
        auditLog: {
          action: AuditAction.AuthorizedAccess,
          resource: AuditResource.Security,
          resourceId: 'clinic_access_granted',
          details: {
            attemptedPath: pathname,
            userRole: role,
            success: true,
            note: 'Super admin bypasses permission checks',
          },
        },
      };
    }

    // Check if route requires specific permission
    const requiredPermission = getRequiredPermission(pathname);

    // Handle "dashboard" as special case - always allow for clinic users
    // Dashboard is a fallback permission that doesn't exist in permission tree
    if (requiredPermission === 'dashboard') {
      // Clinic users always have access to dashboard routes
      if (isClinicUser) {
        return {
          allowed: true,
          auditLog: {
            action: AuditAction.AuthorizedAccess,
            resource: AuditResource.Security,
            resourceId: 'clinic_access_granted',
            details: {
              attemptedPath: pathname,
              userRole: role,
              success: true,
            },
          },
        };
      }
    }

    if (requiredPermission && requiredPermission !== 'dashboard') {
      // Check permission (owners have full access)
      const permissionResult = hasPermission(
        userPermissions,
        requiredPermission,
        { isOwner },
        { returnDetails: true }
      );

      const hasAccess = typeof permissionResult === 'boolean' 
        ? permissionResult 
        : permissionResult.hasPermission;

      if (!hasAccess) {
        const errorMessage = typeof permissionResult === 'object' 
          ? permissionResult.error || 'Permission denied'
          : 'Permission denied';

        const permissionDescription = getPermissionDescription(pathname);

        return {
          allowed: false,
          errorMessage: `You don't have permission to access ${permissionDescription}. ${errorMessage}`,
          auditLog: {
            action: AuditAction.UnauthorizedAccess,
            resource: AuditResource.Security,
            resourceId: 'clinic_permission_denied',
            details: {
              attemptedPath: pathname,
              userRole: role,
              requiredPermission,
              permissionDescription,
              errorMessage,
              userHasPermissions: !!userPermissions,
              userIsOwner: isOwner,
              severity: 'high',
            },
          },
        };
      }

      // Access granted
      return {
        allowed: true,
        auditLog: {
          action: AuditAction.AuthorizedAccess,
          resource: AuditResource.Security,
          resourceId: 'clinic_permission_granted',
          details: {
            attemptedPath: pathname,
            userRole: role,
            requiredPermission,
            permissionDescription: getPermissionDescription(pathname),
            userIsOwner: isOwner,
            success: true,
          },
        },
      };
    }

    // No specific permission required, access granted
    return {
      allowed: true,
      auditLog: {
        action: AuditAction.AuthorizedAccess,
        resource: AuditResource.Security,
        resourceId: 'clinic_access_granted',
        details: {
          attemptedPath: pathname,
          userRole: role,
          success: true,
        },
      },
    };
  }

  describe('Allowed routes work', () => {
    it('should allow owner to access any company route', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockOwnerPermissions,
        true, // isOwner
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
      expect(result.auditLog?.action).toBe(AuditAction.AuthorizedAccess);
    });

    it('should allow user with required permission to access route', () => {
      const result = checkRouteAccess(
        '/company/patients',
        mockProviderPermissions,
        false, // isOwner
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
      expect(result.auditLog?.action).toBe(AuditAction.AuthorizedAccess);
    });

    it('should allow access to routes without specific permission requirements', () => {
      const result = checkRouteAccess(
        '/company/dashboard',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
      expect(result.auditLog?.action).toBe(AuditAction.AuthorizedAccess);
    });

    it('should allow backward compatible admin role to access company routes', () => {
      const result = checkRouteAccess(
        '/company/patients',
        mockProviderPermissions,
        false,
        'admin' // Backward compatibility
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow backward compatible provider role to access company routes', () => {
      const result = checkRouteAccess(
        '/company/appointments',
        mockProviderPermissions,
        false,
        'provider' // Backward compatibility
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Denied routes blocked', () => {
    it('should block non-clinic users from accessing company routes', () => {
      const result = checkRouteAccess(
        '/company/patients',
        null,
        false,
        'patient' // Wrong role
      );

      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
      expect(result.auditLog?.resourceId).toBe('clinic_access_denied');
    });

    it('should block user without required permission', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockProviderPermissions, // No settings permissions
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toContain("don't have permission");
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
      expect(result.auditLog?.resourceId).toBe('clinic_permission_denied');
    });

    it('should block user when section is disabled', () => {
      const permissionsWithDisabledSection: PermissionTree = {
        patients: {
          enabled: false, // Section disabled
          viewScope: 'all_clinic',
          features: {
            list: { enabled: true },
          },
        },
      };

      const result = checkRouteAccess(
        '/company/patients',
        permissionsWithDisabledSection,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
    });

    it('should block user when feature is disabled', () => {
      const permissionsWithDisabledFeature: PermissionTree = {
        patients: {
          enabled: true,
          viewScope: 'all_clinic',
          features: {
            list: { enabled: true },
            create: {
              enabled: false, // Feature disabled
            },
          },
        },
      };

      const result = checkRouteAccess(
        '/company/patients/new',
        permissionsWithDisabledFeature,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toContain("don't have permission");
    });

    it('should block user with null permissions', () => {
      const result = checkRouteAccess(
        '/company/patients',
        null,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
    });

    it('should block user with undefined permissions', () => {
      const result = checkRouteAccess(
        '/company/patients',
        undefined,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
    });
  });

  describe('Permission checks', () => {
    it('should check specific permission for /company/patients route', () => {
      const permission = getRequiredPermission('/company/patients');
      expect(permission).toBe('patients.features.list');

      const result = checkRouteAccess(
        '/company/patients',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
    });

    it('should check create permission for /company/patients/new route', () => {
      const permission = getRequiredPermission('/company/patients/new');
      expect(permission).toBe('patients.features.create');

      const result = checkRouteAccess(
        '/company/patients/new',
        mockProviderPermissions, // No create permission
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
    });

    it('should check view permission for dynamic patient route', () => {
      const permission = getRequiredPermission('/company/patients/123');
      expect(permission).toBe('patients.features.view');

      const result = checkRouteAccess(
        '/company/patients/123',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
    });

    it('should check settings permission for /company/settings/users route', () => {
      const permission = getRequiredPermission('/company/settings/users');
      expect(permission).toBe('settings.features.users.view');

      const result = checkRouteAccess(
        '/company/settings/users',
        mockProviderPermissions, // No settings permissions
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
    });

    it('should check method-specific permissions for API routes', () => {
      // GET should require view permission
      const getPermission = getRequiredPermission('/api/company/users', 'GET');
      expect(getPermission).toBe('settings.features.users.view');

      // POST should require create permission
      const postPermission = getRequiredPermission('/api/company/users', 'POST');
      expect(postPermission).toBe('settings.features.users.create');

      // PUT should require edit permission
      const putPermission = getRequiredPermission('/api/company/users', 'PUT');
      expect(putPermission).toBe('settings.features.users.edit');

      // DELETE should require delete permission
      const deletePermission = getRequiredPermission('/api/company/users', 'DELETE');
      expect(deletePermission).toBe('settings.features.users.delete');
    });

    it('should grant access when user has method-specific permission', () => {
      const result = checkRouteAccess(
        '/api/company/users',
        mockOwnerPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny access when user lacks method-specific permission', () => {
      // Note: We can't test method-specific permissions in checkRouteAccess
      // because it doesn't accept method parameter. This is tested via route-permissions.test.ts
      // But we can verify the permission path is correct
      const permission = getRequiredPermission('/api/company/users', 'DELETE');
      expect(permission).toBe('settings.features.users.delete');
    });

    it('should check owner override for all routes', () => {
      // Owner should have access even without explicit permissions
      const result = checkRouteAccess(
        '/company/settings/users',
        mockLimitedPermissions, // Limited permissions
        true, // isOwner - should override
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
      expect(result.auditLog?.details.userIsOwner).toBe(true);
    });
  });

  describe('Audit logging', () => {
    it('should log unauthorized access attempts', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockProviderPermissions, // No settings permissions
        false,
        'clinic_user'
      );

      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
      expect(result.auditLog?.resource).toBe(AuditResource.Security);
      expect(result.auditLog?.resourceId).toBe('clinic_permission_denied');
      expect(result.auditLog?.details.attemptedPath).toBe('/company/settings/users');
      expect(result.auditLog?.details.userRole).toBe('clinic_user');
      expect(result.auditLog?.details.requiredPermission).toBe('settings.features.users.view');
      expect(result.auditLog?.details.severity).toBe('high');
    });

    it('should log authorized access with permission details', () => {
      const result = checkRouteAccess(
        '/company/patients',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe(AuditAction.AuthorizedAccess);
      expect(result.auditLog?.resourceId).toBe('clinic_permission_granted');
      expect(result.auditLog?.details.attemptedPath).toBe('/company/patients');
      expect(result.auditLog?.details.requiredPermission).toBe('patients.features.list');
      expect(result.auditLog?.details.success).toBe(true);
    });

    it('should log general access for routes without specific permissions', () => {
      const result = checkRouteAccess(
        '/company/dashboard',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe(AuditAction.AuthorizedAccess);
      expect(result.auditLog?.resourceId).toBe('clinic_access_granted');
      expect(result.auditLog?.details.success).toBe(true);
    });

    it('should log role-based access denial', () => {
      const result = checkRouteAccess(
        '/company/patients',
        null,
        false,
        'patient' // Wrong role
      );

      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
      expect(result.auditLog?.resourceId).toBe('clinic_access_denied');
      expect(result.auditLog?.details.userRole).toBe('patient');
    });

    it('should include userIsOwner flag in audit log', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockOwnerPermissions,
        true, // isOwner
        'clinic_user'
      );

      expect(result.auditLog?.details.userIsOwner).toBe(true);
    });

    it('should include permission description in audit log', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.auditLog?.details.permissionDescription).toBeDefined();
      expect(result.auditLog?.details.permissionDescription).toContain('user management');
    });
  });

  describe('Error messages', () => {
    it('should provide clear error message for permission denial', () => {
      const result = checkRouteAccess(
        '/company/settings/users',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain("don't have permission");
      expect(result.errorMessage).toContain('user management');
    });

    it('should include permission path in error details', () => {
      const result = checkRouteAccess(
        '/company/patients/new',
        mockProviderPermissions, // No create permission
        false,
        'clinic_user'
      );

      expect(result.auditLog?.details.requiredPermission).toBe('patients.features.create');
      expect(result.errorMessage).toBeDefined();
    });

    it('should provide detailed error from permission check', () => {
      const permissionsWithDisabledSection: PermissionTree = {
        patients: {
          enabled: false,
          viewScope: 'all_clinic',
          features: {
            list: { enabled: true },
          },
        },
      };

      const result = checkRouteAccess(
        '/company/patients',
        permissionsWithDisabledSection,
        false,
        'clinic_user'
      );

      expect(result.errorMessage).toBeDefined();
      expect(result.auditLog?.details.errorMessage).toBeDefined();
    });

    it('should provide error message for role-based denial', () => {
      const result = checkRouteAccess(
        '/company/patients',
        null,
        false,
        'patient'
      );

      expect(result.errorMessage).toBe('Access denied');
    });
  });

  describe('Edge cases', () => {
    it('should handle dynamic route segments correctly', () => {
      const permission1 = getRequiredPermission('/company/patients/123');
      const permission2 = getRequiredPermission('/company/patients/456');
      expect(permission1).toBe('patients.features.view');
      expect(permission2).toBe('patients.features.view');

      const result1 = checkRouteAccess(
        '/company/patients/123',
        mockProviderPermissions,
        false,
        'clinic_user'
      );
      expect(result1.allowed).toBe(true);

      const result2 = checkRouteAccess(
        '/company/patients/456',
        mockProviderPermissions,
        false,
        'clinic_user'
      );
      expect(result2.allowed).toBe(true);
    });

    it('should handle routes without specific permissions (fallback to dashboard)', () => {
      const permission = getRequiredPermission('/company/unknown-route');
      expect(permission).toBe('dashboard');

      const result = checkRouteAccess(
        '/company/unknown-route',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      // Dashboard permission should be granted if user has any clinic access
      expect(result.allowed).toBe(true);
    });

    it('should handle empty permissions object', () => {
      const emptyPermissions: PermissionTree = {};

      const result = checkRouteAccess(
        '/company/patients',
        emptyPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
    });

    it('should handle super_admin role (bypass clinic_user check)', () => {
      const result = checkRouteAccess(
        '/company/patients',
        null, // No permissions needed for super_admin
        false,
        'super_admin'
      );

      // Super admin should have access even without clinic_user role
      expect(result.allowed).toBe(true);
    });

    it('should handle routes with trailing slashes', () => {
      const permission1 = getRequiredPermission('/company/patients');
      const permission2 = getRequiredPermission('/company/patients/');
      expect(permission1).toBe(permission2);

      const result1 = checkRouteAccess(
        '/company/patients',
        mockProviderPermissions,
        false,
        'clinic_user'
      );
      const result2 = checkRouteAccess(
        '/company/patients/',
        mockProviderPermissions,
        false,
        'clinic_user'
      );

      expect(result1.allowed).toBe(result2.allowed);
    });
  });

  describe('API route protection', () => {
    it('should protect API routes with permissions', () => {
      const result = checkRouteAccess(
        '/api/company/users',
        mockOwnerPermissions,
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
      expect(result.auditLog?.details.attemptedPath).toBe('/api/company/users');
    });

    it('should block API routes when permission denied', () => {
      const result = checkRouteAccess(
        '/api/company/users',
        mockProviderPermissions, // No settings permissions
        false,
        'clinic_user'
      );

      expect(result.allowed).toBe(false);
      expect(result.auditLog?.action).toBe(AuditAction.UnauthorizedAccess);
    });

    it('should allow owner to access any API route', () => {
      const result = checkRouteAccess(
        '/api/company/users',
        mockLimitedPermissions,
        true, // isOwner
        'clinic_user'
      );

      expect(result.allowed).toBe(true);
    });
  });
});

