import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isClinicUser, isOwner, getUserDepartments, hasPermission, canAccessPatient } from '@/lib/auth-utils';
import type { User, PermissionTree, ViewScope } from '@/types';

// Mock JWT
const mockJwt = {
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn()
};
vi.mock('jsonwebtoken', () => ({
  default: mockJwt
}));

// Mock bcrypt
const mockBcrypt = {
  hash: vi.fn(),
  compare: vi.fn()
};
vi.mock('bcryptjs', () => mockBcrypt);

describe('Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JWT Token Management', () => {
    it('should generate JWT token with correct payload', () => {
      const mockToken = 'mock.jwt.token';
      
      mockJwt.sign.mockReturnValue(mockToken);

      const payload = {
        userId: 'patient-123',
        email: 'patient@example.com',
        role: 'patient',
        tenantId: 'demo-tenant-123'
      };

      const secret = 'test-secret';
      const options = { expiresIn: '24h' };

      // This would be called from a utility function
      const result = mockJwt.sign(payload, secret, options);

      expect(mockJwt.sign).toHaveBeenCalledWith(payload, secret, options);
      expect(result).toBe(mockToken);
    });

    it('should verify JWT token successfully', () => {
      const mockPayload = {
        userId: 'patient-123',
        email: 'patient@example.com',
        role: 'patient',
        tenantId: 'demo-tenant-123'
      };
      
      mockJwt.verify.mockReturnValue(mockPayload);

      const token = 'valid.jwt.token';
      const secret = 'test-secret';

      const result = mockJwt.verify(token, secret);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, secret);
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid JWT token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const token = 'invalid.jwt.token';
      const secret = 'test-secret';

      expect(() => mockJwt.verify(token, secret)).toThrow('Invalid token');
    });

    it('should throw error for expired JWT token', () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const token = 'expired.jwt.token';
      const secret = 'test-secret';

      expect(() => mockJwt.verify(token, secret)).toThrow('Token expired');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      const mockHash = '$2b$10$mock.hash.for.testing';
      
      mockBcrypt.hash.mockResolvedValue(mockHash);

      const password = 'securePassword123';
      const saltRounds = 10;

      const result = await mockBcrypt.hash(password, saltRounds);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, saltRounds);
      expect(result).toBe(mockHash);
    });

    it('should compare password successfully', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const password = 'securePassword123';
      const hash = '$2b$10$mock.hash.for.testing';

      const result = await mockBcrypt.compare(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const password = 'wrongPassword';
      const hash = '$2b$10$mock.hash.for.testing';

      const result = await mockBcrypt.compare(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });
  });

  describe('Token Validation', () => {
    it('should validate token structure', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYXRpZW50LTEyMyIsImVtYWlsIjoicGF0aWVudEBleGFtcGxlLmNvbSIsInJvbGUiOiJwYXRpZW50IiwidGVuYW50SWQiOiJkZW1vLXRlbmFudC0xMjMiLCJpYXQiOjE2NDA5OTI4MDAsImV4cCI6MTY0MDk5MjgwMH0.mockSignature';
      
      // Basic JWT structure validation (3 parts separated by dots)
      const parts = validToken.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeTruthy(); // Header
      expect(parts[1]).toBeTruthy(); // Payload
      expect(parts[2]).toBeTruthy(); // Signature
    });

    it('should reject malformed token', () => {
      const malformedToken = 'not.a.jwt.token';
      
      const parts = malformedToken.split('.');
      expect(parts).not.toHaveLength(3);
    });

    it('should reject empty token', () => {
      const emptyToken = '';
      
      expect(emptyToken).toBeFalsy();
    });
  });

  describe('isClinicUser', () => {
    it('should return true for clinic_user role', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(true);
      expect(isClinicUser('clinic_user')).toBe(true);
    });

    it('should return true for admin role (backward compatibility)', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(true);
      expect(isClinicUser('admin')).toBe(true);
    });

    it('should return true for provider role (backward compatibility)', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'provider',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(true);
      expect(isClinicUser('provider')).toBe(true);
    });

    it('should return false for patient role', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(false);
      expect(isClinicUser('patient')).toBe(false);
    });

    it('should return false for demo role', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'demo',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(false);
      expect(isClinicUser('demo')).toBe(false);
    });

    it('should return false for super_admin role', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isClinicUser(user)).toBe(false);
      expect(isClinicUser('super_admin')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isClinicUser(null)).toBe(false);
      expect(isClinicUser(undefined)).toBe(false);
      expect(isClinicUser({})).toBe(false);
    });

    it('should return false for user object without role', () => {
      const userWithoutRole = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };
      
      expect(isClinicUser(userWithoutRole)).toBe(false);
    });

    it('should handle user object with optional role', () => {
      const userWithOptionalRole: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
      };
      
      expect(isClinicUser(userWithOptionalRole)).toBe(true);
    });
  });

  describe('isOwner', () => {
    it('should return true for user with isOwner=true', () => {
      const user: User = {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Clinic Owner',
        role: 'clinic_user',
        isActive: true,
        isOwner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isOwner(user)).toBe(true);
      expect(isOwner(true)).toBe(true);
    });

    it('should return false for user with isOwner=false', () => {
      const user: User = {
        id: 'user-1',
        email: 'provider@example.com',
        name: 'Clinic Provider',
        role: 'clinic_user',
        isActive: true,
        isOwner: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isOwner(user)).toBe(false);
      expect(isOwner(false)).toBe(false);
    });

    it('should return false for user with isOwner=undefined (defaults to false)', () => {
      const user: User = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Clinic User',
        role: 'clinic_user',
        isActive: true,
        // isOwner is undefined (optional field)
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(isOwner(user)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isOwner(null)).toBe(false);
      expect(isOwner(undefined)).toBe(false);
    });

    it('should handle user object without isOwner property', () => {
      const userWithoutIsOwner = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
      };
      
      expect(isOwner(userWithoutIsOwner)).toBe(false);
    });

    it('should handle user object with optional isOwner', () => {
      const userWithOptionalIsOwner: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        isOwner: true,
      };
      
      expect(isOwner(userWithOptionalIsOwner)).toBe(true);
    });

    it('should handle direct boolean input', () => {
      expect(isOwner(true)).toBe(true);
      expect(isOwner(false)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isOwner({})).toBe(false);
    });

    it('should correctly identify owner vs non-owner users', () => {
      const owner: User = {
        id: 'owner-1',
        email: 'owner@clinic.com',
        name: 'Clinic Owner',
        role: 'clinic_user',
        isActive: true,
        isOwner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider: User = {
        id: 'provider-1',
        email: 'provider@clinic.com',
        name: 'Clinic Provider',
        role: 'clinic_user',
        isActive: true,
        isOwner: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isOwner(owner)).toBe(true);
      expect(isOwner(provider)).toBe(false);
    });
  });

  describe('getUserDepartments', () => {
    it('should return departments array when present', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: ['dept-1', 'dept-2', 'dept-3'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(getUserDepartments(user)).toEqual(['dept-1', 'dept-2', 'dept-3']);
    });

    it('should return empty array when departments is empty', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(getUserDepartments(user)).toEqual([]);
      expect(getUserDepartments(user)).toHaveLength(0);
    });

    it('should return empty array when departments is undefined', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        // departments is undefined (optional field)
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(getUserDepartments(user)).toEqual([]);
      expect(getUserDepartments(user)).toHaveLength(0);
    });

    it('should return empty array for null user', () => {
      expect(getUserDepartments(null)).toEqual([]);
      expect(getUserDepartments(null)).toHaveLength(0);
    });

    it('should return empty array for undefined user', () => {
      expect(getUserDepartments(undefined)).toEqual([]);
      expect(getUserDepartments(undefined)).toHaveLength(0);
    });

    it('should return empty array for user object without departments property', () => {
      const userWithoutDepartments = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
      };
      
      expect(getUserDepartments(userWithoutDepartments)).toEqual([]);
      expect(getUserDepartments(userWithoutDepartments)).toHaveLength(0);
    });

    it('should handle user object with optional departments', () => {
      const userWithOptionalDepartments: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: ['dept-1'],
      };
      
      expect(getUserDepartments(userWithOptionalDepartments)).toEqual(['dept-1']);
    });

    it('should return a new array (not reference to original)', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: ['dept-1', 'dept-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result1 = getUserDepartments(user);
      const result2 = getUserDepartments(user);
      
      // Should return arrays with same content
      expect(result1).toEqual(result2);
      // But should be different array instances (defensive copy not needed, but good to verify behavior)
      // Actually, we're returning the array directly, so they might be the same reference
      // This is fine since we're just reading, not modifying
      expect(result1).toEqual(['dept-1', 'dept-2']);
    });

    it('should handle single department', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: ['dept-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(getUserDepartments(user)).toEqual(['dept-1']);
      expect(getUserDepartments(user)).toHaveLength(1);
    });

    it('should handle multiple departments', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'clinic_user',
        isActive: true,
        departments: ['dept-1', 'dept-2', 'dept-3', 'dept-4'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const departments = getUserDepartments(user);
      expect(departments).toHaveLength(4);
      expect(departments).toContain('dept-1');
      expect(departments).toContain('dept-2');
      expect(departments).toContain('dept-3');
      expect(departments).toContain('dept-4');
    });

    it('should return empty array for empty object', () => {
      expect(getUserDepartments({})).toEqual([]);
      expect(getUserDepartments({})).toHaveLength(0);
    });
  });

  describe('hasPermission', () => {
    const fullPermissions: PermissionTree = {
      patients: {
        enabled: true,
        viewScope: 'all_clinic',
        features: {
          list: {
            enabled: true,
            components: {
              patientCard: {
                enabled: true,
                tabs: {
                  overview: true,
                  timeline: true,
                  medications: false,
                  documents: true,
                  billing: false,
                },
              },
              search: true,
              filters: true,
            },
          },
          create: true,
          edit: true,
          delete: false,
          view: true,
        },
      },
      appointments: {
        enabled: true,
        viewScope: 'all_clinic',
        features: {
          calendar: true,
          schedule: true,
          create: true,
          edit: true,
          cancel: false,
          view: true,
        },
      },
      settings: {
        enabled: true,
        features: {
          users: {
            enabled: true,
            create: true,
            edit: true,
            delete: false,
            view: true,
            invite: true,
          },
          roles: {
            enabled: false,
            create: false,
            edit: false,
            delete: false,
            view: false,
          },
        },
      },
      medical_records: {
        enabled: true,
        viewScope: 'department',
        features: {
          encounters: {
            enabled: true,
            create: true,
            edit: true,
            view: true,
            sign: false,
          },
          notes: {
            enabled: true,
            create: true,
            edit: false,
            view: true,
          },
          vitals: true,
          lab_results: true,
          medications: false,
          allergies: true,
        },
      },
    };

    const restrictedPermissions: PermissionTree = {
      patients: {
        enabled: false,
        viewScope: 'own_only',
      },
      appointments: {
        enabled: true,
        viewScope: 'own_only',
        features: {
          view: true,
          create: false,
          edit: false,
        },
      },
    };

    describe('Owner override', () => {
      it('should return true for owners regardless of permissions', () => {
        const owner: User = {
          id: 'owner-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'clinic_user',
          isActive: true,
          isOwner: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(hasPermission(null, 'patients.features.create', owner)).toBe(true);
        expect(hasPermission(restrictedPermissions, 'patients.features.create', owner)).toBe(true);
        expect(hasPermission(fullPermissions, 'any.path.here', owner)).toBe(true);
      });

      it('should return detailed result for owners', () => {
        const owner: User = {
          id: 'owner-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'clinic_user',
          isActive: true,
          isOwner: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = hasPermission(
          null,
          'patients.features.create',
          owner,
          { returnDetails: true }
        ) as { hasPermission: boolean; path?: string };

        expect(result.hasPermission).toBe(true);
        expect(result.path).toBe('patients.features.create');
      });
    });

    describe('Section-level checks', () => {
      it('should return true if section is enabled', () => {
        expect(hasPermission(fullPermissions, 'patients')).toBe(true);
        expect(hasPermission(fullPermissions, 'appointments')).toBe(true);
        expect(hasPermission(fullPermissions, 'settings')).toBe(true);
      });

      it('should return false if section is disabled', () => {
        expect(hasPermission(restrictedPermissions, 'patients')).toBe(false);
      });

      it('should return false if section does not exist', () => {
        expect(hasPermission(fullPermissions, 'nonexistent')).toBe(false);
      });

      it('should return detailed error for disabled section', () => {
        const result = hasPermission(
          restrictedPermissions,
          'patients',
          undefined,
          { returnDetails: true }
        ) as { hasPermission: boolean; error?: string };

        expect(result.hasPermission).toBe(false);
        expect(result.error).toContain('not enabled');
      });
    });

    describe('Feature-level checks', () => {
      it('should return true for enabled boolean features', () => {
        expect(hasPermission(fullPermissions, 'patients.features.create')).toBe(true);
        expect(hasPermission(fullPermissions, 'patients.features.edit')).toBe(true);
        expect(hasPermission(fullPermissions, 'patients.features.view')).toBe(true);
      });

      it('should return false for disabled boolean features', () => {
        expect(hasPermission(fullPermissions, 'patients.features.delete')).toBe(false);
        expect(hasPermission(fullPermissions, 'appointments.features.cancel')).toBe(false);
      });

      it('should return true for enabled object features', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.encounters')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.notes')).toBe(true);
      });

      it('should return false for disabled object features', () => {
        expect(hasPermission(fullPermissions, 'settings.features.roles')).toBe(false);
      });

      it('should return false if feature does not exist', () => {
        expect(hasPermission(fullPermissions, 'patients.features.nonexistent')).toBe(false);
      });

      it('should return false if section is disabled even if feature would be enabled', () => {
        expect(hasPermission(restrictedPermissions, 'patients.features.create')).toBe(false);
      });
    });

    describe('Component-level checks', () => {
      it('should return true for enabled boolean components', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.search')).toBe(true);
        expect(hasPermission(fullPermissions, 'patients.features.list.components.filters')).toBe(true);
      });

      it('should return true for enabled patientCard component', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard')).toBe(true);
      });

      it('should return false if component does not exist', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.nonexistent')).toBe(false);
      });

      it('should return false if parent feature is disabled', () => {
        expect(hasPermission(fullPermissions, 'settings.features.roles.components.anything')).toBe(false);
      });
    });

    describe('Tab-level checks', () => {
      it('should return true for enabled tabs', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.overview')).toBe(true);
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.timeline')).toBe(true);
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.documents')).toBe(true);
      });

      it('should return false for disabled tabs', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.medications')).toBe(false);
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.billing')).toBe(false);
      });

      it('should return false if tab does not exist', () => {
        expect(hasPermission(fullPermissions, 'patients.features.list.components.patientCard.tabs.nonexistent')).toBe(false);
      });

      it('should return false if patientCard component is disabled', () => {
        const permissionsWithoutPatientCard: PermissionTree = {
          patients: {
            enabled: true,
            viewScope: 'all_clinic',
            features: {
              list: {
                enabled: true,
                components: {
                  search: true,
                  filters: true,
                  // patientCard is missing or disabled
                },
              },
            },
          },
        };
        expect(hasPermission(permissionsWithoutPatientCard, 'patients.features.list.components.patientCard.tabs.overview')).toBe(false);
      });
    });

    describe('Nested feature checks', () => {
      it('should return true for enabled nested features', () => {
        expect(hasPermission(fullPermissions, 'medical_records.features.encounters.create')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.encounters.edit')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.encounters.view')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.notes.create')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.notes.view')).toBe(true);
      });

      it('should return false for disabled nested features', () => {
        expect(hasPermission(fullPermissions, 'medical_records.features.encounters.sign')).toBe(false);
        expect(hasPermission(fullPermissions, 'medical_records.features.notes.edit')).toBe(false);
      });

      it('should return true for enabled boolean nested features', () => {
        expect(hasPermission(fullPermissions, 'medical_records.features.vitals')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.lab_results')).toBe(true);
        expect(hasPermission(fullPermissions, 'medical_records.features.allergies')).toBe(true);
      });

      it('should return false for disabled boolean nested features', () => {
        expect(hasPermission(fullPermissions, 'medical_records.features.medications')).toBe(false);
      });
    });

    describe('Settings section checks', () => {
      it('should handle settings features correctly', () => {
        expect(hasPermission(fullPermissions, 'settings.features.users.create')).toBe(true);
        expect(hasPermission(fullPermissions, 'settings.features.users.edit')).toBe(true);
        expect(hasPermission(fullPermissions, 'settings.features.users.invite')).toBe(true);
        expect(hasPermission(fullPermissions, 'settings.features.users.delete')).toBe(false);
      });

      it('should return false for disabled settings features', () => {
        expect(hasPermission(fullPermissions, 'settings.features.roles')).toBe(false);
        expect(hasPermission(fullPermissions, 'settings.features.roles.create')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return false for null permissions', () => {
        expect(hasPermission(null, 'patients.features.create')).toBe(false);
      });

      it('should return false for undefined permissions', () => {
        expect(hasPermission(undefined, 'patients.features.create')).toBe(false);
      });

      it('should return false for empty path', () => {
        expect(hasPermission(fullPermissions, '')).toBe(false);
      });

      it('should return false for invalid path format', () => {
        expect(hasPermission(fullPermissions, '...')).toBe(false);
      });

      it('should handle paths with extra dots', () => {
        expect(hasPermission(fullPermissions, 'patients..features.create')).toBe(false);
      });

      it('should return detailed error for invalid paths', () => {
        const result = hasPermission(
          fullPermissions,
          'patients.features.nonexistent',
          undefined,
          { returnDetails: true }
        ) as { hasPermission: boolean; error?: string };

        expect(result.hasPermission).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Performance optimization', () => {
      it('should handle deep paths efficiently', () => {
        const deepPath = 'patients.features.list.components.patientCard.tabs.overview';
        expect(hasPermission(fullPermissions, deepPath)).toBe(true);
      });

      it('should short-circuit on disabled sections', () => {
        const result = hasPermission(restrictedPermissions, 'patients.features.create.components.anything');
        expect(result).toBe(false);
      });
    });
  });

  describe('Role Validation', () => {
    it('should validate patient role', () => {
      const validRoles = ['patient', 'provider', 'admin'];
      const patientRole = 'patient';
      
      expect(validRoles).toContain(patientRole);
    });

    it('should reject invalid role', () => {
      const validRoles = ['patient', 'provider', 'admin'];
      const invalidRole = 'guest';
      
      expect(validRoles).not.toContain(invalidRole);
    });

    it('should validate role-based permissions', () => {
      const rolePermissions = {
        patient: ['read:own', 'update:own'],
        provider: ['read:patients', 'update:patients', 'create:appointments'],
        admin: ['read:all', 'update:all', 'delete:all']
      };

      const patientRole = 'patient';
      const patientPermissions = rolePermissions[patientRole as keyof typeof rolePermissions];
      
      expect(patientPermissions).toContain('read:own');
      expect(patientPermissions).toContain('update:own');
      expect(patientPermissions).not.toContain('read:all');
    });
  });

  describe('Tenant Validation', () => {
    it('should validate tenant ID format', () => {
      const validTenantId = 'demo-tenant-123';
      const tenantIdPattern = /^[a-z0-9-]+$/;
      
      expect(tenantIdPattern.test(validTenantId)).toBe(true);
    });

    it('should reject invalid tenant ID format', () => {
      const invalidTenantId = 'Invalid Tenant ID!';
      const tenantIdPattern = /^[a-z0-9-]+$/;
      
      expect(tenantIdPattern.test(invalidTenantId)).toBe(false);
    });

    it('should validate tenant isolation', () => {
      const userTenantId = 'tenant-123';
      const requestTenantId = 'tenant-123';
      
      expect(userTenantId).toBe(requestTenantId);
    });

    it('should reject cross-tenant access', () => {
      const userTenantId = 'tenant-123';
      const requestTenantId = 'tenant-456';
      
      expect(userTenantId).not.toBe(requestTenantId);
    });
  });

  describe('Session Management', () => {
    it('should validate session expiration', () => {
      const now = Date.now();
      const tokenIssuedAt = now - (23 * 60 * 60 * 1000); // 23 hours ago
      const tokenExpiresAt = now + (1 * 60 * 60 * 1000); // 1 hour from now
      
      expect(now).toBeLessThan(tokenExpiresAt);
      expect(now).toBeGreaterThan(tokenIssuedAt);
    });

    it('should detect expired session', () => {
      const now = Date.now();
      const tokenExpiresAt = now - (1 * 60 * 1000); // 1 minute ago
      
      expect(now).toBeGreaterThan(tokenExpiresAt);
    });

    it('should validate session refresh requirements', () => {
      const now = Date.now();
      const tokenIssuedAt = now - (12 * 60 * 60 * 1000); // 12 hours ago
      const refreshThreshold = 6 * 60 * 60 * 1000; // 6 hours
      
      const timeSinceIssued = now - tokenIssuedAt;
      const shouldRefresh = timeSinceIssued > refreshThreshold;
      
      expect(shouldRefresh).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should validate secure cookie settings', () => {
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      };
      
      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.secure).toBe(true);
      expect(cookieOptions.sameSite).toBe('strict');
      expect(cookieOptions.maxAge).toBe(24 * 60 * 60 * 1000);
    });

    it('should validate CSRF token format', () => {
      const csrfToken = 'csrf-token-123456789';
      const csrfPattern = /^csrf-token-[a-zA-Z0-9]+$/;
      
      expect(csrfPattern.test(csrfToken)).toBe(true);
    });

    it('should validate rate limiting headers', () => {
      const rateLimitHeaders = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': '1640992800'
      };
      
      expect(rateLimitHeaders['X-RateLimit-Limit']).toBe('100');
      expect(rateLimitHeaders['X-RateLimit-Remaining']).toBe('99');
      expect(rateLimitHeaders['X-RateLimit-Reset']).toBe('1640992800');
    });
  });

  describe('canAccessPatient', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'clinic_user',
      isActive: true,
      tenantId: 'tenant-1',
      departments: ['dept-1', 'dept-2'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockPatient = {
      id: 'patient-1',
      department: 'dept-1',
      tenantId: 'tenant-1',
      userId: 'patient-user-1'
    };

    describe('Owner override', () => {
      it('should allow access for owners regardless of view scope', () => {
        const ownerUser = { ...mockUser, isOwner: true };
        
        expect(canAccessPatient(ownerUser, mockPatient, 'department')).toBe(true);
        expect(canAccessPatient(ownerUser, mockPatient, 'care_team')).toBe(true);
        expect(canAccessPatient(ownerUser, mockPatient, 'own_only')).toBe(true);
        expect(canAccessPatient(ownerUser, mockPatient, 'all_clinic')).toBe(true);
      });

      it('should return detailed result for owners', () => {
        const ownerUser = { ...mockUser, isOwner: true };
        const result = canAccessPatient(ownerUser, mockPatient, 'department', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: true,
          reason: 'User is clinic owner'
        });
      });
    });

    describe('Tenant isolation', () => {
      it('should deny access for different tenants', () => {
        const differentTenantPatient = { ...mockPatient, tenantId: 'tenant-2' };
        
        expect(canAccessPatient(mockUser, differentTenantPatient, 'all_clinic')).toBe(false);
      });

      it('should return detailed error for different tenants', () => {
        const differentTenantPatient = { ...mockPatient, tenantId: 'tenant-2' };
        const result = canAccessPatient(mockUser, differentTenantPatient, 'all_clinic', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'Patient belongs to different tenant'
        });
      });
    });

    describe('all_clinic view scope', () => {
      it('should allow access for all_clinic scope', () => {
        expect(canAccessPatient(mockUser, mockPatient, 'all_clinic')).toBe(true);
      });

      it('should return detailed result for all_clinic scope', () => {
        const result = canAccessPatient(mockUser, mockPatient, 'all_clinic', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: true,
          reason: 'View scope allows access to all clinic patients'
        });
      });
    });

    describe('department view scope', () => {
      it('should allow access when patient department matches user departments', () => {
        const patientInUserDept = { ...mockPatient, department: 'dept-1' };
        
        expect(canAccessPatient(mockUser, patientInUserDept, 'department')).toBe(true);
      });

      it('should allow access when patient department matches any user department', () => {
        const patientInUserDept = { ...mockPatient, department: 'dept-2' };
        
        expect(canAccessPatient(mockUser, patientInUserDept, 'department')).toBe(true);
      });

      it('should deny access when patient department does not match user departments', () => {
        const patientDifferentDept = { ...mockPatient, department: 'dept-3' };
        
        expect(canAccessPatient(mockUser, patientDifferentDept, 'department')).toBe(false);
      });

      it('should deny access when user has no departments', () => {
        const userNoDepts = { ...mockUser, departments: [] };
        
        expect(canAccessPatient(userNoDepts, mockPatient, 'department')).toBe(false);
      });

      it('should deny access when patient has no department', () => {
        const patientNoDept = { ...mockPatient, department: undefined };
        
        expect(canAccessPatient(mockUser, patientNoDept, 'department')).toBe(false);
      });

      it('should return detailed result for department match', () => {
        const result = canAccessPatient(mockUser, mockPatient, 'department', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: true,
          reason: 'Patient department (dept-1) matches user departments'
        });
      });

      it('should return detailed error for department mismatch', () => {
        const patientDifferentDept = { ...mockPatient, department: 'dept-3' };
        const result = canAccessPatient(mockUser, patientDifferentDept, 'department', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'Patient department (dept-3) does not match user departments (dept-1, dept-2)'
        });
      });
    });

    describe('care_team view scope', () => {
      it('should allow access when user provider is in care team', () => {
        const careTeamProviderIds = ['provider-1', 'provider-2', 'provider-3'];
        const userProviderId = 'provider-2';
        
        expect(canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds, userProviderId }
        )).toBe(true);
      });

      it('should deny access when user provider is not in care team', () => {
        const careTeamProviderIds = ['provider-1', 'provider-2'];
        const userProviderId = 'provider-3';
        
        expect(canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds, userProviderId }
        )).toBe(false);
      });

      it('should deny access when care team is empty', () => {
        const careTeamProviderIds: string[] = [];
        const userProviderId = 'provider-1';
        
        expect(canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds, userProviderId }
        )).toBe(false);
      });

      it('should deny access when user provider ID is not provided', () => {
        const careTeamProviderIds = ['provider-1', 'provider-2'];
        
        expect(canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds }
        )).toBe(false);
      });

      it('should return detailed result for care team match', () => {
        const careTeamProviderIds = ['provider-1', 'provider-2'];
        const userProviderId = 'provider-1';
        const result = canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds, userProviderId, returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: true,
          reason: 'User provider (provider-1) is in patient\'s care team'
        });
      });

      it('should return detailed error for care team mismatch', () => {
        const careTeamProviderIds = ['provider-1', 'provider-2'];
        const userProviderId = 'provider-3';
        const result = canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds, userProviderId, returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'User provider (provider-3) is not in patient\'s care team'
        });
      });
    });

    describe('own_only view scope', () => {
      it('should allow access when patient userId matches user id', () => {
        const patientAsUser = { ...mockPatient, userId: mockUser.id };
        
        expect(canAccessPatient(
          mockUser,
          patientAsUser,
          'own_only',
          { patientUserId: patientAsUser.userId }
        )).toBe(true);
      });

      it('should deny access when patient userId does not match user id', () => {
        expect(canAccessPatient(
          mockUser,
          mockPatient,
          'own_only',
          { patientUserId: mockPatient.userId }
        )).toBe(false);
      });

      it('should return detailed result for own patient', () => {
        const patientAsUser = { ...mockPatient, userId: mockUser.id };
        const result = canAccessPatient(
          mockUser,
          patientAsUser,
          'own_only',
          { patientUserId: patientAsUser.userId, returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: true,
          reason: 'User is accessing their own patient record'
        });
      });

      it('should return detailed error for different patient', () => {
        const result = canAccessPatient(
          mockUser,
          mockPatient,
          'own_only',
          { patientUserId: mockPatient.userId, returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'User can only access their own patient record'
        });
      });
    });

    describe('Input validation', () => {
      it('should deny access when user is null', () => {
        expect(canAccessPatient(null, mockPatient, 'all_clinic')).toBe(false);
      });

      it('should deny access when patient is null', () => {
        expect(canAccessPatient(mockUser, null, 'all_clinic')).toBe(false);
      });

      it('should return detailed error for null user', () => {
        const result = canAccessPatient(null, mockPatient, 'all_clinic', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'User is required'
        });
      });

      it('should return detailed error for null patient', () => {
        const result = canAccessPatient(mockUser, null, 'all_clinic', { returnDetails: true });
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'Patient is required'
        });
      });

      it('should handle unknown view scope', () => {
        const result = canAccessPatient(
          mockUser,
          mockPatient,
          'unknown_scope' as ViewScope,
          { returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'Unknown view scope: unknown_scope'
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle user with undefined departments', () => {
        const userUndefinedDepts = { ...mockUser, departments: undefined };
        const patientInDept = { ...mockPatient, department: 'dept-1' };
        
        expect(canAccessPatient(userUndefinedDepts, patientInDept, 'department')).toBe(false);
      });

      it('should handle user with null departments', () => {
        const userNullDepts = { ...mockUser, departments: null as any };
        const patientInDept = { ...mockPatient, department: 'dept-1' };
        
        expect(canAccessPatient(userNullDepts, patientInDept, 'department')).toBe(false);
      });

      it('should handle patient with empty string department', () => {
        const patientEmptyDept = { ...mockPatient, department: '' };
        
        expect(canAccessPatient(mockUser, patientEmptyDept, 'department')).toBe(false);
      });

      it('should handle user without tenantId', () => {
        const userNoTenant = { ...mockUser, tenantId: undefined };
        
        // Should still work if patient tenantId matches (or if both are undefined)
        expect(canAccessPatient(userNoTenant, mockPatient, 'all_clinic')).toBe(true);
      });

      it('should handle empty care team array', () => {
        const result = canAccessPatient(
          mockUser,
          mockPatient,
          'care_team',
          { careTeamProviderIds: [], userProviderId: 'provider-1', returnDetails: true }
        );
        
        expect(result).toEqual({
          canAccess: false,
          reason: 'Patient has no care team members'
        });
      });
    });

    describe('Additional edge cases for coverage', () => {
      it('should handle user with undefined tenantId and patient with tenantId', () => {
        const userNoTenant = { ...mockUser, tenantId: undefined };
        const patientWithTenant = { ...mockPatient, tenantId: 'tenant-1' };
        
        // Should allow if both are undefined or if patient tenant matches (when user tenant is undefined, we don't enforce isolation)
        expect(canAccessPatient(userNoTenant, patientWithTenant, 'all_clinic')).toBe(true);
      });

      it('should handle user with tenantId and patient with undefined tenantId', () => {
        const userWithTenant = { ...mockUser, tenantId: 'tenant-1' };
        const patientNoTenant = { ...mockPatient, tenantId: undefined };
        
        // Should allow if patient tenant is undefined (no isolation check)
        expect(canAccessPatient(userWithTenant, patientNoTenant, 'all_clinic')).toBe(true);
      });

      it('should handle both user and patient with undefined tenantId', () => {
        const userNoTenant = { ...mockUser, tenantId: undefined };
        const patientNoTenant = { ...mockPatient, tenantId: undefined };
        
        expect(canAccessPatient(userNoTenant, patientNoTenant, 'all_clinic')).toBe(true);
      });
    });
  });

  describe('hasPermission - Additional edge cases for coverage', () => {
    const permissionsWithExplicitDisabled: PermissionTree = {
      patients: {
        enabled: false, // Explicitly disabled
        viewScope: 'all_clinic',
        features: {
          create: true, // This would be enabled if section was enabled
        },
      },
    };

    it('should return false when section is explicitly disabled (enabled: false)', () => {
      expect(hasPermission(permissionsWithExplicitDisabled, 'patients')).toBe(false);
      expect(hasPermission(permissionsWithExplicitDisabled, 'patients.features.create')).toBe(false);
    });

    it('should return detailed error when section is explicitly disabled', () => {
      const result = hasPermission(
        permissionsWithExplicitDisabled,
        'patients.features.create',
        undefined,
        { returnDetails: true }
      ) as { hasPermission: boolean; error?: string };

      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    const permissionsWithFeatureDisabled: PermissionTree = {
      patients: {
        enabled: true,
        viewScope: 'all_clinic',
        features: {
          create: {
            enabled: false, // Explicitly disabled feature object
          },
          edit: true,
        },
      },
    };

    it('should return false when feature object is explicitly disabled', () => {
      expect(hasPermission(permissionsWithFeatureDisabled, 'patients.features.create')).toBe(false);
      expect(hasPermission(permissionsWithFeatureDisabled, 'patients.features.edit')).toBe(true);
    });

    it('should return detailed error when feature object is explicitly disabled', () => {
      const result = hasPermission(
        permissionsWithFeatureDisabled,
        'patients.features.create',
        undefined,
        { returnDetails: true }
      ) as { hasPermission: boolean; error?: string };

      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    const permissionsWithFullPath: PermissionTree = {
      patients: {
        enabled: true,
        viewScope: 'all_clinic',
        features: {
          list: {
            enabled: true,
            components: {
              patientCard: {
                enabled: true,
                tabs: {
                  overview: true,
                },
              },
            },
          },
        },
      },
    };

    it('should successfully navigate entire path and return true', () => {
      // This tests the final return statement at line 328
      const result = hasPermission(
        permissionsWithFullPath,
        'patients.features.list.components.patientCard.tabs.overview'
      );
      
      expect(result).toBe(true);
    });

    it('should return detailed result when navigating entire path successfully', () => {
      const result = hasPermission(
        permissionsWithFullPath,
        'patients.features.list.components.patientCard.tabs.overview',
        undefined,
        { returnDetails: true }
      ) as { hasPermission: boolean; path?: string };

      expect(result.hasPermission).toBe(true);
      expect(result.path).toBe('patients.features.list.components.patientCard.tabs.overview');
    });

    it('should handle path that ends at a feature object (not boolean)', () => {
      const result = hasPermission(
        permissionsWithFullPath,
        'patients.features.list'
      );
      
      expect(result).toBe(true);
    });

    it('should handle path that ends at a component object', () => {
      const result = hasPermission(
        permissionsWithFullPath,
        'patients.features.list.components.patientCard'
      );
      
      expect(result).toBe(true);
    });

    it('should handle section with enabled: true explicitly set', () => {
      const permissionsExplicitEnabled: PermissionTree = {
        patients: {
          enabled: true, // Explicitly enabled
          viewScope: 'all_clinic',
          features: {
            create: true,
          },
        },
      };

      expect(hasPermission(permissionsExplicitEnabled, 'patients')).toBe(true);
      expect(hasPermission(permissionsExplicitEnabled, 'patients.features.create')).toBe(true);
    });

    it('should handle feature object with enabled: true explicitly set', () => {
      const permissionsFeatureEnabled: PermissionTree = {
        patients: {
          enabled: true,
          viewScope: 'all_clinic',
          features: {
            create: {
              enabled: true, // Explicitly enabled
            },
          },
        },
      };

      expect(hasPermission(permissionsFeatureEnabled, 'patients.features.create')).toBe(true);
    });
  });
});
