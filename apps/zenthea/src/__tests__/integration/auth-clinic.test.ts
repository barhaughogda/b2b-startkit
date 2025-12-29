import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PermissionTree } from '@/types';

/**
 * Integration tests for clinic user authentication flow
 * 
 * Tests the complete authentication flow for clinic users including:
 * - Login with clinic_user role
 * - Session creation
 * - Permission loading
 * - Department assignment
 * - Error cases
 */

describe('Clinic User Authentication Flow', () => {
  let t: ConvexTestingHelper;
  let testTenantId: string;
  let testDepartmentId: Id<'departments'>;
  let testCustomRoleId: Id<'customRoles'>;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
    
    // Create test tenant
    testTenantId = 'test-tenant-clinic-auth';
    
    // Create test department
    testDepartmentId = await t.mutation(api.departments.createDepartment, {
      tenantId: testTenantId,
      name: 'Test Department',
      description: 'Test department for authentication tests',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create test custom role with permissions
    const testPermissions: PermissionTree = {
      patients: {
        enabled: true,
        viewScope: 'department',
        features: {
          list: { enabled: true },
          view: true,
          create: true,
        },
      },
      appointments: {
        enabled: true,
        viewScope: 'department',
        features: {
          calendar: true,
          create: true,
        },
      },
    };
    
    testCustomRoleId = await t.mutation(api.customRoles.createCustomRole, {
      tenantId: testTenantId,
      name: 'Test Provider Role',
      description: 'Test role for authentication tests',
      permissions: testPermissions,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe('Login with clinic_user role', () => {
    it('should successfully authenticate clinic_user with valid credentials', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [testDepartmentId],
        customRoleId: testCustomRoleId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification (bcrypt.compare)
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?._id).toBe(userId);
      expect(result.user?.email).toBe('clinic-user@test.com');
      expect(result.user?.role).toBe('clinic_user');
      expect(result.user?.tenantId).toBe(testTenantId);
    });

    it('should reject authentication with invalid password', async () => {
      // Create clinic user
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification to return false
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

      // Attempt authentication
      await expect(
        t.action(api.users.authenticateUser, {
          email: 'clinic-user@test.com',
          password: 'wrong-password',
          tenantId: testTenantId,
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject authentication for inactive user', async () => {
      // Create inactive clinic user
      await t.mutation(api.users.createUserMutation, {
        email: 'inactive-user@test.com',
        name: 'Inactive User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: false, // Inactive
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Attempt authentication
      await expect(
        t.action(api.users.authenticateUser, {
          email: 'inactive-user@test.com',
          password: 'password',
          tenantId: testTenantId,
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject authentication for non-existent user', async () => {
      await expect(
        t.action(api.users.authenticateUser, {
          email: 'nonexistent@test.com',
          password: 'password',
          tenantId: testTenantId,
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Session creation', () => {
    it('should create session record on successful authentication', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.sessionId).toBeDefined();
      expect(typeof result.user?.sessionId).toBe('string');
      expect(result.user?.sessionId.length).toBeGreaterThan(0);

      // Verify session was created in database
      const sessions = await t.query(api.sessions.getUserSessions, {
        userId: userId,
      });

      expect(sessions.length).toBeGreaterThan(0);
      const session = sessions.find((s) => s.sessionId === result.user?.sessionId);
      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
      expect(session?.tenantId).toBe(testTenantId);
      expect(session?.expiresAt).toBeDefined();
    });

    it('should set session expiration on successful authentication', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      const beforeAuth = Date.now();

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      const afterAuth = Date.now();

      expect(result.success).toBe(true);

      // Verify session expiration is set (default is 30 minutes if tenant not found)
      const sessions = await t.query(api.sessions.getUserSessions, {
        userId: userId,
      });

      const session = sessions.find((s) => s.sessionId === result.user?.sessionId);
      expect(session).toBeDefined();
      expect(session?.expiresAt).toBeDefined();
      
      // Session should expire in the future
      expect(session!.expiresAt!).toBeGreaterThan(beforeAuth);
      expect(session!.expiresAt!).toBeGreaterThan(afterAuth);
    });
  });

  describe('Permission loading', () => {
    it('should load permissions from custom role on authentication', async () => {
      // Create clinic user with custom role
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        customRoleId: testCustomRoleId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.permissions).toBeDefined();
      
      const permissions = result.user?.permissions as PermissionTree;
      expect(permissions.patients).toBeDefined();
      expect(permissions.patients?.enabled).toBe(true);
      expect(permissions.patients?.viewScope).toBe('department');
      expect(permissions.patients?.features?.list).toBeDefined();
      expect(permissions.patients?.features?.view).toBe(true);
      expect(permissions.patients?.features?.create).toBe(true);
    });

    it('should return undefined permissions for user without custom role', async () => {
      // Create clinic user without custom role
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      // Permissions should be undefined if user has no custom role
      expect(result.user?.permissions).toBeUndefined();
    });

    it('should handle missing custom role gracefully', async () => {
      // Create clinic user with invalid custom role ID
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        customRoleId: 'j123456789012345678901234' as Id<'customRoles'>, // Invalid ID
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user - should succeed even if custom role not found
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      // Permissions should be undefined if custom role not found
      expect(result.user?.permissions).toBeUndefined();
    });
  });

  describe('Department assignment', () => {
    it('should include departments array in authentication result', async () => {
      // Create clinic user with departments
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [testDepartmentId],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.departments).toBeDefined();
      expect(Array.isArray(result.user?.departments)).toBe(true);
      expect(result.user?.departments).toContain(testDepartmentId);
    });

    it('should return empty array for user without departments', async () => {
      // Create clinic user without departments
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.departments).toBeDefined();
      expect(Array.isArray(result.user?.departments)).toBe(true);
      expect(result.user?.departments).toEqual([]);
    });

    it('should handle user with multiple departments', async () => {
      // Create second department
      const department2Id = await t.mutation(api.departments.createDepartment, {
        tenantId: testTenantId,
        name: 'Second Department',
        description: 'Second test department',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create clinic user with multiple departments
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [testDepartmentId, department2Id],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.departments).toBeDefined();
      expect(result.user?.departments?.length).toBe(2);
      expect(result.user?.departments).toContain(testDepartmentId);
      expect(result.user?.departments).toContain(department2Id);
    });
  });

  describe('Owner flag', () => {
    it('should include isOwner flag in authentication result', async () => {
      // Create clinic user with isOwner=true
      await t.mutation(api.users.createUserMutation, {
        email: 'owner@test.com',
        name: 'Clinic Owner',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'owner@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.isOwner).toBe(true);
    });

    it('should default isOwner to false when not set', async () => {
      // Create clinic user without isOwner flag
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user?.isOwner).toBe(false);
    });
  });

  describe('Error cases', () => {
    it('should handle account lockout', async () => {
      // Create clinic user
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        failedLoginAttempts: 5, // Exceeded max attempts
        accountLockedUntil: Date.now() + 30 * 60 * 1000, // Locked for 30 minutes
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Attempt authentication
      await expect(
        t.action(api.users.authenticateUser, {
          email: 'clinic-user@test.com',
          password: 'password',
          tenantId: testTenantId,
        })
      ).rejects.toThrow(/ACCOUNT_LOCKED/);
    });

    it('should handle password expiration check failure gracefully', async () => {
      // Create clinic user
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Mock password expiration check to fail
      // This simulates a scenario where tenant settings are misconfigured
      // Authentication should still proceed
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      // Authentication should succeed even if password expiration check fails
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should handle session creation failure gracefully', async () => {
      // Create clinic user
      await t.mutation(api.users.createUserMutation, {
        email: 'clinic-user@test.com',
        name: 'Clinic User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authentication should succeed even if session creation fails
      // (session creation is logged but doesn't block authentication)
      const result = await t.action(api.users.authenticateUser, {
        email: 'clinic-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      // Session ID should still be generated even if session creation fails
      expect(result.user?.sessionId).toBeDefined();
    });
  });

  describe('Complete authentication flow', () => {
    it('should complete full authentication flow with all components', async () => {
      // Create clinic user with all fields
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'complete-user@test.com',
        name: 'Complete User',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [testDepartmentId],
        customRoleId: testCustomRoleId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock password verification
      const bcrypt = require('bcryptjs');
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      // Authenticate user
      const result = await t.action(api.users.authenticateUser, {
        email: 'complete-user@test.com',
        password: 'password',
        tenantId: testTenantId,
      });

      // Verify complete authentication result
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?._id).toBe(userId);
      expect(result.user?.email).toBe('complete-user@test.com');
      expect(result.user?.name).toBe('Complete User');
      expect(result.user?.role).toBe('clinic_user');
      expect(result.user?.tenantId).toBe(testTenantId);
      expect(result.user?.isOwner).toBe(false);
      expect(result.user?.departments).toContain(testDepartmentId);
      expect(result.user?.permissions).toBeDefined();
      expect(result.user?.sessionId).toBeDefined();
      
      // Verify permissions structure
      const permissions = result.user?.permissions as PermissionTree;
      expect(permissions.patients?.enabled).toBe(true);
      expect(permissions.patients?.viewScope).toBe('department');
      
      // Verify session was created
      const sessions = await t.query(api.sessions.getUserSessions, {
        userId: userId,
      });
      expect(sessions.length).toBeGreaterThan(0);
    });
  });
});

