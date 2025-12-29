import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getFullAccessPermissionTree, getProviderPermissionTree } from "../../src/lib/permissions/validation";

describe("Role Migration Logic", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Admin to Clinic User Conversion", () => {
    it("should migrate admin user to clinic_user with isOwner=true", async () => {
      // Create an admin user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Verify initial state
      const userBefore = await t.query(api.users.getUser, { id: userId });
      expect(userBefore?.role).toBe("admin");
      expect(userBefore?.isOwner).toBeUndefined();

      // Migrate the user
      const result = await t.action(api.users.migrateAdminUser, {
        userId,
      });

      // Verify migration result
      expect(result.success).toBe(true);
      expect(result.oldRole).toBe("admin");
      expect(result.newRole).toBe("clinic_user");
      expect(result.isOwner).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.email).toBe("admin@example.com");

      // Verify user was updated in database
      const userAfter = await t.query(api.users.getUser, { id: userId });
      expect(userAfter?.role).toBe("clinic_user");
      expect(userAfter?.isOwner).toBe(true);
      expect(userAfter?.updatedAt).toBeGreaterThan(now);
    });

    it("should be idempotent - already migrated admin user should return success", async () => {
      // Create and migrate an admin user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin2@example.com",
        name: "Admin User 2",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // First migration
      const result1 = await t.action(api.users.migrateAdminUser, {
        userId,
      });
      expect(result1.success).toBe(true);

      // Second migration (idempotent check)
      const result2 = await t.action(api.users.migrateAdminUser, {
        userId,
      });
      expect(result2.success).toBe(true);
      expect(result2.message).toContain("already migrated");
      expect(result2.oldRole).toBe("clinic_user"); // Old role is now clinic_user
      expect(result2.newRole).toBe("clinic_user");
      expect(result2.isOwner).toBe(true);

      // Verify user state unchanged
      const user = await t.query(api.users.getUser, { id: userId });
      expect(user?.role).toBe("clinic_user");
      expect(user?.isOwner).toBe(true);
    });

    it("should throw error when user not found", async () => {
      const fakeUserId = "j0000000000000000000000" as Id<"users">;

      await expect(
        t.action(api.users.migrateAdminUser, {
          userId: fakeUserId,
        })
      ).rejects.toThrow("User with ID");
    });

    it("should throw error when user is not an admin", async () => {
      // Create a provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await expect(
        t.action(api.users.migrateAdminUser, {
          userId,
        })
      ).rejects.toThrow("is not an admin");
    });

    it("should throw error when user is already clinic_user but not owner", async () => {
      // Create a clinic_user without isOwner flag
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Set isOwner to false explicitly (via direct mutation)
      await t.mutation(api.users.migrateAdminUserMutation, {
        userId,
        role: "clinic_user",
        isOwner: false,
      });

      // Try to migrate - should fail because user is not admin
      await expect(
        t.action(api.users.migrateAdminUser, {
          userId,
        })
      ).rejects.toThrow("is not an admin");
    });

    it("should handle admin user with isOwner already set to true", async () => {
      // Create an admin user with isOwner already set (edge case)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin3@example.com",
        name: "Admin User 3",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Set isOwner to true before migration (unusual but possible)
      await t.mutation(api.users.migrateAdminUserMutation, {
        userId,
        role: "admin", // Still admin
        isOwner: true,
      });

      // Migrate - should succeed
      const result = await t.action(api.users.migrateAdminUser, {
        userId,
      });

      expect(result.success).toBe(true);
      expect(result.newRole).toBe("clinic_user");
      expect(result.isOwner).toBe(true);
    });
  });

  describe("Provider to Clinic User Conversion", () => {
    it("should migrate provider user to clinic_user with isOwner=false", async () => {
      // Create a provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Verify initial state
      const userBefore = await t.query(api.users.getUser, { id: userId });
      expect(userBefore?.role).toBe("provider");
      expect(userBefore?.isOwner).toBeUndefined();

      // Migrate the user
      const result = await t.action(api.users.migrateProviderUser, {
        userId,
      });

      // Verify migration result
      expect(result.success).toBe(true);
      expect(result.oldRole).toBe("provider");
      expect(result.newRole).toBe("clinic_user");
      expect(result.isOwner).toBe(false);
      expect(result.userId).toBe(userId);
      expect(result.email).toBe("provider@example.com");

      // Verify user was updated in database
      const userAfter = await t.query(api.users.getUser, { id: userId });
      expect(userAfter?.role).toBe("clinic_user");
      expect(userAfter?.isOwner).toBe(false);
      expect(userAfter?.updatedAt).toBeGreaterThan(now);
    });

    it("should be idempotent - already migrated provider user should return success", async () => {
      // Create and migrate a provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider2@example.com",
        name: "Provider User 2",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // First migration
      const result1 = await t.action(api.users.migrateProviderUser, {
        userId,
      });
      expect(result1.success).toBe(true);

      // Second migration (idempotent check)
      const result2 = await t.action(api.users.migrateProviderUser, {
        userId,
      });
      expect(result2.success).toBe(true);
      expect(result2.message).toContain("already migrated");
      expect(result2.oldRole).toBe("clinic_user"); // Old role is now clinic_user
      expect(result2.newRole).toBe("clinic_user");
      expect(result2.isOwner).toBe(false);

      // Verify user state unchanged
      const user = await t.query(api.users.getUser, { id: userId });
      expect(user?.role).toBe("clinic_user");
      expect(user?.isOwner).toBe(false);
    });

    it("should throw error when user not found", async () => {
      const fakeUserId = "j0000000000000000000000" as Id<"users">;

      await expect(
        t.action(api.users.migrateProviderUser, {
          userId: fakeUserId,
        })
      ).rejects.toThrow("User with ID");
    });

    it("should throw error when user is not a provider", async () => {
      // Create an admin user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await expect(
        t.action(api.users.migrateProviderUser, {
          userId,
        })
      ).rejects.toThrow("is not a provider");
    });

    it("should throw error when user is already clinic_user but is owner", async () => {
      // Create a clinic_user with isOwner=true
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Set isOwner to true explicitly
      await t.mutation(api.users.migrateAdminUserMutation, {
        userId,
        role: "clinic_user",
        isOwner: true,
      });

      // Try to migrate - should fail because user is not provider
      await expect(
        t.action(api.users.migrateProviderUser, {
          userId,
        })
      ).rejects.toThrow("is not a provider");
    });
  });

  describe("Get Admin Users Query", () => {
    it("should return all admin users", async () => {
      // Create multiple users with different roles
      const now = Date.now();
      const adminUserId1 = await t.mutation(api.users.createUserMutation, {
        email: "admin1@example.com",
        name: "Admin 1",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const adminUserId2 = await t.mutation(api.users.createUserMutation, {
        email: "admin2@example.com",
        name: "Admin 2",
        role: "admin",
        tenantId: "test-tenant-2",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const providerUserId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Query all admin users
      const adminUsers = await t.query(api.users.getAdminUsers, {});

      expect(adminUsers.length).toBe(2);
      expect(adminUsers.map((u) => u._id)).toContain(adminUserId1);
      expect(adminUsers.map((u) => u._id)).toContain(adminUserId2);
      expect(adminUsers.map((u) => u._id)).not.toContain(providerUserId);
      adminUsers.forEach((user) => {
        expect(user.role).toBe("admin");
        expect(user.isActive).toBe(true);
      });
    });

    it("should filter admin users by tenant", async () => {
      // Create admin users in different tenants
      const now = Date.now();
      const adminUserId1 = await t.mutation(api.users.createUserMutation, {
        email: "admin1@example.com",
        name: "Admin 1",
        role: "admin",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.mutation(api.users.createUserMutation, {
        email: "admin2@example.com",
        name: "Admin 2",
        role: "admin",
        tenantId: "tenant-2",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Query admin users for tenant-1
      const adminUsers = await t.query(api.users.getAdminUsers, {
        tenantId: "tenant-1",
      });

      expect(adminUsers.length).toBe(1);
      expect(adminUsers[0]._id).toBe(adminUserId1);
      expect(adminUsers[0].tenantId).toBe("tenant-1");
    });

    it("should not return inactive admin users", async () => {
      // Create active and inactive admin users
      const now = Date.now();
      const activeAdminUserId = await t.mutation(api.users.createUserMutation, {
        email: "active@example.com",
        name: "Active Admin",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.mutation(api.users.createUserMutation, {
        email: "inactive@example.com",
        name: "Inactive Admin",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      // Query admin users
      const adminUsers = await t.query(api.users.getAdminUsers, {});

      expect(adminUsers.length).toBe(1);
      expect(adminUsers[0]._id).toBe(activeAdminUserId);
      expect(adminUsers[0].isActive).toBe(true);
    });
  });

  describe("Get Provider Users Query", () => {
    it("should return all provider users", async () => {
      // Create multiple users with different roles
      const now = Date.now();
      const providerUserId1 = await t.mutation(api.users.createUserMutation, {
        email: "provider1@example.com",
        name: "Provider 1",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const providerUserId2 = await t.mutation(api.users.createUserMutation, {
        email: "provider2@example.com",
        name: "Provider 2",
        role: "provider",
        tenantId: "test-tenant-2",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const adminUserId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Query all provider users
      const providerUsers = await t.query(api.users.getProviderUsers, {});

      expect(providerUsers.length).toBe(2);
      expect(providerUsers.map((u) => u._id)).toContain(providerUserId1);
      expect(providerUsers.map((u) => u._id)).toContain(providerUserId2);
      expect(providerUsers.map((u) => u._id)).not.toContain(adminUserId);
      providerUsers.forEach((user) => {
        expect(user.role).toBe("provider");
        expect(user.isActive).toBe(true);
      });
    });

    it("should filter provider users by tenant", async () => {
      // Create provider users in different tenants
      const now = Date.now();
      const providerUserId1 = await t.mutation(api.users.createUserMutation, {
        email: "provider1@example.com",
        name: "Provider 1",
        role: "provider",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.mutation(api.users.createUserMutation, {
        email: "provider2@example.com",
        name: "Provider 2",
        role: "provider",
        tenantId: "tenant-2",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Query provider users for tenant-1
      const providerUsers = await t.query(api.users.getProviderUsers, {
        tenantId: "tenant-1",
      });

      expect(providerUsers.length).toBe(1);
      expect(providerUsers[0]._id).toBe(providerUserId1);
      expect(providerUsers[0].tenantId).toBe("tenant-1");
    });

    it("should not return inactive provider users", async () => {
      // Create active and inactive provider users
      const now = Date.now();
      const activeProviderUserId = await t.mutation(api.users.createUserMutation, {
        email: "active@example.com",
        name: "Active Provider",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.mutation(api.users.createUserMutation, {
        email: "inactive@example.com",
        name: "Inactive Provider",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      // Query provider users
      const providerUsers = await t.query(api.users.getProviderUsers, {});

      expect(providerUsers.length).toBe(1);
      expect(providerUsers[0]._id).toBe(activeProviderUserId);
      expect(providerUsers[0].isActive).toBe(true);
    });
  });

  describe("Permission Assignment via Role Creation", () => {
    it("should create Owner role with full access permissions", async () => {
      const now = Date.now();
      const fullAccessPermissions = getFullAccessPermissionTree();

      const roleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId,
        name: "Owner",
        description: "Full access role for clinic owners",
        permissions: fullAccessPermissions,
        isTemplate: true,
        createdAt: now,
        updatedAt: now,
      });

      const role = await t.query(api.customRoles.getCustomRole, {
        roleId,
      });

      expect(role).toBeDefined();
      expect(role?.name).toBe("Owner");
      expect(role?.tenantId).toBe(tenantId);
      expect(role?.isTemplate).toBe(true);
      expect(role?.permissions).toEqual(fullAccessPermissions);
    });

    it("should create Provider role with provider-level permissions", async () => {
      const now = Date.now();
      const providerPermissions = getProviderPermissionTree();

      const roleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId,
        name: "Provider",
        description: "Provider-level access role",
        permissions: providerPermissions,
        isTemplate: true,
        createdAt: now,
        updatedAt: now,
      });

      const role = await t.query(api.customRoles.getCustomRole, {
        roleId,
      });

      expect(role).toBeDefined();
      expect(role?.name).toBe("Provider");
      expect(role?.tenantId).toBe(tenantId);
      expect(role?.isTemplate).toBe(true);
      expect(role?.permissions).toEqual(providerPermissions);
    });

    it("should assign custom role to migrated admin user", async () => {
      // Create admin user and migrate
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.action(api.users.migrateAdminUser, { userId });

      // Create Owner role
      const roleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId,
        name: "Owner",
        description: "Full access role",
        permissions: getFullAccessPermissionTree(),
        isTemplate: true,
        createdAt: now,
        updatedAt: now,
      });

      // Assign role to user
      await t.mutation(api.users.assignCustomRoleToUser, {
        userId,
        customRoleId: roleId,
      });

      // Verify role assignment
      const user = await t.query(api.users.getUser, { id: userId });
      expect(user?.customRoleId).toBe(roleId);
      expect(user?.role).toBe("clinic_user");
      expect(user?.isOwner).toBe(true);
    });

    it("should assign custom role to migrated provider user", async () => {
      // Create provider user and migrate
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await t.action(api.users.migrateProviderUser, { userId });

      // Create Provider role
      const roleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId,
        name: "Provider",
        description: "Provider-level access role",
        permissions: getProviderPermissionTree(),
        isTemplate: true,
        createdAt: now,
        updatedAt: now,
      });

      // Assign role to user
      await t.mutation(api.users.assignCustomRoleToUser, {
        userId,
        customRoleId: roleId,
      });

      // Verify role assignment
      const user = await t.query(api.users.getUser, { id: userId });
      expect(user?.customRoleId).toBe(roleId);
      expect(user?.role).toBe("clinic_user");
      expect(user?.isOwner).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle migration of non-existent user gracefully", async () => {
      const fakeUserId = "j0000000000000000000000" as Id<"users">;

      await expect(
        t.action(api.users.migrateAdminUser, {
          userId: fakeUserId,
        })
      ).rejects.toThrow();

      await expect(
        t.action(api.users.migrateProviderUser, {
          userId: fakeUserId,
        })
      ).rejects.toThrow();
    });

    it("should handle migration of wrong role type gracefully", async () => {
      // Create a clinic_user directly (not admin or provider)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Try to migrate as admin - should fail
      await expect(
        t.action(api.users.migrateAdminUser, {
          userId,
        })
      ).rejects.toThrow("is not an admin");

      // Try to migrate as provider - should fail
      await expect(
        t.action(api.users.migrateProviderUser, {
          userId,
        })
      ).rejects.toThrow("is not a provider");
    });

    it("should handle role assignment to non-existent user", async () => {
      const fakeUserId = "j0000000000000000000000" as Id<"users">;
      const fakeRoleId = "j0000000000000000000001" as Id<"customRoles">;

      // This will fail at the database level (user not found)
      await expect(
        t.mutation(api.users.assignCustomRoleToUser, {
          userId: fakeUserId,
          customRoleId: fakeRoleId,
        })
      ).rejects.toThrow();
    });
  });

  describe("Idempotency", () => {
    it("should allow multiple migrations of same admin user without side effects", async () => {
      // Create admin user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // First migration
      const result1 = await t.action(api.users.migrateAdminUser, { userId });
      const user1 = await t.query(api.users.getUser, { id: userId });
      const updatedAt1 = user1?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second migration (should be idempotent)
      const result2 = await t.action(api.users.migrateAdminUser, { userId });
      const user2 = await t.query(api.users.getUser, { id: userId });

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // User state should be consistent
      expect(user2?.role).toBe("clinic_user");
      expect(user2?.isOwner).toBe(true);

      // Second migration should indicate already migrated
      expect(result2.message).toContain("already migrated");
    });

    it("should allow multiple migrations of same provider user without side effects", async () => {
      // Create provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // First migration
      const result1 = await t.action(api.users.migrateProviderUser, { userId });
      const user1 = await t.query(api.users.getUser, { id: userId });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second migration (should be idempotent)
      const result2 = await t.action(api.users.migrateProviderUser, { userId });
      const user2 = await t.query(api.users.getUser, { id: userId });

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // User state should be consistent
      expect(user2?.role).toBe("clinic_user");
      expect(user2?.isOwner).toBe(false);

      // Second migration should indicate already migrated
      expect(result2.message).toContain("already migrated");
    });

    it("should allow role creation to be idempotent (check before create)", async () => {
      const now = Date.now();
      const permissions = getFullAccessPermissionTree();

      // Create role first time
      const roleId1 = await t.mutation(api.customRoles.createCustomRole, {
        tenantId,
        name: "Owner",
        description: "Full access role",
        permissions,
        isTemplate: true,
        createdAt: now,
        updatedAt: now,
      });

      // Try to create same role again (should create new one, but migration script checks first)
      // In real migration, script checks if role exists before creating
      const existingRole = await t.query(api.customRoles.findCustomRoleByName, {
        tenantId,
        name: "Owner",
      });

      expect(existingRole).toBeDefined();
      expect(existingRole?._id).toBe(roleId1);
    });
  });
});

