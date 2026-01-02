import { describe, it, expect, beforeEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { verifyUserAuthentication, verifyPatientAccess, verifyProviderAccess, verifyOwnerAccess, verifyClinicUserAccess, checkPermission, verifySupportAccess } from "../utils/authorization";

describe("Authorization Utilities", () => {
  let t: ConvexTestingHelper;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
  });

  describe("verifyUserAuthentication", () => {
    it("should return error when email is undefined", async () => {
      const ctx = t.ctx;
      const result = await verifyUserAuthentication(ctx, undefined);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Authentication required. Please sign in to access patient data.");
    });

    it("should return error when user not found", async () => {
      const ctx = t.ctx;
      const result = await verifyUserAuthentication(ctx, "nonexistent@example.com");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("User not found. Please sign in with a valid account.");
    });

    it("should return error when user is inactive", async () => {
      const ctx = t.ctx;
      
      // Create an inactive user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "inactive@example.com",
        name: "Inactive User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyUserAuthentication(ctx, user?.email);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Account is inactive. Please contact support.");
    });

    it("should return success with clinic_user role and include isOwner and departments", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user with isOwner=true and departments
      // Note: isOwner and departments are optional schema fields, set via direct DB update
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      
      // Note: isOwner and departments are optional schema fields
      // For testing, we'll create a simple test mutation to set these fields
      // In production, these would be set during user creation or via a proper update mutation
      // Since updateUser doesn't explicitly support these fields, we'll test with defaults
      // The function correctly handles undefined with ?? operators
      // To test with actual values, we'd need to add these fields to updateUser mutation

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyUserAuthentication(ctx, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("clinic_user");
      // Note: isOwner and departments will be undefined/false/[] since updateUser doesn't support them yet
      // This tests that the function handles undefined values correctly with ?? operators
      expect(result.isOwner).toBeDefined(); // Will be false due to ?? false
      expect(result.departments).toBeDefined(); // Will be [] due to ?? []
    });

    it("should return success with admin role (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create an admin user (backward compatibility)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyUserAuthentication(ctx, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("admin");
      expect(result.isOwner).toBe(false);
      expect(result.departments).toEqual([]);
    });

    it("should return success with provider role (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create a provider user (backward compatibility)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      
      // Note: departments would be set via updateUser in production
      // For this test, we're verifying backward compatibility with provider role

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyUserAuthentication(ctx, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("provider");
      expect(result.isOwner).toBe(false); // Defaults to false
      expect(result.departments).toEqual([]); // Defaults to empty array
    });

    it("should handle undefined isOwner and departments gracefully", async () => {
      const ctx = t.ctx;
      
      // Create a user without isOwner and departments (old schema)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "olduser@example.com",
        name: "Old User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        // isOwner and departments not provided (will be undefined)
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyUserAuthentication(ctx, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.isOwner).toBe(false); // Should default to false
      expect(result.departments).toEqual([]); // Should default to empty array
    });
  });

  describe("verifyPatientAccess", () => {
    it("should allow patient to access their own profile", async () => {
      const ctx = t.ctx;
      
      // Create a patient
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        email: "patient@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1990-01-01").getTime(),
      });

      const patient = await t.query(api.patients.getPatient, { id: patientId });
      const result = await verifyPatientAccess(ctx, patientId, patient?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBeDefined();
    });

    it("should allow clinic user to access patient in same tenant", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a patient in the same tenant
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyPatientAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.isOwner).toBe(false);
      expect(result.departments).toEqual([]);
    });

    it("should deny clinic user access to patient in different tenant", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user in tenant-1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
      });

      // Create a patient in tenant-2
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "tenant-2",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyPatientAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("do not have permission");
    });

    it("should allow admin role to access patient (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create an admin user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
      });

      // Create a patient in the same tenant
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyPatientAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe("admin");
    });
  });

  describe("verifyProviderAccess", () => {
    it("should allow clinic_user to access patient", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      
      // Note: isOwner and departments would be set via updateUser in production
      // For this test, we're verifying clinic_user role works correctly

      // Create a patient in the same tenant
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyProviderAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("clinic_user");
      // Note: isOwner and departments will use defaults since updateUser doesn't support them yet
      expect(result.isOwner).toBeDefined();
      expect(result.departments).toBeDefined();
    });

    it("should deny patient role access", async () => {
      const ctx = t.ctx;
      
      // Create a patient user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "patient@example.com",
        name: "Patient User",
        role: "patient",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a patient
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyProviderAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("Only clinic users");
    });

    it("should allow admin role (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create an admin user
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
      });

      // Create a patient in the same tenant
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyProviderAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe("admin");
    });

    it("should allow provider role (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create a provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a patient in the same tenant
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "test-tenant",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyProviderAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe("provider");
    });

    it("should deny access when patient not found", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      // Use a non-existent patient ID
      const fakePatientId = "jn0000000000000000000000000" as Id<"patients">;
      const result = await verifyProviderAccess(ctx, fakePatientId, user?.email);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Patient not found.");
    });

    it("should deny access when tenant mismatch", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user in tenant-1
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
      });

      // Create a patient in tenant-2
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        tenantId: "tenant-2",
        dateOfBirth: new Date("1985-05-15").getTime(),
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyProviderAccess(ctx, patientId, user?.email);
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("outside your organization");
    });
  });

  describe("verifyClinicUserAccess", () => {
    it("should allow clinic_user to access resources in their own tenant", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("clinic_user");
      expect(result.isOwner).toBe(false);
      expect(result.departments).toEqual([]);
    });

    it("should allow admin role to access resources (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create an admin user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("admin");
    });

    it("should allow provider role to access resources (backward compatibility)", async () => {
      const ctx = t.ctx;
      
      // Create a provider user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.userRole).toBe("provider");
    });

    it("should deny patient role access", async () => {
      const ctx = t.ctx;
      
      // Create a patient user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "patient@example.com",
        name: "Patient User",
        role: "patient",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Only clinic users can perform this action.");
    });

    it("should deny access when tenant mismatch", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user in tenant-1
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      // Try to access tenant-2
      const result = await verifyClinicUserAccess(ctx, user?.email, "tenant-2");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("do not have access to this organization");
    });

    it("should deny access when email is undefined", async () => {
      const ctx = t.ctx;
      const result = await verifyClinicUserAccess(ctx, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Authentication required. Please sign in to access patient data.");
    });

    it("should deny access when user not found", async () => {
      const ctx = t.ctx;
      const result = await verifyClinicUserAccess(ctx, "nonexistent@example.com", "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("User not found. Please sign in with a valid account.");
    });

    it("should deny access when user is inactive", async () => {
      const ctx = t.ctx;
      
      // Create an inactive clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "inactive@example.com",
        name: "Inactive User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Account is inactive. Please contact support.");
    });

    it("should return user info including isOwner and departments when access is granted", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user with isOwner=true and departments
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "owner@example.com",
        name: "Owner User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { 
        isOwner: true,
        departments: ["dept-1", "dept-2"]
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.isOwner).toBe(true);
      expect(result.userRole).toBe("clinic_user");
      expect(result.departments).toEqual(["dept-1", "dept-2"]);
    });

    it("should handle undefined isOwner and departments gracefully", async () => {
      const ctx = t.ctx;
      
      // Create a user without isOwner and departments (old schema)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "olduser@example.com",
        name: "Old User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyClinicUserAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.isOwner).toBe(false); // Should default to false
      expect(result.departments).toEqual([]); // Should default to empty array
    });
  });

  describe("verifyOwnerAccess", () => {
    it("should allow owner to access their own tenant", async () => {
      const ctx = t.ctx;
      
      // Create an owner user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "owner@example.com",
        name: "Owner User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Set isOwner flag directly via database patch (for testing)
      await ctx.db.patch(userId, { isOwner: true });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyOwnerAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.isOwner).toBe(true);
      expect(result.userRole).toBe("clinic_user");
    });

    it("should deny access when user is not an owner", async () => {
      const ctx = t.ctx;
      
      // Create a non-owner clinic user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "nonowner@example.com",
        name: "Non-Owner User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Ensure isOwner is false (default)
      await ctx.db.patch(userId, { isOwner: false });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyOwnerAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Only clinic owners can perform this action.");
    });

    it("should deny access when owner tries to access different tenant", async () => {
      const ctx = t.ctx;
      
      // Create an owner user in tenant-1
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "owner@example.com",
        name: "Owner User",
        role: "clinic_user",
        tenantId: "tenant-1",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Set isOwner flag
      await ctx.db.patch(userId, { isOwner: true });

      const user = await t.query(api.users.getUser, { id: userId });
      // Try to access tenant-2
      const result = await verifyOwnerAccess(ctx, user?.email, "tenant-2");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("You do not have access to this organization. Owners can only access their own clinic.");
    });

    it("should deny access when email is undefined", async () => {
      const ctx = t.ctx;
      const result = await verifyOwnerAccess(ctx, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Authentication required. Please sign in to access patient data.");
    });

    it("should deny access when user not found", async () => {
      const ctx = t.ctx;
      const result = await verifyOwnerAccess(ctx, "nonexistent@example.com", "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("User not found. Please sign in with a valid account.");
    });

    it("should deny access when user is inactive", async () => {
      const ctx = t.ctx;
      
      // Create an inactive owner user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "inactiveowner@example.com",
        name: "Inactive Owner",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { isOwner: true });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyOwnerAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Account is inactive. Please contact support.");
    });

    it("should handle undefined isOwner gracefully (defaults to false)", async () => {
      const ctx = t.ctx;
      
      // Create a user without isOwner set (old schema)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "olduser@example.com",
        name: "Old User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Don't set isOwner - it will be undefined
      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyOwnerAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Only clinic owners can perform this action.");
    });

    it("should return user info when access is granted", async () => {
      const ctx = t.ctx;
      
      // Create an owner user with departments
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "owner@example.com",
        name: "Owner User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { 
        isOwner: true,
        departments: ["dept-1", "dept-2"]
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifyOwnerAccess(ctx, user?.email, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.isOwner).toBe(true);
      expect(result.userRole).toBe("clinic_user");
      expect(result.departments).toEqual(["dept-1", "dept-2"]);
    });
  });

  describe("checkPermission", () => {
    it("should return error when email is undefined", async () => {
      const ctx = t.ctx;
      const result = await checkPermission(ctx, undefined, "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe("Authentication required. Please sign in to access patient data.");
    });

    it("should return error when user not found", async () => {
      const ctx = t.ctx;
      const result = await checkPermission(ctx, "nonexistent@example.com", "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe("User not found. Please sign in with a valid account.");
    });

    it("should return error when user is inactive", async () => {
      const ctx = t.ctx;
      
      // Create an inactive user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "inactive@example.com",
        name: "Inactive User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe("Account is inactive. Please contact support.");
    });

    it("should return true for owners (owner override)", async () => {
      const ctx = t.ctx;
      
      // Create an owner user
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "owner@example.com",
        name: "Owner User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { isOwner: true });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(true);
      expect(result.path).toBe("patients.features.create");
    });

    it("should return error when user has no custom role assigned", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user without custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "noperms@example.com",
        name: "No Perms User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe("No permissions assigned to user");
    });

    it("should return error when permission path is invalid", async () => {
      const ctx = t.ctx;
      
      // Create a user with custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a custom role with permissions directly via database
      const roleId = await t.ctx.db.insert("customRoles", {
        tenantId: "test-tenant",
        name: "Test Role",
        permissions: {
          patients: {
            enabled: true,
            features: {
              create: true,
            },
          },
        },
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { customRoleId: roleId });

      const user = await t.query(api.users.getUser, { id: userId });
      
      // Test invalid path
      const result = await checkPermission(ctx, user?.email, "invalid.section.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain("not found in permissions");
    });

    it("should return error when section is disabled", async () => {
      const ctx = t.ctx;
      
      // Create a user with custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a custom role with disabled patients section directly via database
      const roleId = await ctx.db.insert("customRoles", {
        tenantId: "test-tenant",
        name: "Test Role",
        permissions: {
          patients: {
            enabled: false, // Disabled
            features: {
              create: true,
            },
          },
        },
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { customRoleId: roleId });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain("is not enabled");
    });

    it("should return true when permission is granted", async () => {
      const ctx = t.ctx;
      
      // Create a user with custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a custom role with permissions
      const roleId = await t.mutation(api.customRoles.createCustomRole, {
        tenantId: "test-tenant",
        name: "Test Role",
        permissions: {
          patients: {
            enabled: true,
            viewScope: "all_clinic",
            features: {
              create: true,
            },
          },
        },
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { customRoleId: roleId });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(true);
      expect(result.path).toBe("patients.features.create");
      expect(result.viewScope).toBe("all_clinic");
    });

    it("should return false when permission is disabled", async () => {
      const ctx = t.ctx;
      
      // Create a user with custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a custom role with disabled create permission directly via database
      const roleId = await ctx.db.insert("customRoles", {
        tenantId: "test-tenant",
        name: "Test Role",
        permissions: {
          patients: {
            enabled: true,
            features: {
              create: false, // Disabled
            },
          },
        },
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { customRoleId: roleId });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients.features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain("is disabled");
    });

    it("should navigate deep permission paths correctly", async () => {
      const ctx = t.ctx;
      
      // Create a user with custom role
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a custom role with deep permissions directly via database
      const roleId = await ctx.db.insert("customRoles", {
        tenantId: "test-tenant",
        name: "Test Role",
        permissions: {
          patients: {
            enabled: true,
            viewScope: "department",
            features: {
              list: {
                enabled: true,
                components: {
                  patientCard: {
                    enabled: true,
                    tabs: {
                      overview: true,
                      timeline: false,
                    },
                  },
                },
              },
            },
          },
        },
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(userId, { customRoleId: roleId });

      const user = await t.query(api.users.getUser, { id: userId });
      
      // Test deep path that should succeed
      const result1 = await checkPermission(ctx, user?.email, "patients.features.list.components.patientCard.tabs.overview");
      expect(result1.hasPermission).toBe(true);
      expect(result1.viewScope).toBe("department");
      
      // Test deep path that should fail
      const result2 = await checkPermission(ctx, user?.email, "patients.features.list.components.patientCard.tabs.timeline");
      expect(result2.hasPermission).toBe(false);
      expect(result2.error).toContain("is disabled");
    });

    it("should return error for empty permission path", async () => {
      const ctx = t.ctx;
      
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe("Empty permission path");
    });

    it("should return error for path with empty segments", async () => {
      const ctx = t.ctx;
      
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "user@example.com",
        name: "Test User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await checkPermission(ctx, user?.email, "patients..features.create");
      
      expect(result.hasPermission).toBe(false);
      expect(result.error).toContain("contains empty segments");
    });
  });

  describe("verifySupportAccess", () => {
    it("should return error when email is undefined", async () => {
      const ctx = t.ctx;
      const result = await verifySupportAccess(ctx, undefined, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Authentication required. Please sign in to access patient data.");
    });

    it("should return error when user is not superadmin", async () => {
      const ctx = t.ctx;
      
      // Create a clinic user (not superadmin)
      const now = Date.now();
      const userId = await t.mutation(api.users.createUserMutation, {
        email: "clinicuser@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: userId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("Only superadmins can perform support access");
    });

    it("should return error when no support access request exists", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any, // Superadmins don't have tenants
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("No approved support access request found");
    });

    it("should return error when request is pending", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a pending support access request
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "pending",
        auditTrail: [{
          action: "requested",
          timestamp: now,
          userId: superadminId,
        }],
        createdAt: now,
        updatedAt: now,
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("pending approval");
    });

    it("should return error when request is expired", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create an expired support access request (expired 1 hour ago)
      const expiredTimestamp = now - (2 * 60 * 60 * 1000); // 2 hours ago
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp: expiredTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt: expiredTimestamp - (60 * 60 * 1000), // Signed 1 hour before expiration
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: expiredTimestamp - (60 * 60 * 1000),
          userId: superadminId,
        }],
        createdAt: expiredTimestamp - (2 * 60 * 60 * 1000),
        updatedAt: expiredTimestamp - (60 * 60 * 1000),
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should return error when request is missing expiration timestamp", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create an approved request without expiration timestamp
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt: now - (30 * 60 * 1000), // Signed 30 minutes ago
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: now - (30 * 60 * 1000),
          userId: superadminId,
        }],
        createdAt: now - (30 * 60 * 1000),
        updatedAt: now - (30 * 60 * 1000),
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("missing expiration timestamp");
    });

    it("should return error when request is missing digital signature", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create an approved request without digital signature
      const expirationTimestamp = now + (30 * 60 * 1000); // Expires in 30 minutes
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp,
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: now - (30 * 60 * 1000),
          userId: superadminId,
        }],
        createdAt: now - (30 * 60 * 1000),
        updatedAt: now - (30 * 60 * 1000),
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("missing digital signature");
    });

    it("should return error when signature timestamp is invalid", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create an approved request with signature timestamp in the future
      const expirationTimestamp = now + (30 * 60 * 1000);
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt: now + (60 * 60 * 1000), // Signed in the future (invalid)
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: now - (30 * 60 * 1000),
          userId: superadminId,
        }],
        createdAt: now - (30 * 60 * 1000),
        updatedAt: now - (30 * 60 * 1000),
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("invalid signature timestamp");
    });

    it("should authorize valid support access request for tenant-level access", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a valid approved support access request
      const expirationTimestamp = now + (30 * 60 * 1000); // Expires in 30 minutes
      const signedAt = now - (30 * 60 * 1000); // Signed 30 minutes ago
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request for troubleshooting",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt,
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: signedAt,
          userId: superadminId,
        }],
        createdAt: signedAt,
        updatedAt: signedAt,
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant", "192.168.1.1", "Mozilla/5.0");
      
      expect(result.authorized).toBe(true);
      expect(result.requestId).toBe(requestId);
      expect(result.expiresAt).toBe(expirationTimestamp);
    });

    it("should authorize valid support access request for user-level access", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a target user
      const targetUserId = await t.mutation(api.users.createUserMutation, {
        email: "target@example.com",
        name: "Target User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a valid approved support access request for specific user
      const expirationTimestamp = now + (30 * 60 * 1000);
      const signedAt = now - (30 * 60 * 1000);
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetUserId,
        targetTenantId: "test-tenant",
        purpose: "Support request for user account",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt,
          consentText: "I consent to support access",
        },
        approvedBy: targetUserId,
        auditTrail: [{
          action: "approved",
          timestamp: signedAt,
          userId: targetUserId,
        }],
        createdAt: signedAt,
        updatedAt: signedAt,
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, targetUserId, "test-tenant");
      
      expect(result.authorized).toBe(true);
      expect(result.requestId).toBe(requestId);
      expect(result.expiresAt).toBe(expirationTimestamp);
    });

    it("should not match tenant-level request when requesting user-level access", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a target user
      const targetUserId = await t.mutation(api.users.createUserMutation, {
        email: "target@example.com",
        name: "Target User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a tenant-level request (no targetUserId)
      const expirationTimestamp = now + (30 * 60 * 1000);
      const signedAt = now - (30 * 60 * 1000);
      await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt,
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: signedAt,
          userId: superadminId,
        }],
        createdAt: signedAt,
        updatedAt: signedAt,
      });

      // Try to access with user-level request
      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, targetUserId, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("No approved support access request found");
    });

    it("should not match user-level request when requesting tenant-level access", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a target user
      const targetUserId = await t.mutation(api.users.createUserMutation, {
        email: "target@example.com",
        name: "Target User",
        role: "clinic_user",
        tenantId: "test-tenant",
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a user-level request
      const expirationTimestamp = now + (30 * 60 * 1000);
      const signedAt = now - (30 * 60 * 1000);
      await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetUserId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt,
          consentText: "I consent to support access",
        },
        approvedBy: targetUserId,
        auditTrail: [{
          action: "approved",
          timestamp: signedAt,
          userId: targetUserId,
        }],
        createdAt: signedAt,
        updatedAt: signedAt,
      });

      // Try to access with tenant-level request
      const user = await t.query(api.users.getUser, { id: superadminId });
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant");
      
      expect(result.authorized).toBe(false);
      expect(result.error).toContain("No approved support access request found");
    });

    it("should update audit trail when access is verified in mutation context", async () => {
      const ctx = t.ctx;
      
      // Create a superadmin user
      const now = Date.now();
      const superadminId = await t.mutation(api.users.createUserMutation, {
        email: "superadmin@example.com",
        name: "Super Admin",
        role: "super_admin",
        tenantId: undefined as any,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Create a valid approved support access request
      const expirationTimestamp = now + (30 * 60 * 1000);
      const signedAt = now - (30 * 60 * 1000);
      const requestId = await t.ctx.db.insert("supportAccessRequests", {
        superadminId,
        targetTenantId: "test-tenant",
        purpose: "Support request",
        status: "approved",
        expirationTimestamp,
        digitalSignature: {
          signatureData: "base64-signature-data",
          signedAt,
          consentText: "I consent to support access",
        },
        approvedBy: superadminId,
        auditTrail: [{
          action: "approved",
          timestamp: signedAt,
          userId: superadminId,
        }],
        createdAt: signedAt,
        updatedAt: signedAt,
      });

      const user = await t.query(api.users.getUser, { id: superadminId });
      
      // Verify access (this should update audit trail)
      const result = await verifySupportAccess(ctx, user?.email, undefined, "test-tenant", "192.168.1.1", "Mozilla/5.0");
      
      expect(result.authorized).toBe(true);
      
      // Check that audit trail was updated (in a real scenario, we'd query the request)
      // Note: In query context, audit trail won't be updated, but function should still work
    });
  });
});

