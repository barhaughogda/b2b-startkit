import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PermissionTree } from '@/types';
import { canAccessPatient, getUserDepartments } from '@/lib/auth-utils';
import type { User } from '@/types';

/**
 * Integration tests for department-based filtering and access control
 * 
 * Tests the complete department system including:
 * - Department assignment
 * - View scope filtering
 * - Multi-department users
 * - Patient access by department
 */

describe('Department-Based Filtering', () => {
  let t: ConvexTestingHelper;
  let testTenantId: string;
  let ownerUserId: Id<'users'>;
  let ownerEmail: string;
  let dept1Id: Id<'departments'>;
  let dept2Id: Id<'departments'>;
  let dept3Id: Id<'departments'>;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
    
    // Create test tenant
    testTenantId = 'test-tenant-dept-filtering';
    
    // Create owner user for authorization
    ownerEmail = 'owner@test.com';
    ownerUserId = await t.mutation(api.users.createUserMutation, {
      email: ownerEmail,
      name: 'Test Owner',
      role: 'clinic_user',
      passwordHash: 'hashed-password',
      isActive: true,
      tenantId: testTenantId,
      isOwner: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create test departments
    dept1Id = await t.mutation(api.departments.createDepartment, {
      tenantId: testTenantId,
      name: 'Cardiology',
      description: 'Cardiology department',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    dept2Id = await t.mutation(api.departments.createDepartment, {
      tenantId: testTenantId,
      name: 'Pediatrics',
      description: 'Pediatrics department',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    dept3Id = await t.mutation(api.departments.createDepartment, {
      tenantId: testTenantId,
      name: 'Orthopedics',
      description: 'Orthopedics department',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe('Department assignment', () => {
    it('should assign user to a single department', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user1@test.com',
        name: 'User One',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Assign user to department via low-level mutation
      const result = await t.mutation(api.departments.assignUserToDepartment, {
        userId,
        departmentId: dept1Id as string, // Convert to string for user.departments array
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.departmentId).toBe(dept1Id as string);

      // Verify user was assigned
      const user = await t.query(api.users.getUserById, { userId });
      expect(user?.departments).toBeDefined();
      expect(user?.departments).toContain(dept1Id as string);
      expect(user?.departments?.length).toBe(1);
    });

    it('should assign user to multiple departments', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user2@test.com',
        name: 'User Two',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Assign user to first department
      await t.mutation(api.departments.assignUserToDepartment, {
        userId,
        departmentId: dept1Id as string,
      });

      // Assign user to second department
      await t.mutation(api.departments.assignUserToDepartment, {
        userId,
        departmentId: dept2Id as string,
      });

      // Verify user was assigned to both departments
      const user = await t.query(api.users.getUserById, { userId });
      expect(user?.departments).toBeDefined();
      expect(user?.departments?.length).toBe(2);
      expect(user?.departments).toContain(dept1Id as string);
      expect(user?.departments).toContain(dept2Id as string);
    });

    it('should be idempotent when assigning user to same department', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user3@test.com',
        name: 'User Three',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Assign user to department first time
      const result1 = await t.mutation(api.departments.assignUserToDepartment, {
        userId,
        departmentId: dept1Id as string,
      });
      expect(result1.success).toBe(true);

      // Assign user to same department again (should be idempotent)
      const result2 = await t.mutation(api.departments.assignUserToDepartment, {
        userId,
        departmentId: dept1Id as string,
      });
      expect(result2.success).toBe(true);
      expect(result2.message).toContain('already assigned');

      // Verify user still has only one department assignment
      const user = await t.query(api.users.getUserById, { userId });
      expect(user?.departments?.length).toBe(1);
      expect(user?.departments).toContain(dept1Id as string);
    });

    it('should assign user to department via owner action', async () => {
      // Create clinic user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user4@test.com',
        name: 'User Four',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Assign user to department via owner action
      const result = await t.action(api.clinic.departments.assignUserToDepartment, {
        tenantId: testTenantId,
        userEmail: ownerEmail,
        userId,
        departmentId: dept1Id,
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.departmentId).toBe(dept1Id);

      // Verify user was assigned
      const user = await t.query(api.users.getUserById, { userId });
      expect(user?.departments).toContain(dept1Id as string);

      // Verify audit log was created
      const auditLogsResult = await t.query(api.auditLogs.getAuditLogs, {
        tenantId: testTenantId,
        action: 'user_department_assigned',
        limit: 10,
      });
      const assignmentLog = auditLogsResult.logs.find(
        (log) => log.resourceId === userId
      );
      expect(assignmentLog).toBeDefined();
      expect(assignmentLog?.details).toHaveProperty('departmentId');
      expect(assignmentLog?.details).toHaveProperty('previousDepartments');
      expect(assignmentLog?.details).toHaveProperty('newDepartments');
    });

    it('should remove user from department', async () => {
      // Create clinic user with department assignment
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user5@test.com',
        name: 'User Five',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string, dept2Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Remove user from first department
      const result = await t.mutation(api.departments.removeUserFromDepartment, {
        userId,
        departmentId: dept1Id as string,
      });

      expect(result.success).toBe(true);

      // Verify user was removed from first department but still in second
      const user = await t.query(api.users.getUserById, { userId });
      expect(user?.departments).not.toContain(dept1Id as string);
      expect(user?.departments).toContain(dept2Id as string);
      expect(user?.departments?.length).toBe(1);
    });
  });

  describe('View scope filtering', () => {
    it('should allow access with all_clinic view scope regardless of department', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user6@test.com',
        name: 'User Six',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in different department
      const patient = {
        id: 'patient-1',
        tenantId: testTenantId,
        department: dept2Id as string, // Different department
      };

      // Should allow access with all_clinic scope
      const result = canAccessPatient(userObj, patient, 'all_clinic');
      expect(result).toBe(true);
    });

    it('should allow access with department view scope when departments match', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user7@test.com',
        name: 'User Seven',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in same department
      const patient = {
        id: 'patient-2',
        tenantId: testTenantId,
        department: dept1Id as string, // Same department
      };

      // Should allow access with department scope
      const result = canAccessPatient(userObj, patient, 'department');
      expect(result).toBe(true);
    });

    it('should deny access with department view scope when departments do not match', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user8@test.com',
        name: 'User Eight',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in different department
      const patient = {
        id: 'patient-3',
        tenantId: testTenantId,
        department: dept2Id as string, // Different department
      };

      // Should deny access with department scope
      const result = canAccessPatient(userObj, patient, 'department');
      expect(result).toBe(false);
    });

    it('should deny access with department view scope when user has no departments', async () => {
      // Create user without departments
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user9@test.com',
        name: 'User Nine',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient with department
      const patient = {
        id: 'patient-4',
        tenantId: testTenantId,
        department: dept1Id as string,
      };

      // Should deny access with department scope
      const result = canAccessPatient(userObj, patient, 'department');
      expect(result).toBe(false);
    });

    it('should deny access with department view scope when patient has no department', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user10@test.com',
        name: 'User Ten',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient without department
      const patient = {
        id: 'patient-5',
        tenantId: testTenantId,
        department: undefined,
      };

      // Should deny access with department scope
      const result = canAccessPatient(userObj, patient, 'department');
      expect(result).toBe(false);
    });
  });

  describe('Multi-department users', () => {
    it('should allow access when patient department matches any user department', async () => {
      // Create user in multiple departments
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user11@test.com',
        name: 'User Eleven',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string, dept2Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in first department
      const patient1 = {
        id: 'patient-6',
        tenantId: testTenantId,
        department: dept1Id as string,
      };

      // Patient in second department
      const patient2 = {
        id: 'patient-7',
        tenantId: testTenantId,
        department: dept2Id as string,
      };

      // Patient in third department (not assigned to user)
      const patient3 = {
        id: 'patient-8',
        tenantId: testTenantId,
        department: dept3Id as string,
      };

      // Should allow access to patients in first department
      expect(canAccessPatient(userObj, patient1, 'department')).toBe(true);

      // Should allow access to patients in second department
      expect(canAccessPatient(userObj, patient2, 'department')).toBe(true);

      // Should deny access to patients in third department
      expect(canAccessPatient(userObj, patient3, 'department')).toBe(false);
    });

    it('should return detailed results for multi-department users', async () => {
      // Create user in multiple departments
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user12@test.com',
        name: 'User Twelve',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string, dept2Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in first department
      const patient = {
        id: 'patient-9',
        tenantId: testTenantId,
        department: dept1Id as string,
      };

      // Get detailed result
      const result = canAccessPatient(userObj, patient, 'department', {
        returnDetails: true,
      });

      expect(result).toHaveProperty('canAccess');
      expect(result).toHaveProperty('reason');
      expect((result as any).canAccess).toBe(true);
      expect((result as any).reason).toContain('matches user departments');
    });

    it('should handle getUserDepartments for multi-department users', async () => {
      // Create user in multiple departments
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user13@test.com',
        name: 'User Thirteen',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string, dept2Id as string, dept3Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Get user departments
      const departments = getUserDepartments(userObj);
      expect(departments.length).toBe(3);
      expect(departments).toContain(dept1Id as string);
      expect(departments).toContain(dept2Id as string);
      expect(departments).toContain(dept3Id as string);
    });
  });

  describe('Patient access by department', () => {
    it('should allow owner access regardless of department', async () => {
      // Create owner user
      const ownerUser = await t.query(api.users.getUserById, { userId: ownerUserId });
      const ownerObj: User = {
        id: ownerUser!._id,
        email: ownerUser!.email,
        name: ownerUser!.name,
        role: ownerUser!.role,
        tenantId: ownerUser!.tenantId,
        departments: ownerUser!.departments,
        isOwner: ownerUser!.isOwner,
      };

      // Patient in any department
      const patient = {
        id: 'patient-10',
        tenantId: testTenantId,
        department: dept1Id as string,
      };

      // Owner should have access with any view scope
      expect(canAccessPatient(ownerObj, patient, 'department')).toBe(true);
      expect(canAccessPatient(ownerObj, patient, 'all_clinic')).toBe(true);
    });

    it('should filter patients by department when user has department scope', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user14@test.com',
        name: 'User Fourteen',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Create multiple patients in different departments
      const patients = [
        { id: 'patient-11', tenantId: testTenantId, department: dept1Id as string }, // Same department
        { id: 'patient-12', tenantId: testTenantId, department: dept2Id as string }, // Different department
        { id: 'patient-13', tenantId: testTenantId, department: dept3Id as string }, // Different department
      ];

      // Filter patients user can access
      const accessiblePatients = patients.filter((patient) =>
        canAccessPatient(userObj, patient, 'department')
      );

      expect(accessiblePatients.length).toBe(1);
      expect(accessiblePatients[0].id).toBe('patient-11');
      expect(accessiblePatients[0].department).toBe(dept1Id as string);
    });

    it('should allow access to patients in any department when user has all_clinic scope', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user15@test.com',
        name: 'User Fifteen',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Create multiple patients in different departments
      const patients = [
        { id: 'patient-14', tenantId: testTenantId, department: dept1Id as string },
        { id: 'patient-15', tenantId: testTenantId, department: dept2Id as string },
        { id: 'patient-16', tenantId: testTenantId, department: dept3Id as string },
      ];

      // Filter patients user can access with all_clinic scope
      const accessiblePatients = patients.filter((patient) =>
        canAccessPatient(userObj, patient, 'all_clinic')
      );

      // Should have access to all patients in same tenant
      expect(accessiblePatients.length).toBe(3);
    });

    it('should enforce tenant isolation in department-based access', async () => {
      // Create user in department 1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user16@test.com',
        name: 'User Sixteen',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Patient in same department but different tenant
      const patient = {
        id: 'patient-17',
        tenantId: 'different-tenant', // Different tenant
        department: dept1Id as string, // Same department ID but different tenant
      };

      // Should deny access due to tenant isolation
      const result = canAccessPatient(userObj, patient, 'department');
      expect(result).toBe(false);

      // Get detailed result
      const detailedResult = canAccessPatient(userObj, patient, 'department', {
        returnDetails: true,
      });
      expect((detailedResult as any).canAccess).toBe(false);
      expect((detailedResult as any).reason).toContain('different tenant');
    });
  });

  describe('Integration with custom roles and permissions', () => {
    it('should work with custom role that has department view scope', async () => {
      // Create custom role with department view scope
      const customRolePermissions: PermissionTree = {
        patients: {
          enabled: true,
          viewScope: 'department',
          features: {
            list: { enabled: true },
            view: true,
          },
        },
      };

      const customRoleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId: testTenantId,
        name: 'Department Restricted Role',
        description: 'Role with department view scope',
        permissions: customRolePermissions,
        isTemplate: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create user with custom role and department assignment
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'user17@test.com',
        name: 'User Seventeen',
        role: 'clinic_user',
        passwordHash: 'hashed-password',
        isActive: true,
        tenantId: testTenantId,
        isOwner: false,
        departments: [dept1Id as string],
        customRoleId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const user = await t.query(api.users.getUserById, { userId });
      const userObj: User = {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId,
        departments: user!.departments,
        isOwner: user!.isOwner,
      };

      // Get user permissions
      const permissions = await t.query(api.clinic.permissions.getUserPermissions, {
        tenantId: testTenantId,
        userEmail: ownerEmail, // Owner email for authorization
        targetUserId: userId, // ID of user whose permissions to retrieve
      });

      expect(permissions.patients?.viewScope).toBe('department');

      // Patient in same department
      const patient1 = {
        id: 'patient-18',
        tenantId: testTenantId,
        department: dept1Id as string,
      };

      // Patient in different department
      const patient2 = {
        id: 'patient-19',
        tenantId: testTenantId,
        department: dept2Id as string,
      };

      // Should allow access to patient in same department
      expect(canAccessPatient(userObj, patient1, 'department')).toBe(true);

      // Should deny access to patient in different department
      expect(canAccessPatient(userObj, patient2, 'department')).toBe(false);
    });
  });
});

