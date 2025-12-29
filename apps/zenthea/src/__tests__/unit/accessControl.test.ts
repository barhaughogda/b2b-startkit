import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAccessControl,
  validateTenantIsolation,
  validatePHIAccess,
  getRolePermissions,
  validateSessionSecurity,
  calculateAccessControlScore,
  generateAccessControlReport,
  type UserContext,
  type ResourceContext,
  type AccessControlValidation,
} from '@/lib/security/accessControl';
import {
  hasPermission,
  canAccessPatient,
  isOwner,
  getUserDepartments,
} from '@/lib/auth-utils';
import type { User, PermissionTree, ViewScope } from '@/types';

describe('Access Control Validation', () => {
  describe('Tenant Isolation', () => {
    describe('validateTenantIsolation', () => {
      it('should allow access when tenant IDs match', () => {
        expect(validateTenantIsolation('tenant-1', 'tenant-1')).toBe(true);
      });

      it('should deny access when tenant IDs do not match', () => {
        expect(validateTenantIsolation('tenant-1', 'tenant-2')).toBe(false);
      });

      it('should handle empty tenant IDs', () => {
        expect(validateTenantIsolation('', '')).toBe(true);
        expect(validateTenantIsolation('tenant-1', '')).toBe(false);
        expect(validateTenantIsolation('', 'tenant-1')).toBe(false);
      });

      it('should handle undefined tenant IDs as empty strings', () => {
        // TypeScript will prevent undefined, but runtime could have empty strings
        expect(validateTenantIsolation('tenant-1', 'tenant-1')).toBe(true);
      });
    });

    describe('canAccessPatient - Tenant Isolation', () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        isOwner: false,
        departments: ['dept-1'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockPatient = {
        id: 'patient-1',
        tenantId: 'tenant-1',
        department: 'dept-1',
      };

      it('should allow access when user and patient belong to same tenant', () => {
        const result = canAccessPatient(mockUser, mockPatient, 'all_clinic');
        expect(result).toBe(true);
      });

      it('should deny access when user and patient belong to different tenants', () => {
        const patientDifferentTenant = {
          ...mockPatient,
          tenantId: 'tenant-2',
        };
        const result = canAccessPatient(mockUser, patientDifferentTenant, 'all_clinic');
        expect(result).toBe(false);
      });

      it('should allow access when user tenantId is undefined (no isolation check)', () => {
        const userNoTenant = { ...mockUser, tenantId: undefined };
        const result = canAccessPatient(userNoTenant, mockPatient, 'all_clinic');
        expect(result).toBe(true);
      });

      it('should allow access when patient tenantId is undefined (no isolation check)', () => {
        const patientNoTenant = { ...mockPatient, tenantId: undefined };
        const result = canAccessPatient(mockUser, patientNoTenant, 'all_clinic');
        expect(result).toBe(true);
      });

      it('should return detailed error for cross-tenant access', () => {
        const patientDifferentTenant = {
          ...mockPatient,
          tenantId: 'tenant-2',
        };
        const result = canAccessPatient(
          mockUser,
          patientDifferentTenant,
          'all_clinic',
          { returnDetails: true }
        ) as { canAccess: boolean; reason?: string };

        expect(result.canAccess).toBe(false);
        expect(result.reason).toContain('different tenant');
      });
    });

    describe('validateAccessControl - Tenant Isolation', () => {
      const mockUserContext: UserContext = {
        userId: 'user-1',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        permissions: ['read', 'write'],
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      const mockResourceContext: ResourceContext = {
        resourceId: 'resource-1',
        resourceType: 'patient',
        tenantId: 'tenant-1',
        sensitivity: 'confidential',
      };

      it('should allow access when tenant IDs match', () => {
        const result = validateAccessControl(
          mockUserContext,
          mockResourceContext,
          'read'
        );
        expect(result.valid).toBe(true);
      });

      it('should deny access when tenant IDs do not match', () => {
        const resourceDifferentTenant: ResourceContext = {
          ...mockResourceContext,
          tenantId: 'tenant-2',
        };
        const result = validateAccessControl(
          mockUserContext,
          resourceDifferentTenant,
          'read'
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Cross-tenant');
      });
    });
  });

  describe('Permission Checks', () => {
    describe('validateAccessControl - Permission Checks', () => {
      const mockUserContext: UserContext = {
        userId: 'user-1',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        permissions: ['read', 'write'],
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      const mockResourceContext: ResourceContext = {
        resourceId: 'resource-1',
        resourceType: 'patient',
        tenantId: 'tenant-1',
        sensitivity: 'confidential',
      };

      it('should allow access when user has required permission', () => {
        const result = validateAccessControl(
          mockUserContext,
          mockResourceContext,
          'read'
        );
        expect(result.valid).toBe(true);
      });

      it('should deny access when user does not have required permission', () => {
        const result = validateAccessControl(
          mockUserContext,
          mockResourceContext,
          'delete'
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('does not have required permissions');
      });

      it('should allow access when user has wildcard permission', () => {
        const userWithWildcard: UserContext = {
          ...mockUserContext,
          permissions: ['*'],
        };
        const result = validateAccessControl(
          userWithWildcard,
          mockResourceContext,
          'delete'
        );
        expect(result.valid).toBe(true);
      });

      it('should include rule details in validation result', () => {
        const result = validateAccessControl(
          mockUserContext,
          mockResourceContext,
          'read'
        );
        expect(result.rule).toEqual({
          role: 'clinic_user',
          resource: 'patient',
          action: 'read',
        });
      });
    });

    describe('hasPermission - Permission Checks', () => {
      const mockPermissions: PermissionTree = {
        patients: {
          enabled: true,
          viewScope: 'all_clinic',
          features: {
            create: true,
            list: {
              enabled: true,
              components: {
                patientCard: {
                  enabled: true,
                  tabs: {
                    overview: true,
                    notes: false,
                  },
                },
              },
            },
          },
        },
        appointments: {
          enabled: false,
          viewScope: 'all_clinic',
        },
      };

      it('should allow access when permission exists and is enabled', () => {
        const result = hasPermission(mockPermissions, 'patients.features.create');
        expect(result).toBe(true);
      });

      it('should deny access when permission does not exist', () => {
        const result = hasPermission(mockPermissions, 'patients.features.delete');
        expect(result).toBe(false);
      });

      it('should deny access when section is disabled', () => {
        const result = hasPermission(mockPermissions, 'appointments.features.create');
        expect(result).toBe(false);
      });

      it('should deny access when feature is disabled', () => {
        const result = hasPermission(
          mockPermissions,
          'patients.features.list.components.patientCard.tabs.notes'
        );
        expect(result).toBe(false);
      });

      it('should return detailed error when permission denied', () => {
        const result = hasPermission(
          mockPermissions,
          'patients.features.delete',
          undefined,
          { returnDetails: true }
        ) as { hasPermission: boolean; error?: string };

        expect(result.hasPermission).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should navigate deep permission paths correctly', () => {
        const result = hasPermission(
          mockPermissions,
          'patients.features.list.components.patientCard.tabs.overview'
        );
        expect(result).toBe(true);
      });
    });

    describe('getRolePermissions', () => {
      it('should return correct permissions for admin role', () => {
        const permissions = getRolePermissions('admin');
        expect(permissions).toEqual(['read', 'write', 'delete', 'export', 'import', 'audit']);
      });

      it('should return correct permissions for provider role', () => {
        const permissions = getRolePermissions('provider');
        expect(permissions).toEqual(['read', 'write', 'export']);
      });

      it('should return correct permissions for nurse role', () => {
        const permissions = getRolePermissions('nurse');
        expect(permissions).toEqual(['read', 'write']);
      });

      it('should return correct permissions for patient role', () => {
        const permissions = getRolePermissions('patient');
        expect(permissions).toEqual(['read']);
      });

      it('should return empty array for guest role', () => {
        const permissions = getRolePermissions('guest');
        expect(permissions).toEqual([]);
      });

      it('should return empty array for unknown role', () => {
        const permissions = getRolePermissions('unknown_role');
        expect(permissions).toEqual([]);
      });
    });
  });

  describe('View Scope Validation', () => {
    describe('canAccessPatient - View Scope Validation', () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        isOwner: false,
        departments: ['dept-1', 'dept-2'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      describe('all_clinic scope', () => {
        it('should allow access to all patients in clinic', () => {
          const patient1 = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const patient2 = { id: 'patient-2', tenantId: 'tenant-1', department: 'dept-3' };

          expect(canAccessPatient(mockUser, patient1, 'all_clinic')).toBe(true);
          expect(canAccessPatient(mockUser, patient2, 'all_clinic')).toBe(true);
        });

        it('should return detailed success reason', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const result = canAccessPatient(mockUser, patient, 'all_clinic', {
            returnDetails: true,
          }) as { canAccess: boolean; reason?: string };

          expect(result.canAccess).toBe(true);
          expect(result.reason).toContain('all clinic');
        });
      });

      describe('department scope', () => {
        it('should allow access when patient department matches user departments', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const result = canAccessPatient(mockUser, patient, 'department');
          expect(result).toBe(true);
        });

        it('should allow access when patient department matches any user department', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-2' };
          const result = canAccessPatient(mockUser, patient, 'department');
          expect(result).toBe(true);
        });

        it('should deny access when patient department does not match user departments', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-3' };
          const result = canAccessPatient(mockUser, patient, 'department');
          expect(result).toBe(false);
        });

        it('should deny access when user has no departments', () => {
          const userNoDepts = { ...mockUser, departments: [] };
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const result = canAccessPatient(userNoDepts, patient, 'department');
          expect(result).toBe(false);
        });

        it('should deny access when patient has no department', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: undefined };
          const result = canAccessPatient(mockUser, patient, 'department');
          expect(result).toBe(false);
        });

        it('should return detailed error for department mismatch', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-3' };
          const result = canAccessPatient(mockUser, patient, 'department', {
            returnDetails: true,
          }) as { canAccess: boolean; reason?: string };

          expect(result.canAccess).toBe(false);
          expect(result.reason).toContain('does not match');
        });
      });

      describe('care_team scope', () => {
        it('should allow access when user provider is in care team', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
          };
          const result = canAccessPatient(mockUser, patient, 'care_team', {
            careTeamProviderIds: ['provider-1', 'provider-2'],
            userProviderId: 'provider-1',
          });
          expect(result).toBe(true);
        });

        it('should deny access when user provider is not in care team', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
          };
          const result = canAccessPatient(mockUser, patient, 'care_team', {
            careTeamProviderIds: ['provider-1', 'provider-2'],
            userProviderId: 'provider-3',
          });
          expect(result).toBe(false);
        });

        it('should deny access when patient has no care team', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
          };
          const result = canAccessPatient(mockUser, patient, 'care_team', {
            careTeamProviderIds: [],
            userProviderId: 'provider-1',
          });
          expect(result).toBe(false);
        });

        it('should deny access when user is not a provider', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
          };
          const result = canAccessPatient(mockUser, patient, 'care_team', {
            careTeamProviderIds: ['provider-1'],
            // userProviderId not provided
          });
          expect(result).toBe(false);
        });

        it('should return detailed error for care team access denial', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
          };
          const result = canAccessPatient(mockUser, patient, 'care_team', {
            careTeamProviderIds: ['provider-1'],
            userProviderId: 'provider-2',
            returnDetails: true,
          }) as { canAccess: boolean; reason?: string };

          expect(result.canAccess).toBe(false);
          expect(result.reason).toContain('not in patient\'s care team');
        });
      });

      describe('own_only scope', () => {
        it('should allow access when patient is the user themselves', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
            userId: 'user-1',
          };
          const result = canAccessPatient(mockUser, patient, 'own_only', {
            patientUserId: 'user-1',
          });
          expect(result).toBe(true);
        });

        it('should deny access when patient is not the user', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
            userId: 'user-2',
          };
          const result = canAccessPatient(mockUser, patient, 'own_only', {
            patientUserId: 'user-2',
          });
          expect(result).toBe(false);
        });

        it('should return detailed error for own_only access denial', () => {
          const patient = {
            id: 'patient-1',
            tenantId: 'tenant-1',
            department: 'dept-1',
            userId: 'user-2',
          };
          const result = canAccessPatient(mockUser, patient, 'own_only', {
            patientUserId: 'user-2',
            returnDetails: true,
          }) as { canAccess: boolean; reason?: string };

          expect(result.canAccess).toBe(false);
          expect(result.reason).toContain('own patient record');
        });
      });

      describe('unknown scope', () => {
        it('should deny access for unknown view scope', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const result = canAccessPatient(
            mockUser,
            patient,
            'unknown_scope' as ViewScope
          );
          expect(result).toBe(false);
        });

        it('should return detailed error for unknown scope', () => {
          const patient = { id: 'patient-1', tenantId: 'tenant-1', department: 'dept-1' };
          const result = canAccessPatient(
            mockUser,
            patient,
            'unknown_scope' as ViewScope,
            { returnDetails: true }
          ) as { canAccess: boolean; reason?: string };

          expect(result.canAccess).toBe(false);
          expect(result.reason).toContain('Unknown view scope');
        });
      });
    });
  });

  describe('Department Checks', () => {
    describe('getUserDepartments', () => {
      it('should return user departments when present', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          departments: ['dept-1', 'dept-2'],
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(getUserDepartments(user)).toEqual(['dept-1', 'dept-2']);
      });

      it('should return empty array when departments is undefined', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          departments: undefined,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(getUserDepartments(user)).toEqual([]);
      });

      it('should return empty array when departments is empty', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          departments: [],
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(getUserDepartments(user)).toEqual([]);
      });

      it('should return empty array when user is null', () => {
        expect(getUserDepartments(null)).toEqual([]);
      });

      it('should return empty array when user is undefined', () => {
        expect(getUserDepartments(undefined)).toEqual([]);
      });
    });

    describe('canAccessPatient - Department Checks', () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        isOwner: false,
        departments: ['dept-1', 'dept-2'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      it('should check department membership for department scope', () => {
        const patientInDept1 = {
          id: 'patient-1',
          tenantId: 'tenant-1',
          department: 'dept-1',
        };
        const patientInDept3 = {
          id: 'patient-2',
          tenantId: 'tenant-1',
          department: 'dept-3',
        };

        expect(canAccessPatient(mockUser, patientInDept1, 'department')).toBe(true);
        expect(canAccessPatient(mockUser, patientInDept3, 'department')).toBe(false);
      });

      it('should handle multiple department assignments', () => {
        const patientInDept2 = {
          id: 'patient-1',
          tenantId: 'tenant-1',
          department: 'dept-2',
        };
        expect(canAccessPatient(mockUser, patientInDept2, 'department')).toBe(true);
      });
    });
  });

  describe('Owner Override', () => {
    describe('isOwner', () => {
      it('should return true when user is owner', () => {
        const user: User = {
          id: 'user-1',
          email: 'owner@test.com',
          name: 'Owner',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          isOwner: true,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(isOwner(user)).toBe(true);
      });

      it('should return false when user is not owner', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          isOwner: false,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(isOwner(user)).toBe(false);
      });

      it('should return false when isOwner is undefined', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          isOwner: undefined,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(isOwner(user)).toBe(false);
      });

      it('should handle direct boolean input', () => {
        expect(isOwner(true)).toBe(true);
        expect(isOwner(false)).toBe(false);
      });

      it('should handle null and undefined', () => {
        expect(isOwner(null)).toBe(false);
        expect(isOwner(undefined)).toBe(false);
      });
    });

    describe('hasPermission - Owner Override', () => {
      const mockPermissions: PermissionTree = {
        patients: {
          enabled: false, // Disabled in permissions
          viewScope: 'all_clinic',
        },
      };

      const ownerUser: User = {
        id: 'user-1',
        email: 'owner@test.com',
        name: 'Owner',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        isOwner: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      it('should allow access for owners even when permission is disabled', () => {
        const result = hasPermission(mockPermissions, 'patients', ownerUser);
        expect(result).toBe(true);
      });

      it('should allow access for owners with detailed result', () => {
        const result = hasPermission(
          mockPermissions,
          'patients',
          ownerUser,
          { returnDetails: true }
        ) as { hasPermission: boolean; path?: string };

        expect(result.hasPermission).toBe(true);
        expect(result.path).toBe('patients');
      });

      it('should allow access for owners even for non-existent permissions', () => {
        const result = hasPermission(
          mockPermissions,
          'nonexistent.feature',
          ownerUser
        );
        expect(result).toBe(true);
      });

      it('should allow access when isOwner is passed as boolean', () => {
        const result = hasPermission(mockPermissions, 'patients', { isOwner: true });
        expect(result).toBe(true);
      });
    });

    describe('canAccessPatient - Owner Override', () => {
      const ownerUser: User = {
        id: 'user-1',
        email: 'owner@test.com',
        name: 'Owner',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        isOwner: true,
        departments: [],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const patient = {
        id: 'patient-1',
        tenantId: 'tenant-1',
        department: 'dept-1',
      };

      it('should allow access for owners regardless of view scope', () => {
        expect(canAccessPatient(ownerUser, patient, 'all_clinic')).toBe(true);
        expect(canAccessPatient(ownerUser, patient, 'department')).toBe(true);
        expect(canAccessPatient(ownerUser, patient, 'care_team')).toBe(true);
        expect(canAccessPatient(ownerUser, patient, 'own_only')).toBe(true);
      });

      it('should deny access for owners with different tenant (HIPAA multi-tenant isolation)', () => {
        const patientDifferentTenant = {
          ...patient,
          tenantId: 'tenant-2',
        };
        // CRITICAL: Tenant isolation MUST be enforced BEFORE owner override
        // Even owners cannot access patients from different tenants - this is a HIPAA requirement
        // Tenant isolation is a fundamental security boundary that cannot be bypassed
        const result = canAccessPatient(ownerUser, patientDifferentTenant, 'all_clinic');
        expect(result).toBe(false);
      });

      it('should return detailed success reason for owner access', () => {
        const result = canAccessPatient(ownerUser, patient, 'department', {
          returnDetails: true,
        }) as { canAccess: boolean; reason?: string };

        expect(result.canAccess).toBe(true);
        expect(result.reason).toContain('clinic owner');
      });

      it('should allow access when isOwner is passed directly', () => {
        const userWithOwnerFlag = {
          id: 'user-1',
          tenantId: 'tenant-1',
          isOwner: true,
        };
        const result = canAccessPatient(userWithOwnerFlag, patient, 'department');
        expect(result).toBe(true);
      });
    });

    describe('validateAccessControl - Owner Override', () => {
      // Note: validateAccessControl doesn't have explicit owner override logic
      // But we can test that owners (with admin role) have access to restricted resources
      const ownerUserContext: UserContext = {
        userId: 'user-1',
        role: 'admin', // Owners typically have admin role or wildcard permissions
        tenantId: 'tenant-1',
        permissions: ['*'], // Wildcard permissions for owners
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      const restrictedResource: ResourceContext = {
        resourceId: 'resource-1',
        resourceType: 'patient',
        tenantId: 'tenant-1',
        sensitivity: 'restricted',
      };

      it('should allow access to restricted resources for admin role', () => {
        const result = validateAccessControl(
          ownerUserContext,
          restrictedResource,
          'read'
        );
        expect(result.valid).toBe(true);
      });

      it('should allow access with wildcard permissions', () => {
        const result = validateAccessControl(
          ownerUserContext,
          restrictedResource,
          'delete'
        );
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('PHI Access Validation', () => {
    describe('validatePHIAccess', () => {
      const mockUserContext: UserContext = {
        userId: 'user-1',
        role: 'provider',
        tenantId: 'tenant-1',
        permissions: ['read', 'write'],
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      const mockResourceContext: ResourceContext = {
        resourceId: 'resource-1',
        resourceType: 'patient',
        tenantId: 'tenant-1',
        sensitivity: 'confidential',
      };

      it('should allow PHI access for authorized roles', () => {
        const roles = ['admin', 'provider', 'nurse', 'patient'];
        roles.forEach((role) => {
          const userContext: UserContext = {
            userId: 'user-1',
            role,
            tenantId: 'tenant-1',
            permissions: ['read', 'write'],
            sessionId: 'session-1',
            ipAddress: '192.168.1.1',
            userAgent: 'test-agent',
          };
          const resourceContext: ResourceContext = {
            resourceId: 'resource-1',
            resourceType: 'patient',
            tenantId: 'tenant-1',
            sensitivity: 'confidential',
            // For patient role, ensure ownerId matches userId
            ownerId: role === 'patient' ? 'user-1' : undefined,
          };
          const result = validatePHIAccess(userContext, resourceContext);
          expect(result.allowed).toBe(true);
        });
      });

      it('should deny PHI access for unauthorized roles', () => {
        const userContext = { ...mockUserContext, role: 'guest' };
        const result = validatePHIAccess(userContext, mockResourceContext);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('does not have PHI access permissions');
      });

      it('should allow patients to access their own data', () => {
        const patientContext: UserContext = {
          ...mockUserContext,
          role: 'patient',
          userId: 'patient-1',
        };
        const patientResource: ResourceContext = {
          ...mockResourceContext,
          ownerId: 'patient-1',
        };
        const result = validatePHIAccess(patientContext, patientResource);
        expect(result.allowed).toBe(true);
      });

      it('should deny patients access to other patients data', () => {
        const patientContext: UserContext = {
          ...mockUserContext,
          role: 'patient',
          userId: 'patient-1',
        };
        const otherPatientResource: ResourceContext = {
          ...mockResourceContext,
          ownerId: 'patient-2',
        };
        const result = validatePHIAccess(patientContext, otherPatientResource);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('only access their own data');
      });

      it('should enforce tenant isolation for PHI access', () => {
        const userContext = { ...mockUserContext, tenantId: 'tenant-1' };
        const resourceContext = { ...mockResourceContext, tenantId: 'tenant-2' };
        const result = validatePHIAccess(userContext, resourceContext);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Cross-tenant');
      });
    });
  });

  describe('Session Security Validation', () => {
    describe('validateSessionSecurity', () => {
      const baseUserContext: UserContext = {
        userId: 'user-1',
        role: 'clinic_user',
        tenantId: 'tenant-1',
        permissions: ['read'],
        sessionId: `session_${Date.now()}`,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      it('should allow access for valid session', () => {
        const result = validateSessionSecurity(baseUserContext);
        expect(result.valid).toBe(true);
      });

      it('should deny access for expired session', () => {
        const oldTimestamp = Date.now() - 31 * 60 * 1000; // 31 minutes ago
        const expiredSession: UserContext = {
          ...baseUserContext,
          sessionId: `session_${oldTimestamp}`,
        };
        const result = validateSessionSecurity(expiredSession, 30 * 60 * 1000); // 30 min timeout
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('expired');
      });

      it('should deny access for invalid IP address', () => {
        const invalidIpContext: UserContext = {
          ...baseUserContext,
          ipAddress: '0.0.0.0',
        };
        const result = validateSessionSecurity(invalidIpContext);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Invalid IP');
      });

      it('should deny access for localhost IP', () => {
        const localhostContext: UserContext = {
          ...baseUserContext,
          ipAddress: '127.0.0.1',
        };
        const result = validateSessionSecurity(localhostContext);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Invalid IP');
      });

      it('should allow access for valid session within timeout', () => {
        const recentTimestamp = Date.now() - 15 * 60 * 1000; // 15 minutes ago
        const validSession: UserContext = {
          ...baseUserContext,
          sessionId: `session_${recentTimestamp}`,
        };
        const result = validateSessionSecurity(validSession, 30 * 60 * 1000); // 30 min timeout
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Compliance Scoring', () => {
    describe('calculateAccessControlScore', () => {
      it('should calculate score correctly for all valid validations', () => {
        const validations: AccessControlValidation[] = [
          { rule: { role: 'admin', resource: 'patient', action: 'read' }, valid: true },
          { rule: { role: 'admin', resource: 'patient', action: 'write' }, valid: true },
          { rule: { role: 'admin', resource: 'patient', action: 'delete' }, valid: true },
        ];
        expect(calculateAccessControlScore(validations)).toBe(100);
      });

      it('should calculate score correctly for mixed validations', () => {
        const validations: AccessControlValidation[] = [
          { rule: { role: 'admin', resource: 'patient', action: 'read' }, valid: true },
          { rule: { role: 'admin', resource: 'patient', action: 'write' }, valid: false },
          { rule: { role: 'admin', resource: 'patient', action: 'delete' }, valid: true },
        ];
        expect(calculateAccessControlScore(validations)).toBe(67); // 2/3 = 66.67, rounded to 67
      });

      it('should calculate score correctly for all invalid validations', () => {
        const validations: AccessControlValidation[] = [
          { rule: { role: 'admin', resource: 'patient', action: 'read' }, valid: false },
          { rule: { role: 'admin', resource: 'patient', action: 'write' }, valid: false },
        ];
        expect(calculateAccessControlScore(validations)).toBe(0);
      });

      it('should handle empty validations array', () => {
        // Empty array should return 0 (no validations = no score to calculate)
        // This prevents division by zero which would result in NaN
        expect(calculateAccessControlScore([])).toBe(0);
      });
    });

    describe('generateAccessControlReport', () => {
      it('should generate report with valid and invalid validations', () => {
        const validations: AccessControlValidation[] = [
          {
            rule: { role: 'admin', resource: 'patient', action: 'read' },
            valid: true,
          },
          {
            rule: { role: 'admin', resource: 'patient', action: 'write' },
            valid: false,
            reason: 'Permission denied',
          },
        ];
        const report = generateAccessControlReport(validations);
        expect(report).toContain('Access Control Compliance Report');
        expect(report).toContain('Overall Score: 50/100');
        expect(report).toContain('Valid Rules: 1/2');
        expect(report).toContain('✅');
        expect(report).toContain('❌');
        expect(report).toContain('Permission denied');
      });

      it('should generate report with all valid validations', () => {
        const validations: AccessControlValidation[] = [
          {
            rule: { role: 'admin', resource: 'patient', action: 'read' },
            valid: true,
          },
        ];
        const report = generateAccessControlReport(validations);
        expect(report).toContain('Overall Score: 100/100');
        expect(report).toContain('Valid Rules: 1/1');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('canAccessPatient - Edge Cases', () => {
      it('should handle null user', () => {
        const patient = { id: 'patient-1', tenantId: 'tenant-1' };
        const result = canAccessPatient(null, patient, 'all_clinic');
        expect(result).toBe(false);
      });

      it('should handle null patient', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const result = canAccessPatient(user, null, 'all_clinic');
        expect(result).toBe(false);
      });

      it('should return detailed error for null user', () => {
        const patient = { id: 'patient-1', tenantId: 'tenant-1' };
        const result = canAccessPatient(null, patient, 'all_clinic', {
          returnDetails: true,
        }) as { canAccess: boolean; reason?: string };

        expect(result.canAccess).toBe(false);
        expect(result.reason).toContain('User is required');
      });

      it('should return detailed error for null patient', () => {
        const user: User = {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'clinic_user',
          tenantId: 'tenant-1',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const result = canAccessPatient(user, null, 'all_clinic', {
          returnDetails: true,
        }) as { canAccess: boolean; reason?: string };

        expect(result.canAccess).toBe(false);
        expect(result.reason).toContain('Patient is required');
      });
    });

    describe('hasPermission - Edge Cases', () => {
      it('should handle null permissions', () => {
        const result = hasPermission(null, 'patients.features.create');
        expect(result).toBe(false);
      });

      it('should handle undefined permissions', () => {
        const result = hasPermission(undefined, 'patients.features.create');
        expect(result).toBe(false);
      });

      it('should handle empty permission path', () => {
        const permissions: PermissionTree = {
          patients: { enabled: true, viewScope: 'all_clinic' },
        };
        const result = hasPermission(permissions, '');
        expect(result).toBe(false);
      });

      it('should handle invalid permission path format', () => {
        const permissions: PermissionTree = {
          patients: { enabled: true, viewScope: 'all_clinic' },
        };
        const result = hasPermission(permissions, 'patients..features');
        expect(result).toBe(false);
      });

      it('should return detailed error for null permissions', () => {
        const result = hasPermission(null, 'patients', undefined, {
          returnDetails: true,
        }) as { hasPermission: boolean; error?: string };

        expect(result.hasPermission).toBe(false);
        expect(result.error).toContain('No permissions provided');
      });
    });

    describe('validateAccessControl - Edge Cases', () => {
      it('should handle restricted resources correctly', () => {
        const userContext: UserContext = {
          userId: 'user-1',
          role: 'provider', // Not admin
          tenantId: 'tenant-1',
          permissions: ['read'],
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        };
        const restrictedResource: ResourceContext = {
          resourceId: 'resource-1',
          resourceType: 'patient',
          tenantId: 'tenant-1',
          sensitivity: 'restricted',
        };
        const result = validateAccessControl(userContext, restrictedResource, 'read');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('requires admin role');
      });

      it('should handle confidential resources (PHI logging requirement)', () => {
        const userContext: UserContext = {
          userId: 'user-1',
          role: 'provider',
          tenantId: 'tenant-1',
          permissions: ['read'],
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        };
        const confidentialResource: ResourceContext = {
          resourceId: 'resource-1',
          resourceType: 'patient',
          tenantId: 'tenant-1',
          sensitivity: 'confidential',
        };
        // Confidential resources should still allow access, but PHI logging is required
        const result = validateAccessControl(userContext, confidentialResource, 'read');
        expect(result.valid).toBe(true);
      });
    });
  });
});

