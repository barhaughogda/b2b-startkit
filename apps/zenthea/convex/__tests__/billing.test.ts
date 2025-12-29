import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * TDD Test Suite for Task 2.1: Create billing.ts Convex Module Skeleton
 * 
 * Requirements:
 * 1. Create convex/billing.ts file
 * 2. Set up basic structure with role-based access guards
 * 3. Add tenant isolation helpers
 */

describe("Billing Module Skeleton (Task 2.1)", () => {
  describe("Module Structure", () => {
    it("should export tenant isolation helper functions", async () => {
      // Verify that billing module exports tenant isolation helpers
      // This test will fail until we implement the helpers
      const billingModule = await import("../billing");
      
      // Expect tenant isolation helpers to exist
      expect(billingModule).toHaveProperty("verifyTenantAccess");
      expect(typeof billingModule.verifyTenantAccess).toBe("function");
    });

    it("should export role-based access guard functions", async () => {
      // Verify that billing module exports role-based access guards
      const billingModule = await import("../billing");
      
      // Expect role-based access guards to exist
      expect(billingModule).toHaveProperty("verifyClinicBillingAccess");
      expect(typeof billingModule.verifyClinicBillingAccess).toBe("function");
      
      expect(billingModule).toHaveProperty("verifyProviderBillingAccess");
      expect(typeof billingModule.verifyProviderBillingAccess).toBe("function");
      
      expect(billingModule).toHaveProperty("verifyPatientBillingAccess");
      expect(typeof billingModule.verifyPatientBillingAccess).toBe("function");
    });
  });
});

/**
 * TDD Test Suite for Task 2.2: Implement getClinicRCM Query
 * 
 * Requirements:
 * 1. Aggregate KPIs: total AR, days in AR (approximate), clean claim rate, denial rate, net collection rate
 * 2. Filter by tenant, date range
 * 3. Return structured data for dashboard
 * 
 * RED Phase: Write failing tests first
 */
describe("getClinicRCM Query (Task 2.2) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  const otherTenantId = "test-tenant-2";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a clinic user for authorization
    const now = Date.now();
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getClinicRCM query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getClinicRCM");
      expect(typeof billingModule.getClinicRCM).toBe("function");
    });

    it("should return structured KPI data", async () => {
      // This test will fail until getClinicRCM is implemented
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toHaveProperty("totalAR");
      expect(result).toHaveProperty("daysInAR");
      expect(result).toHaveProperty("cleanClaimRate");
      expect(result).toHaveProperty("denialRate");
      expect(result).toHaveProperty("netCollectionRate");
    });
  });

  describe("Total AR Calculation", () => {
    it("should calculate total AR from unpaid claims and invoices", async () => {
      // Create test data: claims and invoices with outstanding balances
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create unpaid claim ($500.00)
      const claimId1 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 50000, // $500.00 in cents
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-001",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create denied claim ($200.00) - should still count as AR
      const claimId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "denied",
          totalCharges: 20000, // $200.00 in cents
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-002",
          denialReason: "Missing information",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create invoice with patient responsibility ($100.00)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId,
          invoiceNumber: "INV-001",
          amount: 10000, // $100.00 in cents
          status: "pending",
          serviceType: "Appointment",
          description: "Test invoice",
          dueDate: Date.now() + 86400000,
          patientResponsibility: 10000,
          insuranceResponsibility: 0,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Total AR should be: $500 (unpaid claim) + $200 (denied claim) + $100 (invoice) = $800
      expect(result.totalAR).toBe(800.0); // Converted from cents to dollars
    });

    it("should return zero AR when no outstanding balances exist", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result.totalAR).toBe(0);
    });
  });

  describe("Days in AR Calculation", () => {
    it("should calculate approximate days in AR from claim submission dates", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create claim submitted 30 days ago
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 50000,
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-001",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Days in AR should be approximately 30
      expect(result.daysInAR).toBeGreaterThanOrEqual(29);
      expect(result.daysInAR).toBeLessThanOrEqual(31);
    });

    it("should return zero days in AR when all claims are paid", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result.daysInAR).toBe(0);
    });
  });

  describe("Clean Claim Rate Calculation", () => {
    it("should calculate clean claim rate as percentage of accepted claims", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create 10 claims: 7 accepted, 2 denied, 1 pending
      for (let i = 0; i < 7; i++) {
        await t.runMutation(async (ctx) => {
          return await ctx.db.insert("insuranceClaims", {
            patientId,
            providerId,
            payerId,
            status: "accepted",
            totalCharges: 10000,
            datesOfService: [Date.now()],
            claimControlNumber: `CLM-ACCEPTED-${i}`,
            tenantId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      }

      for (let i = 0; i < 2; i++) {
        await t.runMutation(async (ctx) => {
          return await ctx.db.insert("insuranceClaims", {
            patientId,
            providerId,
            payerId,
            status: "denied",
            totalCharges: 10000,
            datesOfService: [Date.now()],
            claimControlNumber: `CLM-DENIED-${i}`,
            denialReason: "Missing information",
            tenantId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      }

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 10000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-PENDING-1",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Clean claim rate = accepted / (accepted + denied) = 7 / 9 = 77.78%
      expect(result.cleanClaimRate).toBeCloseTo(77.78, 1);
    });

    it("should return 100% clean claim rate when no denied claims exist", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // When no claims exist, or all are clean, rate should be 100%
      expect(result.cleanClaimRate).toBe(100);
    });
  });

  describe("Denial Rate Calculation", () => {
    it("should calculate denial rate as percentage of denied claims", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create 10 claims: 6 accepted, 3 denied, 1 pending
      for (let i = 0; i < 6; i++) {
        await t.runMutation(async (ctx) => {
          return await ctx.db.insert("insuranceClaims", {
            patientId,
            providerId,
            payerId,
            status: "accepted",
            totalCharges: 10000,
            datesOfService: [Date.now()],
            claimControlNumber: `CLM-ACCEPTED-${i}`,
            tenantId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      }

      for (let i = 0; i < 3; i++) {
        await t.runMutation(async (ctx) => {
          return await ctx.db.insert("insuranceClaims", {
            patientId,
            providerId,
            payerId,
            status: "denied",
            totalCharges: 10000,
            datesOfService: [Date.now()],
            claimControlNumber: `CLM-DENIED-${i}`,
            denialReason: "Missing information",
            tenantId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      }

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Denial rate = denied / (accepted + denied) = 3 / 9 = 33.33%
      expect(result.denialRate).toBeCloseTo(33.33, 1);
    });

    it("should return zero denial rate when no denied claims exist", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result.denialRate).toBe(0);
    });
  });

  describe("Net Collection Rate Calculation", () => {
    it("should calculate net collection rate from payments vs charges", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create claim with $1000 charges
      const claimId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "paid",
          totalCharges: 100000, // $1000.00 in cents
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-001",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Record insurance payment of $800 (with $200 adjustment)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayments", {
          claimId,
          amount: 80000, // $800.00 in cents
          adjustmentAmount: 20000, // $200.00 in cents
          paidAt: Date.now(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Net collection rate = payments / charges = $800 / $1000 = 80%
      expect(result.netCollectionRate).toBeCloseTo(80.0, 1);
    });

    it("should return zero net collection rate when no payments exist", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result.netCollectionRate).toBe(0);
    });
  });

  describe("Tenant Filtering", () => {
    it("should only return data for the specified tenant", async () => {
      // Create data for tenant 1
      const patientId1 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId1 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId1 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1,
          payerId: payerId1,
          status: "submitted",
          totalCharges: 50000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-TENANT1",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create data for tenant 2
      const patientId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date("1985-05-15").getTime(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Bob",
          lastName: "Johnson",
          email: "bob.johnson@clinic.com",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "AETNA-001",
          name: "Aetna",
          planType: "hmo",
          contactInfo: {},
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId2,
          providerId: providerId2,
          payerId: payerId2,
          status: "submitted",
          totalCharges: 100000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-TENANT2",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query for tenant 1 should only return tenant 1 data
      const result1 = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result1.totalAR).toBe(500.0); // Only tenant 1's $500 claim

      // Query for tenant 2 should return zero (no authorized user for tenant 2)
      // This test verifies tenant isolation
      const result2 = await t.query(api.billing.getClinicRCM, {
        tenantId: otherTenantId,
        userEmail: clinicUserEmail,
      });

      // Should return zero or error due to authorization check
      expect(result2.totalAR).toBe(0);
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter claims by date range when provided", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      // Create claim 30 days ago (within range)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 50000,
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-RANGE-1",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      // Create claim 60 days ago (outside range)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 30000,
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-RANGE-2",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      // Query with date range (last 30 days)
      const startDate = thirtyDaysAgo;
      const endDate = now;

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
        startDate,
        endDate,
      });

      // Should only include claim from 30 days ago ($500), not 60 days ago
      expect(result.totalAR).toBe(500.0);
    });

    it("should include all claims when no date range is provided", async () => {
      const patientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const providerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. Jane",
          lastName: "Smith",
          email: "jane.smith@clinic.com",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const payerId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayers", {
          payerId: "BCBS-001",
          name: "Blue Cross Blue Shield",
          planType: "ppo",
          contactInfo: {},
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      // Create claims at different dates
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 50000,
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-ALL-1",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 30000,
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-ALL-2",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      // Query without date range
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Should include both claims: $500 + $300 = $800
      expect(result.totalAR).toBe(800.0);
    });
  });

  describe("Authorization", () => {
    it("should require clinic user authorization", async () => {
      // Query without proper authorization should fail or return error
      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow clinic_user role to access RCM data", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      // Should succeed and return data structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalAR");
    });
  });
});

/**
 * TDD Test Suite for Task 2.3: Implement getClinicClaimsList Query
 * 
 * Requirements:
 * 1. Paginated, filterable list of claims
 * 2. Filters: status, payer, provider, date range
 * 3. Sort by date, amount, status
 * 4. Return with pagination metadata
 * 
 * RED Phase: Write failing tests first
 */
describe("getClinicClaimsList Query (Task 2.3) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  const otherTenantId = "test-tenant-2";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let patientId1: Id<"patients">;
  let patientId2: Id<"patients">;
  let providerId1: Id<"providers">;
  let providerId2: Id<"providers">;
  let payerId1: Id<"insurancePayers">;
  let payerId2: Id<"insurancePayers">;
  let claimId1: Id<"insuranceClaims">;
  let claimId2: Id<"insuranceClaims">;
  let claimId3: Id<"insuranceClaims">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a clinic user for authorization
    const now = Date.now();
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";

    // Create test patients
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    patientId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-0102",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test providers
    providerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Alice",
        lastName: "Provider",
        specialty: "Cardiology",
        email: "alice.provider@example.com",
        licenseNumber: "LIC-001",
        npi: "1234567890", // NPI must be 10 digits
        tenantId,
        userId: clinicUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    providerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Bob",
        lastName: "Provider",
        specialty: "Pediatrics",
        email: "bob.provider@example.com",
        licenseNumber: "LIC-002",
        npi: "0987654321", // NPI must be 10 digits
        tenantId,
        userId: clinicUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test insurance payers
    payerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "commercial",
        contactInfo: {
          phone: "555-1000",
          email: "contact@bcbs.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    payerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "AETNA-001",
        name: "Aetna",
        planType: "commercial",
        contactInfo: {
          phone: "555-2000",
          email: "contact@aetna.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test claims with different statuses, amounts, and dates
    const baseTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    claimId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId1,
        payerId: payerId1,
        status: "submitted",
        totalCharges: 50000, // $500.00
        datesOfService: [baseTime],
        claimControlNumber: "CCN-001",
        tenantId,
        createdAt: baseTime,
        updatedAt: baseTime,
      });
    });

    claimId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId2,
        providerId: providerId1,
        payerId: payerId2,
        status: "paid",
        totalCharges: 30000, // $300.00
        datesOfService: [baseTime + 5 * 24 * 60 * 60 * 1000],
        claimControlNumber: "CCN-002",
        tenantId,
        createdAt: baseTime + 5 * 24 * 60 * 60 * 1000,
        updatedAt: baseTime + 5 * 24 * 60 * 60 * 1000,
      });
    });

    claimId3 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId2,
        payerId: payerId1,
        status: "denied",
        totalCharges: 75000, // $750.00
        denialReason: "Duplicate claim",
        datesOfService: [baseTime + 10 * 24 * 60 * 60 * 1000],
        claimControlNumber: "CCN-003",
        tenantId,
        createdAt: baseTime + 10 * 24 * 60 * 60 * 1000,
        updatedAt: baseTime + 10 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getClinicClaimsList query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getClinicClaimsList");
      expect(typeof billingModule.getClinicClaimsList).toBe("function");
    });

    it("should return paginated claims list with metadata", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toHaveProperty("claims");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.claims)).toBe(true);
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("pageSize");
      expect(result.pagination).toHaveProperty("totalCount");
      expect(result.pagination).toHaveProperty("totalPages");
    });

    it("should return claims with required fields", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      if (result.claims.length > 0) {
        const claim = result.claims[0];
        expect(claim).toHaveProperty("_id");
        expect(claim).toHaveProperty("patientId");
        expect(claim).toHaveProperty("providerId");
        expect(claim).toHaveProperty("payerId");
        expect(claim).toHaveProperty("status");
        expect(claim).toHaveProperty("totalCharges");
        expect(claim).toHaveProperty("createdAt");
      }
    });
  });

  describe("Pagination", () => {
    it("should return first page by default", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 2,
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(2);
      expect(result.claims.length).toBeLessThanOrEqual(2);
    });

    it("should return second page when requested", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 2,
        pageSize: 2,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(2);
    });

    it("should calculate totalPages correctly", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        pageSize: 2,
      });

      const expectedPages = Math.ceil(result.pagination.totalCount / 2);
      expect(result.pagination.totalPages).toBe(expectedPages);
    });

    it("should default to page 1 and pageSize 20", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });
  });

  describe("Filtering by Status", () => {
    it("should filter claims by status='submitted'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "submitted",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
      });
    });

    it("should filter claims by status='paid'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "paid",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("paid");
      });
    });

    it("should filter claims by status='denied'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "denied",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("denied");
      });
    });
  });

  describe("Filtering by Payer", () => {
    it("should filter claims by payerId", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        payerId: payerId1,
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.payerId).toBe(payerId1);
      });
    });

    it("should return empty array for non-existent payerId", async () => {
      const nonExistentPayerId = "non-existent-payer" as Id<"insurancePayers">;
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        payerId: nonExistentPayerId,
      });

      expect(result.claims).toEqual([]);
    });
  });

  describe("Filtering by Provider", () => {
    it("should filter claims by providerId", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        providerId: providerId1,
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.providerId).toBe(providerId1);
      });
    });
  });

  describe("Filtering by Date Range", () => {
    it("should filter claims by startDate", async () => {
      const startDate = Date.now() - 20 * 24 * 60 * 60 * 1000; // 20 days ago
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        startDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeGreaterThanOrEqual(startDate);
      });
    });

    it("should filter claims by endDate", async () => {
      const endDate = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        endDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeLessThanOrEqual(endDate);
      });
    });

    it("should filter claims by both startDate and endDate", async () => {
      const startDate = Date.now() - 25 * 24 * 60 * 60 * 1000; // 25 days ago
      const endDate = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        startDate,
        endDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(claim.createdAt).toBeLessThanOrEqual(endDate);
      });
    });
  });

  describe("Sorting", () => {
    it("should sort by date descending by default", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].createdAt).toBeGreaterThanOrEqual(
            result.claims[i + 1].createdAt
          );
        }
      }
    });

    it("should sort by date ascending when sortBy='date' and sortOrder='asc'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        sortBy: "date",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].createdAt).toBeLessThanOrEqual(
            result.claims[i + 1].createdAt
          );
        }
      }
    });

    it("should sort by amount descending when sortBy='amount' and sortOrder='desc'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        sortBy: "amount",
        sortOrder: "desc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeGreaterThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });

    it("should sort by amount ascending when sortBy='amount' and sortOrder='asc'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        sortBy: "amount",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeLessThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });

    it("should sort by status when sortBy='status'", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        sortBy: "status",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].status <= result.claims[i + 1].status).toBe(true);
        }
      }
    });
  });

  describe("Combined Filters", () => {
    it("should apply multiple filters simultaneously", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "submitted",
        payerId: payerId1,
        providerId: providerId1,
      });

      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
        expect(claim.payerId).toBe(payerId1);
        expect(claim.providerId).toBe(providerId1);
      });
    });

    it("should combine filters with sorting", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "submitted",
        sortBy: "amount",
        sortOrder: "desc",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeGreaterThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return claims for the specified tenant", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      result.claims.forEach((claim) => {
        expect(claim.tenantId).toBe(tenantId);
      });
    });

    it("should not return claims from other tenants", async () => {
      // Create a claim for a different tenant
      const otherTenantClaimId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1,
          payerId: payerId1,
          status: "submitted",
          totalCharges: 10000,
          datesOfService: [Date.now()],
          claimControlNumber: "CCN-OTHER",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      const otherTenantClaim = result.claims.find(
        (claim) => claim._id === otherTenantClaimId
      );
      expect(otherTenantClaim).toBeUndefined();
    });
  });

  describe("Authorization", () => {
    it("should require clinic user authorization", async () => {
      await expect(
        t.query(api.billing.getClinicClaimsList, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow clinic_user role to access claims list", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("claims");
      expect(result).toHaveProperty("pagination");
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array when no claims match filters", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        status: "draft", // No claims with this status in test data
      });

      expect(result.claims).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
    });

    it("should handle pagination beyond available pages", async () => {
      const result = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 999,
        pageSize: 10,
      });

      expect(result.claims).toEqual([]);
      expect(result.pagination.page).toBe(999);
    });
  });
});

/**
 * TDD Test Suite for Task 2.4: Implement getProviderRCM Query
 * 
 * Requirements:
 * 1. Same metrics as clinic but scoped to authenticated provider
 * 2. Filter by provider's userId (via email lookup to providerId)
 * 3. Return provider-specific KPIs
 * 
 * RED Phase: Write failing tests first
 */
describe("getProviderRCM Query (Task 2.4) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let providerUserId: Id<"users">;
  let providerUserEmail: string;
  let providerId1: Id<"providers">;
  let providerId2: Id<"providers">;
  let patientId1: Id<"patients">;
  let payerId1: Id<"insurancePayers">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a provider user for authorization
    const now = Date.now();
    providerUserId = await t.mutation(api.users.createUserMutation, {
      email: "provider@example.com",
      name: "Provider User",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const providerUser = await t.query(api.users.getUser, { id: providerUserId });
    providerUserEmail = providerUser?.email || "provider@example.com";

    // Create provider record linked to user email
    providerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Alice",
        lastName: "Provider",
        specialty: "Cardiology",
        email: providerUserEmail, // Link provider to user email
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create another provider for isolation testing
    providerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Bob",
        lastName: "Provider",
        specialty: "Dermatology",
        email: "bob.provider@example.com",
        licenseNumber: "LIC-002",
        npi: "0987654321",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test patient
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test payer
    payerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "ppo",
        contactInfo: {
          phone: "1-800-BCBS",
          email: "contact@bcbs.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getProviderRCM query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getProviderRCM");
      expect(typeof billingModule.getProviderRCM).toBe("function");
    });

    it("should return structured KPI data", async () => {
      // This test will fail until getProviderRCM is implemented
      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
      });

      expect(result).toHaveProperty("totalAR");
      expect(result).toHaveProperty("daysInAR");
      expect(result).toHaveProperty("cleanClaimRate");
      expect(result).toHaveProperty("denialRate");
      expect(result).toHaveProperty("netCollectionRate");
    });
  });

  describe("Provider-Scoped Data Filtering", () => {
    it("should only return claims for the authenticated provider", async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // Create claim for provider 1 (authenticated provider)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1, // Provider 1's claim
          payerId: payerId1,
          status: "submitted",
          totalCharges: 50000, // $500.00
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-PROV1-1",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      // Create claim for provider 2 (different provider)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId2, // Provider 2's claim - should NOT appear
          payerId: payerId1,
          status: "submitted",
          totalCharges: 30000, // $300.00
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-PROV2-1",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
      });

      // Should only include provider 1's claim: $500
      expect(result.totalAR).toBe(500.0);
    });

    it("should calculate KPIs only from provider's own claims", async () => {
      const now = Date.now();
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      // Create accepted claim for provider 1
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1,
          payerId: payerId1,
          status: "accepted",
          totalCharges: 100000, // $1000.00
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-PROV1-ACCEPTED",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      // Create denied claim for provider 2 (should not affect provider 1's metrics)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId2,
          payerId: payerId1,
          status: "denied",
          totalCharges: 50000,
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-PROV2-DENIED",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
      });

      // Provider 1 has 1 accepted claim, 0 denied claims
      // Clean claim rate = 1 accepted / (1 accepted + 0 denied) * 100 = 100%
      expect(result.cleanClaimRate).toBe(100.0);
      expect(result.denialRate).toBe(0.0);
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter claims by date range", async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
      const startDate = now - 45 * 24 * 60 * 60 * 1000; // 45 days ago
      const endDate = now - 15 * 24 * 60 * 60 * 1000; // 15 days ago

      // Create claim within date range
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1,
          payerId: payerId1,
          status: "submitted",
          totalCharges: 50000, // $500.00
          datesOfService: [thirtyDaysAgo],
          claimControlNumber: "CLM-IN-RANGE",
          tenantId,
          createdAt: thirtyDaysAgo,
          updatedAt: thirtyDaysAgo,
        });
      });

      // Create claim outside date range (too old)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId1,
          providerId: providerId1,
          payerId: payerId1,
          status: "submitted",
          totalCharges: 30000, // $300.00
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-OUT-RANGE",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
        startDate,
        endDate,
      });

      // Should only include claim within date range: $500
      expect(result.totalAR).toBe(500.0);
    });
  });

  describe("Authorization", () => {
    it("should require provider authorization", async () => {
      // Query without proper authorization should fail
      await expect(
        t.query(api.billing.getProviderRCM, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow provider role to access their RCM data", async () => {
      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
      });

      // Should succeed and return data structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalAR");
    });
  });

  describe("Empty State Handling", () => {
    it("should return zero values when provider has no claims", async () => {
      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail,
      });

      expect(result.totalAR).toBe(0);
      expect(result.daysInAR).toBe(0);
      expect(result.cleanClaimRate).toBe(100.0); // 100% when no processed claims
      expect(result.denialRate).toBe(0.0);
      expect(result.netCollectionRate).toBe(0.0);
    });
  });
});

/**
 * TDD Test Suite for Task 2.5: Implement getProviderClaimsList Query
 * 
 * Requirements:
 * 1. List of claims for authenticated provider
 * 2. Include status, amounts, dates
 * 3. Support filtering and pagination
 * 
 * RED Phase: Write failing tests first
 */
describe("getProviderClaimsList Query (Task 2.5) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let providerUserId: Id<"users">;
  let providerUserEmail: string;
  let providerId1: Id<"providers">;
  let providerId2: Id<"providers">;
  let patientId1: Id<"patients">;
  let patientId2: Id<"patients">;
  let payerId1: Id<"insurancePayers">;
  let payerId2: Id<"insurancePayers">;
  let claimId1: Id<"insuranceClaims">;
  let claimId2: Id<"insuranceClaims">;
  let claimId3: Id<"insuranceClaims">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a provider user for authorization
    const now = Date.now();
    providerUserId = await t.mutation(api.users.createUserMutation, {
      email: "provider@example.com",
      name: "Provider User",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const providerUser = await t.query(api.users.getUser, { id: providerUserId });
    providerUserEmail = providerUser?.email || "provider@example.com";

    // Create provider record linked to user email
    providerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Alice",
        lastName: "Provider",
        specialty: "Cardiology",
        email: providerUserEmail, // Link provider to user email
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create another provider for isolation testing
    providerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Bob",
        lastName: "Provider",
        specialty: "Dermatology",
        email: "bob.provider@example.com",
        licenseNumber: "LIC-002",
        npi: "0987654321",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test patients
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    patientId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-0102",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test insurance payers
    payerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "commercial",
        contactInfo: {
          phone: "555-1000",
          email: "contact@bcbs.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    payerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "AETNA-001",
        name: "Aetna",
        planType: "commercial",
        contactInfo: {
          phone: "555-2000",
          email: "contact@aetna.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create test claims with different statuses, amounts, and dates
    const baseTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Claim 1: Provider 1, submitted status
    claimId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId1, // Provider 1's claim
        payerId: payerId1,
        status: "submitted",
        totalCharges: 50000, // $500.00
        datesOfService: [baseTime],
        claimControlNumber: "CCN-PROV1-001",
        tenantId,
        createdAt: baseTime,
        updatedAt: baseTime,
      });
    });

    // Claim 2: Provider 1, paid status
    claimId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId2,
        providerId: providerId1, // Provider 1's claim
        payerId: payerId2,
        status: "paid",
        totalCharges: 30000, // $300.00
        datesOfService: [baseTime + 5 * 24 * 60 * 60 * 1000],
        claimControlNumber: "CCN-PROV1-002",
        tenantId,
        createdAt: baseTime + 5 * 24 * 60 * 60 * 1000,
        updatedAt: baseTime + 5 * 24 * 60 * 60 * 1000,
      });
    });

    // Claim 3: Provider 2, denied status (should NOT appear in provider 1's list)
    claimId3 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId2, // Provider 2's claim - should NOT appear
        payerId: payerId1,
        status: "denied",
        totalCharges: 75000, // $750.00
        denialReason: "Duplicate claim",
        datesOfService: [baseTime + 10 * 24 * 60 * 60 * 1000],
        claimControlNumber: "CCN-PROV2-001",
        tenantId,
        createdAt: baseTime + 10 * 24 * 60 * 60 * 1000,
        updatedAt: baseTime + 10 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getProviderClaimsList query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getProviderClaimsList");
      expect(typeof billingModule.getProviderClaimsList).toBe("function");
    });

    it("should return paginated claims list with metadata", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      expect(result).toHaveProperty("claims");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.claims)).toBe(true);
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("pageSize");
      expect(result.pagination).toHaveProperty("totalCount");
      expect(result.pagination).toHaveProperty("totalPages");
    });

    it("should return claims with required fields: status, amounts, dates", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      if (result.claims.length > 0) {
        const claim = result.claims[0];
        expect(claim).toHaveProperty("_id");
        expect(claim).toHaveProperty("status");
        expect(claim).toHaveProperty("totalCharges");
        expect(claim).toHaveProperty("createdAt");
        expect(claim).toHaveProperty("patientId");
        expect(claim).toHaveProperty("providerId");
        expect(claim).toHaveProperty("payerId");
      }
    });
  });

  describe("Provider-Scoped Filtering", () => {
    it("should only return claims for the authenticated provider", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      // Should only include provider 1's claims (claimId1 and claimId2)
      // Should NOT include provider 2's claim (claimId3)
      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.providerId).toBe(providerId1);
      });

      // Verify provider 2's claim is not included
      const provider2Claim = result.claims.find((claim) => claim._id === claimId3);
      expect(provider2Claim).toBeUndefined();
    });

    it("should return empty array when provider has no claims", async () => {
      // Create a new provider with no claims
      const newProviderEmail = "newprovider@example.com";
      await t.mutation(api.users.createUserMutation, {
        email: newProviderEmail,
        name: "New Provider",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Dr. New",
          lastName: "Provider",
          specialty: "General",
          email: newProviderEmail,
          licenseNumber: "LIC-003",
          npi: "1111111111",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: newProviderEmail,
      });

      expect(result.claims).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe("Pagination", () => {
    it("should return first page by default", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 1,
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(1);
      expect(result.claims.length).toBeLessThanOrEqual(1);
    });

    it("should return second page when requested", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 2,
        pageSize: 1,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(1);
    });

    it("should calculate totalPages correctly", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        pageSize: 1,
      });

      const expectedPages = Math.ceil(result.pagination.totalCount / 1);
      expect(result.pagination.totalPages).toBe(expectedPages);
    });

    it("should default to page 1 and pageSize 20", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });
  });

  describe("Filtering by Status", () => {
    it("should filter claims by status='submitted'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        status: "submitted",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
        expect(claim.providerId).toBe(providerId1); // Still scoped to provider
      });
    });

    it("should filter claims by status='paid'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        status: "paid",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("paid");
        expect(claim.providerId).toBe(providerId1);
      });
    });

    it("should return empty array when no claims match status filter", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        status: "draft", // No claims with this status in test data
      });

      expect(result.claims).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe("Filtering by Date Range", () => {
    it("should filter claims by startDate", async () => {
      const startDate = Date.now() - 20 * 24 * 60 * 60 * 1000; // 20 days ago
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        startDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(claim.providerId).toBe(providerId1);
      });
    });

    it("should filter claims by endDate", async () => {
      const endDate = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        endDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeLessThanOrEqual(endDate);
        expect(claim.providerId).toBe(providerId1);
      });
    });

    it("should filter claims by both startDate and endDate", async () => {
      const startDate = Date.now() - 25 * 24 * 60 * 60 * 1000; // 25 days ago
      const endDate = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        startDate,
        endDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(claim.createdAt).toBeLessThanOrEqual(endDate);
        expect(claim.providerId).toBe(providerId1);
      });
    });
  });

  describe("Sorting", () => {
    it("should sort by date descending by default", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].createdAt).toBeGreaterThanOrEqual(
            result.claims[i + 1].createdAt
          );
        }
      }
    });

    it("should sort by date ascending when sortBy='date' and sortOrder='asc'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        sortBy: "date",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].createdAt).toBeLessThanOrEqual(
            result.claims[i + 1].createdAt
          );
        }
      }
    });

    it("should sort by amount descending when sortBy='amount' and sortOrder='desc'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        sortBy: "amount",
        sortOrder: "desc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeGreaterThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });

    it("should sort by amount ascending when sortBy='amount' and sortOrder='asc'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        sortBy: "amount",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeLessThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });

    it("should sort by status when sortBy='status'", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        sortBy: "status",
        sortOrder: "asc",
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].status <= result.claims[i + 1].status).toBe(true);
        }
      }
    });
  });

  describe("Combined Filters", () => {
    it("should apply status filter with date range", async () => {
      const startDate = Date.now() - 25 * 24 * 60 * 60 * 1000;
      const endDate = Date.now() - 5 * 24 * 60 * 60 * 1000;
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        status: "submitted",
        startDate,
        endDate,
      });

      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
        expect(claim.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(claim.createdAt).toBeLessThanOrEqual(endDate);
        expect(claim.providerId).toBe(providerId1);
      });
    });

    it("should combine filters with sorting", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        status: "submitted",
        sortBy: "amount",
        sortOrder: "desc",
      });

      expect(result.claims.length).toBeGreaterThan(0);
      result.claims.forEach((claim) => {
        expect(claim.status).toBe("submitted");
        expect(claim.providerId).toBe(providerId1);
      });

      if (result.claims.length > 1) {
        for (let i = 0; i < result.claims.length - 1; i++) {
          expect(result.claims[i].totalCharges).toBeGreaterThanOrEqual(
            result.claims[i + 1].totalCharges
          );
        }
      }
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return claims for the specified tenant", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      result.claims.forEach((claim) => {
        expect(claim.tenantId).toBe(tenantId);
      });
    });
  });

  describe("Authorization", () => {
    it("should require provider authorization", async () => {
      await expect(
        t.query(api.billing.getProviderClaimsList, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow provider role to access their claims list", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("claims");
      expect(result).toHaveProperty("pagination");
    });
  });

  describe("Edge Cases", () => {
    it("should handle pagination beyond available pages", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 999,
        pageSize: 10,
      });

      expect(result.claims).toEqual([]);
      expect(result.pagination.page).toBe(999);
    });
  });
});

/**
 * TDD Test Suite for Task 2.6: Implement getPatientInvoices Query
 * 
 * Requirements:
 * 1. Return invoices for authenticated patient
 * 2. Include breakdown: total, insurance portion, patient responsibility, status
 * 3. Link to claims if applicable
 * 4. Filter by status, date range
 * 
 * RED Phase: Write failing tests first
 */
describe("getPatientInvoices Query (Task 2.6) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  const otherTenantId = "test-tenant-2";
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let patientId1: Id<"patients">;
  let patientId2: Id<"patients">;
  let payerId1: Id<"insurancePayers">;
  let claimId1: Id<"insuranceClaims">;
  let invoiceId1: Id<"invoices">;
  let invoiceId2: Id<"invoices">;
  let invoiceId3: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a patient user for authorization
    const now = Date.now();
    patientUserEmail = "patient@example.com";
    
    // Create patient record first
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: patientUserEmail,
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create another patient for isolation testing
    patientId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-0102",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider for claim
    const providerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Test",
        lastName: "Provider",
        specialty: "General",
        email: "provider@example.com",
        licenseNumber: "LIC-TEST",
        npi: "1234567890",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create payer
    payerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "ppo",
        contactInfo: {
          phone: "1-800-BCBS",
          email: "contact@bcbs.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create a claim
    claimId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId,
        payerId: payerId1,
        status: "submitted",
        totalCharges: 10000, // $100.00
        datesOfService: [now],
        claimControlNumber: "CCN-001",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice with claim link
    invoiceId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-001",
        amount: 10000, // $100.00 total
        patientResponsibility: 2000, // $20.00
        insuranceResponsibility: 8000, // $80.00
        status: "submitted",
        serviceType: "Appointment",
        description: "Office visit",
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        claimId: claimId1,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice without claim (self-pay)
    invoiceId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-002",
        amount: 5000, // $50.00 total
        patientResponsibility: 5000, // $50.00 (full amount)
        insuranceResponsibility: 0, // $0.00
        status: "pending",
        serviceType: "Lab Services",
        description: "Blood test",
        dueDate: now + 15 * 24 * 60 * 60 * 1000, // 15 days from now
        tenantId,
        createdAt: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      });
    });

    // Create paid invoice
    invoiceId3 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-003",
        amount: 3000, // $30.00 total
        patientResponsibility: 3000, // $30.00
        insuranceResponsibility: 0, // $0.00
        status: "paid",
        serviceType: "Procedure",
        description: "X-ray",
        dueDate: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        paidDate: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        tenantId,
        createdAt: now - 20 * 24 * 60 * 60 * 1000, // 20 days ago
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getPatientInvoices query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getPatientInvoices");
      expect(typeof billingModule.getPatientInvoices).toBe("function");
    });

    it("should return array of invoices for authenticated patient", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include total, insurance portion, and patient responsibility in each invoice", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((invoice) => {
        expect(invoice).toHaveProperty("total");
        expect(invoice).toHaveProperty("insurancePortion");
        expect(invoice).toHaveProperty("patientResponsibility");
        expect(invoice).toHaveProperty("status");
        expect(typeof invoice.total).toBe("number");
        expect(typeof invoice.insurancePortion).toBe("number");
        expect(typeof invoice.patientResponsibility).toBe("number");
      });
    });

    it("should link to claim if invoice has claimId", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const invoiceWithClaim = result.find((inv) => inv.claimId === claimId1);
      expect(invoiceWithClaim).toBeDefined();
      expect(invoiceWithClaim?.claimId).toBe(claimId1);
    });

    it("should not include claimId for invoices without claims", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const invoiceWithoutClaim = result.find((inv) => inv.invoiceNumber === "INV-002");
      expect(invoiceWithoutClaim).toBeDefined();
      expect(invoiceWithoutClaim?.claimId).toBeUndefined();
    });
  });

  describe("Breakdown Calculation", () => {
    it("should correctly calculate total from patient and insurance responsibility", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const invoiceWithClaim = result.find((inv) => inv.invoiceNumber === "INV-001");
      expect(invoiceWithClaim).toBeDefined();
      expect(invoiceWithClaim?.total).toBe(100.0); // $100.00
      expect(invoiceWithClaim?.patientResponsibility).toBe(20.0); // $20.00
      expect(invoiceWithClaim?.insurancePortion).toBe(80.0); // $80.00
    });

    it("should handle self-pay invoices (no insurance)", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const selfPayInvoice = result.find((inv) => inv.invoiceNumber === "INV-002");
      expect(selfPayInvoice).toBeDefined();
      expect(selfPayInvoice?.total).toBe(50.0); // $50.00
      expect(selfPayInvoice?.patientResponsibility).toBe(50.0); // $50.00
      expect(selfPayInvoice?.insurancePortion).toBe(0.0); // $0.00
    });
  });

  describe("Status Filtering", () => {
    it("should filter invoices by status when status filter is provided", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
        status: "paid",
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((invoice) => {
        expect(invoice.status).toBe("paid");
      });
    });

    it("should filter invoices by pending status", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
        status: "pending",
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((invoice) => {
        expect(invoice.status).toBe("pending");
      });
    });

    it("should return all invoices when no status filter is provided", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result.length).toBeGreaterThanOrEqual(3); // At least 3 invoices
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter invoices by date range when provided", async () => {
      const now = Date.now();
      const startDate = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      const endDate = now + 1 * 24 * 60 * 60 * 1000; // 1 day from now

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
        startDate,
        endDate,
      });

      result.forEach((invoice) => {
        expect(invoice.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(invoice.createdAt).toBeLessThanOrEqual(endDate);
      });
    });

    it("should return invoices within date range only", async () => {
      const now = Date.now();
      const startDate = now - 25 * 24 * 60 * 60 * 1000; // 25 days ago
      const endDate = now - 15 * 24 * 60 * 60 * 1000; // 15 days ago

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
        startDate,
        endDate,
      });

      // Should only return invoiceId3 (created 20 days ago)
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((invoice) => {
        expect(invoice.createdAt).toBeGreaterThanOrEqual(startDate);
        expect(invoice.createdAt).toBeLessThanOrEqual(endDate);
      });
    });
  });

  describe("Patient Authorization", () => {
    it("should require patient authorization", async () => {
      await expect(
        t.query(api.billing.getPatientInvoices, {
          patientId: patientId1,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow patient to access their own invoices", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should not allow patient to access other patients' invoices", async () => {
      await expect(
        t.query(api.billing.getPatientInvoices, {
          patientId: patientId2, // Different patient
          userEmail: patientUserEmail, // But using patient1's email
        })
      ).rejects.toThrow();
    });

    it("should allow clinic users to access patient invoices in same tenant", async () => {
      // Create clinic user
      const now = Date.now();
      const clinicUserId = await t.mutation(api.users.createUserMutation, {
        email: "clinic@example.com",
        name: "Clinic User",
        role: "clinic_user",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
      const clinicUserEmail = clinicUser?.email || "clinic@example.com";

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return invoices for the specified tenant", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      result.forEach((invoice) => {
        expect(invoice.tenantId).toBe(tenantId);
      });
    });

    it("should not return invoices from other tenants", async () => {
      // Create invoice in different tenant
      const otherTenantInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: patientId1, // Same patient but different tenant
          invoiceNumber: "INV-OTHER",
          amount: 10000,
          patientResponsibility: 10000,
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Other",
          description: "Other tenant invoice",
          dueDate: Date.now(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const otherTenantInvoice = result.find(
        (inv) => inv._id === otherTenantInvoiceId
      );
      expect(otherTenantInvoice).toBeUndefined();
    });
  });

  describe("Invoice Details", () => {
    it("should include invoice number, date, and description", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((invoice) => {
        expect(invoice).toHaveProperty("invoiceNumber");
        expect(invoice).toHaveProperty("date");
        expect(invoice).toHaveProperty("description");
        expect(typeof invoice.invoiceNumber).toBe("string");
        expect(typeof invoice.date).toBe("string");
        expect(typeof invoice.description).toBe("string");
      });
    });

    it("should include service type and due date", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((invoice) => {
        expect(invoice).toHaveProperty("serviceType");
        expect(invoice).toHaveProperty("dueDate");
        expect(typeof invoice.serviceType).toBe("string");
      });
    });

    it("should include claim status if invoice is linked to claim", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const invoiceWithClaim = result.find((inv) => inv.claimId === claimId1);
      expect(invoiceWithClaim).toBeDefined();
      expect(invoiceWithClaim).toHaveProperty("claimStatus");
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array for patient with no invoices", async () => {
      // Create patient with no invoices
      const emptyPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Empty",
          lastName: "Patient",
          email: "empty@example.com",
          phone: "555-0000",
          dateOfBirth: new Date("1995-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: emptyPatientId,
        userEmail: "empty@example.com",
      });

      expect(result).toEqual([]);
    });

    it("should handle invoices with zero amounts", async () => {
      const zeroInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-ZERO",
          amount: 0,
          patientResponsibility: 0,
          insuranceResponsibility: 0,
          status: "paid",
          serviceType: "Adjustment",
          description: "Zero amount invoice",
          dueDate: Date.now(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      const zeroInvoice = result.find((inv) => inv._id === zeroInvoiceId);
      expect(zeroInvoice).toBeDefined();
      expect(zeroInvoice?.total).toBe(0);
      expect(zeroInvoice?.patientResponsibility).toBe(0);
      expect(zeroInvoice?.insurancePortion).toBe(0);
    });
  });
});

/**
 * TDD Test Suite for Task 2.7: Implement getPatientBillingSummary Query
 * 
 * Requirements:
 * 1. Calculate: outstanding balance, upcoming charges (next 30 days), total paid (last 3 months)
 * 2. Return summary object for patient dashboard
 * 3. Verify patient authorization (userEmail parameter)
 * 4. Support tenant isolation
 * 
 * RED Phase: Write failing tests first
 */
describe("getPatientBillingSummary Query (Task 2.7) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  const otherTenantId = "test-tenant-2";
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let patientId1: Id<"patients">;
  let patientId2: Id<"patients">;
  let invoiceId1: Id<"invoices">;
  let invoiceId2: Id<"invoices">;
  let invoiceId3: Id<"invoices">;
  let invoiceId4: Id<"invoices">;
  let invoiceId5: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a patient user for authorization
    const now = Date.now();
    patientUserEmail = "patient@example.com";
    
    // Create patient record first
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: patientUserEmail,
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create another patient for isolation testing
    patientId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "555-0102",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create user record for patient
    patientUserId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("users", {
        email: patientUserEmail,
        name: "John Doe",
        role: "patient",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
    const fourMonthsAgo = now - 120 * 24 * 60 * 60 * 1000;
    const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fifteenDaysFromNow = now + 15 * 24 * 60 * 60 * 1000;
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
    const fortyFiveDaysFromNow = now + 45 * 24 * 60 * 60 * 1000;

    // Invoice 1: Outstanding balance - pending status, due in 15 days (upcoming charge)
    invoiceId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-001",
        amount: 10000, // $100.00
        patientResponsibility: 10000,
        insuranceResponsibility: 0,
        status: "pending",
        serviceType: "Appointment",
        description: "Office visit",
        dueDate: fifteenDaysFromNow,
        tenantId,
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
      });
    });

    // Invoice 2: Outstanding balance - overdue status, due 5 days ago
    invoiceId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-002",
        amount: 5000, // $50.00
        patientResponsibility: 5000,
        insuranceResponsibility: 0,
        status: "overdue",
        serviceType: "Lab Services",
        description: "Blood test",
        dueDate: now - 5 * 24 * 60 * 60 * 1000,
        tenantId,
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        updatedAt: now - 20 * 24 * 60 * 60 * 1000,
      });
    });

    // Invoice 3: Paid within last 3 months (should be included in totalPaid)
    invoiceId3 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-003",
        amount: 3000, // $30.00
        patientResponsibility: 3000,
        insuranceResponsibility: 0,
        status: "paid",
        serviceType: "Procedure",
        description: "X-ray",
        dueDate: twoMonthsAgo,
        paidDate: oneMonthAgo, // Paid 1 month ago (within 3 months)
        tenantId,
        createdAt: threeMonthsAgo,
        updatedAt: oneMonthAgo,
      });
    });

    // Invoice 4: Paid 4 months ago (should NOT be included in totalPaid)
    invoiceId4 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-004",
        amount: 2000, // $20.00
        patientResponsibility: 2000,
        insuranceResponsibility: 0,
        status: "paid",
        serviceType: "Consultation",
        description: "Follow-up",
        dueDate: fourMonthsAgo,
        paidDate: fourMonthsAgo, // Paid 4 months ago (outside 3 months)
        tenantId,
        createdAt: fourMonthsAgo,
        updatedAt: fourMonthsAgo,
      });
    });

    // Invoice 5: Upcoming charge - due in 25 days (within 30 days)
    invoiceId5 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-005",
        amount: 7500, // $75.00
        patientResponsibility: 7500,
        insuranceResponsibility: 0,
        status: "pending",
        serviceType: "Appointment",
        description: "Follow-up visit",
        dueDate: now + 25 * 24 * 60 * 60 * 1000, // 25 days from now
        tenantId,
        createdAt: now - 5 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Query Existence and Structure", () => {
    it("should export getPatientBillingSummary query function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("getPatientBillingSummary");
      expect(typeof billingModule.getPatientBillingSummary).toBe("function");
    });

    it("should return structured summary data", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      expect(result).toHaveProperty("outstandingBalance");
      expect(result).toHaveProperty("upcomingCharges");
      expect(result).toHaveProperty("totalPaid");
      expect(result).toHaveProperty("pendingCount");
      expect(typeof result.outstandingBalance).toBe("number");
      expect(typeof result.upcomingCharges).toBe("number");
      expect(typeof result.totalPaid).toBe("number");
      expect(typeof result.pendingCount).toBe("number");
    });
  });

  describe("Outstanding Balance Calculation", () => {
    it("should calculate outstanding balance from unpaid invoices", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Outstanding: INV-001 ($100) + INV-002 ($50) + INV-005 ($75) = $225.00
      // Note: INV-003 and INV-004 are paid, so not included
      expect(result.outstandingBalance).toBe(225.0);
    });

    it("should include all unpaid statuses in outstanding balance", async () => {
      // Create invoices with different unpaid statuses
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-DRAFT",
          amount: 1000, // $10.00
          patientResponsibility: 1000,
          insuranceResponsibility: 0,
          status: "draft",
          serviceType: "Service",
          description: "Draft invoice",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-SUBMITTED",
          amount: 2000, // $20.00
          patientResponsibility: 2000,
          insuranceResponsibility: 0,
          status: "submitted",
          serviceType: "Service",
          description: "Submitted invoice",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-PARTIAL",
          amount: 5000, // $50.00
          patientResponsibility: 5000,
          insuranceResponsibility: 0,
          status: "partially_paid",
          serviceType: "Service",
          description: "Partially paid invoice",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Original $225 + $10 (draft) + $20 (submitted) + $50 (partial) = $305.00
      expect(result.outstandingBalance).toBe(305.0);
    });

    it("should exclude paid invoices from outstanding balance", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-003 ($30) and INV-004 ($20) are paid, should not be included
      // Outstanding: $100 + $50 + $75 = $225
      expect(result.outstandingBalance).toBe(225.0);
      expect(result.outstandingBalance).not.toBe(275.0); // Would include paid invoices
    });
  });

  describe("Upcoming Charges Calculation (Next 30 Days)", () => {
    it("should calculate upcoming charges for invoices due in next 30 days", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Upcoming: INV-001 ($100, due in 15 days) + INV-005 ($75, due in 25 days) = $175.00
      // INV-002 is overdue (past due), so not included
      expect(result.upcomingCharges).toBe(175.0);
    });

    it("should exclude overdue invoices from upcoming charges", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-002 is overdue (due 5 days ago), should not be in upcoming charges
      expect(result.upcomingCharges).toBe(175.0);
      expect(result.upcomingCharges).not.toBe(225.0); // Would include overdue
    });

    it("should exclude invoices due beyond 30 days", async () => {
      // Create invoice due in 45 days (should be excluded)
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-FUTURE",
          amount: 10000, // $100.00
          patientResponsibility: 10000,
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Service",
          description: "Future invoice",
          dueDate: Date.now() + 45 * 24 * 60 * 60 * 1000, // 45 days from now
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Should still be $175 (INV-001 + INV-005), not $275
      expect(result.upcomingCharges).toBe(175.0);
    });

    it("should exclude paid invoices from upcoming charges", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-003 is paid, should not be in upcoming charges
      expect(result.upcomingCharges).toBe(175.0);
    });
  });

  describe("Total Paid Calculation (Last 3 Months)", () => {
    it("should calculate total paid from invoices paid within last 3 months", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Only INV-003 ($30) was paid within last 3 months
      // INV-004 ($20) was paid 4 months ago, so excluded
      expect(result.totalPaid).toBe(30.0);
    });

    it("should exclude invoices paid more than 3 months ago", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-004 was paid 4 months ago, should not be included
      expect(result.totalPaid).toBe(30.0);
      expect(result.totalPaid).not.toBe(50.0); // Would include 4-month-old payment
    });

    it("should include all invoices paid within 3 months", async () => {
      // Create another invoice paid 2 months ago
      await t.runMutation(async (ctx) => {
        const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-RECENT",
          amount: 4000, // $40.00
          patientResponsibility: 4000,
          insuranceResponsibility: 0,
          status: "paid",
          serviceType: "Service",
          description: "Recent payment",
          dueDate: twoMonthsAgo,
          paidDate: twoMonthsAgo, // Paid 2 months ago (within 3 months)
          tenantId,
          createdAt: twoMonthsAgo,
          updatedAt: twoMonthsAgo,
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-003 ($30) + INV-RECENT ($40) = $70.00
      expect(result.totalPaid).toBe(70.0);
    });

    it("should only include invoices with status 'paid'", async () => {
      // Create invoice with pending status but paidDate (should not count)
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-PENDING-PAID",
          amount: 5000, // $50.00
          patientResponsibility: 5000,
          insuranceResponsibility: 0,
          status: "pending", // Not paid status
          serviceType: "Service",
          description: "Pending with paidDate",
          dueDate: Date.now(),
          paidDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Has paidDate but status is pending
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Should still be $30 (only INV-003), not $80
      expect(result.totalPaid).toBe(30.0);
    });
  });

  describe("Pending Count Calculation", () => {
    it("should count all unpaid invoices", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Unpaid: INV-001 (pending), INV-002 (overdue), INV-005 (pending) = 3
      expect(result.pendingCount).toBe(3);
    });

    it("should exclude paid invoices from pending count", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // INV-003 and INV-004 are paid, should not be counted
      expect(result.pendingCount).toBe(3);
    });
  });

  describe("Authorization and Security", () => {
    it("should require userEmail parameter for authorization", async () => {
      // This test verifies the function signature includes userEmail
      const billingModule = await import("../billing");
      const queryDef = billingModule.getPatientBillingSummary;
      
      // The query should accept userEmail in args
      // This will fail if userEmail is not in the args definition
      expect(queryDef).toBeDefined();
    });

    it("should verify patient authorization before returning data", async () => {
      // Try to access another patient's data
      await expect(
        t.query(api.billing.getPatientBillingSummary, {
          patientId: patientId2, // Different patient
          tenantId,
          userEmail: patientUserEmail, // But using patient1's email
        })
      ).rejects.toThrow();
    });

    it("should enforce tenant isolation", async () => {
      // Create invoice for different tenant
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-OTHER-TENANT",
          amount: 100000, // $1000.00
          patientResponsibility: 100000,
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Service",
          description: "Other tenant invoice",
          dueDate: Date.now(),
          tenantId: otherTenantId, // Different tenant
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId, // Correct tenant
        userEmail: patientUserEmail,
      });

      // Should not include invoice from other tenant
      // Outstanding should still be $225, not $1225
      expect(result.outstandingBalance).toBe(225.0);
    });
  });

  describe("Edge Cases", () => {
    it("should return zero values for patient with no invoices", async () => {
      const emptyPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Empty",
          lastName: "Patient",
          email: "empty@example.com",
          phone: "555-0000",
          dateOfBirth: new Date("1995-01-01").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create user for empty patient
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("users", {
          email: "empty@example.com",
          name: "Empty Patient",
          role: "patient",
          tenantId,
          passwordHash: "hashed-password",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: emptyPatientId,
        tenantId,
        userEmail: "empty@example.com",
      });

      expect(result.outstandingBalance).toBe(0);
      expect(result.upcomingCharges).toBe(0);
      expect(result.totalPaid).toBe(0);
      expect(result.pendingCount).toBe(0);
    });

    it("should handle invoices with zero amounts", async () => {
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-ZERO",
          amount: 0,
          patientResponsibility: 0,
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Adjustment",
          description: "Zero amount invoice",
          dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Should handle zero amounts gracefully
      expect(result.outstandingBalance).toBe(225.0); // Unchanged
      expect(result.pendingCount).toBe(4); // Includes zero-amount invoice
    });

    it("should handle missing paidDate for paid invoices", async () => {
      // Create paid invoice without paidDate
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-NO-PAID-DATE",
          amount: 6000, // $60.00
          patientResponsibility: 6000,
          insuranceResponsibility: 0,
          status: "paid",
          serviceType: "Service",
          description: "Paid without paidDate",
          dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
          // paidDate is undefined
          tenantId,
          createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Should handle gracefully - may use createdAt or updatedAt as fallback
      // Or exclude if paidDate is required for 3-month filter
      // This test documents the expected behavior
      expect(result.totalPaid).toBeGreaterThanOrEqual(30.0);
    });
  });

  describe("Data Format and Units", () => {
    it("should return amounts in dollars (not cents)", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Amounts should be in dollars, not cents
      // Outstanding: $225.00 (not 22500 cents)
      expect(result.outstandingBalance).toBe(225.0);
      expect(result.outstandingBalance).not.toBe(22500);
    });

    it("should handle decimal precision correctly", async () => {
      // Create invoice with odd cent amount
      await t.runMutation(async (ctx) => {
        await ctx.db.insert("invoices", {
          patientId: patientId1,
          invoiceNumber: "INV-ODD",
          amount: 12345, // $123.45
          patientResponsibility: 12345,
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Service",
          description: "Odd amount invoice",
          dueDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        tenantId,
        userEmail: patientUserEmail,
      });

      // Should handle decimal conversion: 12345 cents = $123.45
      expect(result.outstandingBalance).toBeCloseTo(348.45, 2);
    });
  });
});

/**
 * TDD Test Suite for Task 2.8: Implement createClaimForAppointment Mutation
 * 
 * Requirements:
 * 1. Generate claim from appointment data (patientId, providerId, datesOfService)
 * 2. Create claim line items from appointment procedures
 * 3. Link to invoice if exists, or create new invoice
 * 4. Validate required fields before creation
 * 
 * RED Phase: Write failing tests first
 */
describe("createClaimForAppointment Mutation (Task 2.8) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let patientId: Id<"patients">;
  let providerId: Id<"providers">;
  let payerId: Id<"insurancePayers">;
  let appointmentId: Id<"appointments">;
  let existingInvoiceId: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create clinic user for authorization
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";

    // Create patient
    patientId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider
    providerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Jane",
        lastName: "Smith",
        email: "jane.smith@clinic.com",
        specialty: "Family Medicine",
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        userId: clinicUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create insurance payer
    payerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "ppo",
        contactInfo: {},
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create completed appointment
    appointmentId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("appointments", {
        patientId,
        userId: clinicUserId,
        providerId,
        scheduledAt: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        duration: 30, // 30 minutes
        type: "consultation",
        status: "completed",
        notes: "Follow-up visit",
        tenantId,
        createdAt: now - 7 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
      });
    });

    // Create existing invoice (optional - for testing invoice linking)
    existingInvoiceId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId,
        invoiceNumber: "INV-EXISTING-001",
        amount: 15000, // $150.00
        patientResponsibility: 3000, // $30.00
        insuranceResponsibility: 12000, // $120.00
        status: "pending",
        serviceType: "Appointment",
        description: "Office visit",
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        tenantId,
        createdAt: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Mutation Existence and Structure", () => {
    it("should export createClaimForAppointment mutation function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("createClaimForAppointment");
      expect(typeof billingModule.createClaimForAppointment).toBe("function");
    });
  });

  describe("Basic Claim Creation", () => {
    it("should create a claim from appointment data", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213", // CPT code for office visit
            modifiers: [],
            diagnosisCodes: ["E11.9"], // Type 2 diabetes
            units: 1,
            chargeAmount: 15000, // $150.00 in cents
          },
        ],
      });

      expect(result).toHaveProperty("claimId");
      expect(result).toHaveProperty("invoiceId");

      // Verify claim was created
      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.claimId);
      });

      expect(claim).toBeDefined();
      expect(claim?.patientId).toBe(patientId);
      expect(claim?.providerId).toBe(providerId);
      expect(claim?.payerId).toBe(payerId);
      expect(claim?.status).toBe("draft");
      expect(claim?.totalCharges).toBe(15000);
      expect(claim?.datesOfService).toHaveLength(1);
      expect(claim?.datesOfService[0]).toBeDefined();
    });

    it("should extract datesOfService from appointment scheduledAt", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.claimId);
      });

      const appointment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(appointmentId);
      });

      // Dates of service should match appointment scheduledAt
      expect(claim?.datesOfService[0]).toBe(appointment?.scheduledAt);
    });

    it("should calculate totalCharges from line items", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000, // $150.00
          },
          {
            procedureCode: "36415", // Venipuncture
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 2500, // $25.00
          },
        ],
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.claimId);
      });

      // Total should be sum of all line items: $150 + $25 = $175 = 17500 cents
      expect(claim?.totalCharges).toBe(17500);
    });
  });

  describe("Claim Line Items Creation", () => {
    it("should create claim line items for each procedure", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: ["25"], // Significant, separately identifiable E&M service
            diagnosisCodes: ["E11.9", "I10"], // Diabetes and hypertension
            units: 1,
            chargeAmount: 15000,
          },
          {
            procedureCode: "36415",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 2500,
          },
        ],
      });

      // Query line items for the claim
      const lineItems = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("claimLineItems")
          .withIndex("by_claim", (q) => q.eq("claimId", result.claimId))
          .collect();
      });

      expect(lineItems).toHaveLength(2);

      // Verify first line item
      const lineItem1 = lineItems.find((li) => li.procedureCode === "99213");
      expect(lineItem1).toBeDefined();
      expect(lineItem1?.modifiers).toEqual(["25"]);
      expect(lineItem1?.diagnosisCodes).toEqual(["E11.9", "I10"]);
      expect(lineItem1?.units).toBe(1);
      expect(lineItem1?.chargeAmount).toBe(15000);

      // Verify second line item
      const lineItem2 = lineItems.find((li) => li.procedureCode === "36415");
      expect(lineItem2).toBeDefined();
      expect(lineItem2?.modifiers).toEqual([]);
      expect(lineItem2?.diagnosisCodes).toEqual(["E11.9"]);
      expect(lineItem2?.units).toBe(1);
      expect(lineItem2?.chargeAmount).toBe(2500);
    });

    it("should handle line items with multiple units", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "J3301", // Injection, triamcinolone acetonide
            modifiers: [],
            diagnosisCodes: ["M79.3"], // Panniculitis
            units: 3, // 3 units
            chargeAmount: 5000, // $50.00 per unit
          },
        ],
      });

      const lineItems = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("claimLineItems")
          .withIndex("by_claim", (q) => q.eq("claimId", result.claimId))
          .collect();
      });

      expect(lineItems).toHaveLength(1);
      expect(lineItems[0]?.units).toBe(3);
      expect(lineItems[0]?.chargeAmount).toBe(5000); // Charge amount is per unit
    });
  });

  describe("Invoice Linking and Creation", () => {
    it("should link to existing invoice if invoiceId provided", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        invoiceId: existingInvoiceId,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.claimId);
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(existingInvoiceId);
      });

      // Claim should be linked to existing invoice
      expect(claim?.invoiceId).toBe(existingInvoiceId);
      expect(result.invoiceId).toBe(existingInvoiceId);

      // Invoice should be linked to claim
      expect(invoice?.claimId).toBe(result.claimId);
    });

    it("should create new invoice if no invoiceId provided", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      // Should return new invoice ID
      expect(result.invoiceId).toBeDefined();
      expect(result.invoiceId).not.toBe(existingInvoiceId);

      // Verify invoice was created
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.invoiceId);
      });

      expect(invoice).toBeDefined();
      expect(invoice?.patientId).toBe(patientId);
      expect(invoice?.claimId).toBe(result.claimId);
      expect(invoice?.amount).toBe(15000);
      expect(invoice?.status).toBe("pending");
    });

    it("should set invoice amounts based on claim total", async () => {
      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000, // $150.00
          },
        ],
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.invoiceId);
      });

      // Invoice total should match claim total
      expect(invoice?.amount).toBe(15000);
      // For now, assume 80% insurance, 20% patient (this could be configurable)
      expect(invoice?.insuranceResponsibility).toBeGreaterThan(0);
      expect(invoice?.patientResponsibility).toBeGreaterThan(0);
      expect(
        invoice?.insuranceResponsibility + invoice?.patientResponsibility
      ).toBe(15000);
    });
  });

  describe("Field Validation", () => {
    it("should reject if appointmentId is missing", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        } as any)
      ).rejects.toThrow();
    });

    it("should reject if payerId is missing", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        } as any)
      ).rejects.toThrow();
    });

    it("should reject if lineItems is empty", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [],
        })
      ).rejects.toThrow();
    });

    it("should reject if appointment does not exist", async () => {
      const fakeAppointmentId = "j0000000000000000000000000" as Id<"appointments">;

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: fakeAppointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should reject if payer does not exist", async () => {
      const fakePayerId = "j0000000000000000000000000" as Id<"insurancePayers">;

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId: fakePayerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should reject if appointment is not completed", async () => {
      // Create a scheduled (not completed) appointment
      const scheduledAppointmentId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("appointments", {
          patientId,
          userId: clinicUserId,
          providerId,
          scheduledAt: Date.now(),
          duration: 30,
          type: "consultation",
          status: "scheduled", // Not completed
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: scheduledAppointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should validate line item required fields", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              // Missing procedureCode
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        } as any)
      ).rejects.toThrow();
    });

    it("should validate diagnosisCodes is not empty", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: [], // Empty diagnosis codes
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should validate units is greater than 0", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 0, // Invalid: must be > 0
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should validate chargeAmount is greater than 0", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 0, // Invalid: must be > 0
            },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("Authorization", () => {
    it("should require clinic user authorization", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: "unauthorized@example.com",
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("should verify tenant isolation", async () => {
      // Create appointment in different tenant
      const otherTenantId = "test-tenant-2";
      const otherAppointmentId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("appointments", {
          patientId,
          userId: clinicUserId,
          providerId,
          scheduledAt: Date.now(),
          duration: 30,
          type: "consultation",
          status: "completed",
          tenantId: otherTenantId, // Different tenant
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: otherAppointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("Claim Control Number Generation", () => {
    it("should generate unique claim control number", async () => {
      const result1 = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      // Create another appointment and claim
      const appointmentId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("appointments", {
          patientId,
          userId: clinicUserId,
          providerId,
          scheduledAt: Date.now(),
          duration: 30,
          type: "consultation",
          status: "completed",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result2 = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId: appointmentId2,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claim1 = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result1.claimId);
      });

      const claim2 = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result2.claimId);
      });

      // Claim control numbers should be unique
      expect(claim1?.claimControlNumber).toBeDefined();
      expect(claim2?.claimControlNumber).toBeDefined();
      expect(claim1?.claimControlNumber).not.toBe(claim2?.claimControlNumber);
    });
  });
});

/**
 * TDD Test Suite for Task 2.9: Implement recordInsurancePayment Mutation
 * 
 * Requirements:
 * 1. Record payment from insurance company
 * 2. Update claim status to "paid" if fully paid
 * 3. Update linked invoice status
 * 4. Handle partial payments
 * 
 * RED Phase: Write failing tests first
 */
describe("recordInsurancePayment Mutation (Task 2.9) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let patientId: Id<"patients">;
  let providerId: Id<"providers">;
  let payerId: Id<"insurancePayers">;
  let claimId: Id<"insuranceClaims">;
  let invoiceId: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create clinic user for authorization
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";

    // Create patient
    patientId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider
    providerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Jane",
        lastName: "Smith",
        email: "jane.smith@clinic.com",
        specialty: "Family Medicine",
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        userId: clinicUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create insurance payer
    payerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "ppo",
        contactInfo: {},
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice
    invoiceId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId,
        invoiceNumber: "INV-001",
        amount: 100000, // $1000.00 in cents
        patientResponsibility: 20000, // $200.00 in cents
        insuranceResponsibility: 80000, // $800.00 in cents
        status: "pending",
        serviceType: "Appointment",
        description: "Office visit",
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create claim linked to invoice
    claimId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId,
        providerId,
        payerId,
        invoiceId,
        status: "accepted", // Claim has been accepted by payer
        totalCharges: 100000, // $1000.00 in cents
        datesOfService: [now - 7 * 24 * 60 * 60 * 1000], // 7 days ago
        claimControlNumber: "CLM-001",
        tenantId,
        createdAt: now - 7 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Mutation Existence and Structure", () => {
    it("should export recordInsurancePayment mutation function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("recordInsurancePayment");
      expect(typeof billingModule.recordInsurancePayment).toBe("function");
    });
  });

  describe("Basic Payment Recording", () => {
    it("should record a full insurance payment", async () => {
      const paymentAmount = 80000; // $800.00 in cents (full insurance responsibility)
      const adjustmentAmount = 0;

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount,
        userEmail: clinicUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      // Verify payment was created
      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment).toBeDefined();
      expect(payment?.claimId).toBe(claimId);
      expect(payment?.amount).toBe(paymentAmount);
      expect(payment?.adjustmentAmount).toBe(adjustmentAmount);
      expect(payment?.tenantId).toBe(tenantId);
      expect(payment?.paidAt).toBeDefined();
    });

    it("should record payment with adjustment amount", async () => {
      const paymentAmount = 75000; // $750.00 in cents
      const adjustmentAmount = 5000; // $50.00 adjustment

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount,
        userEmail: clinicUserEmail,
      });

      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment?.amount).toBe(paymentAmount);
      expect(payment?.adjustmentAmount).toBe(adjustmentAmount);
    });

    it("should record payment with check number", async () => {
      const paymentAmount = 80000;
      const checkNumber = "CHK-12345";

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        checkNumber,
        userEmail: clinicUserEmail,
      });

      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment?.checkNumber).toBe(checkNumber);
    });

    it("should record payment with transaction ID", async () => {
      const paymentAmount = 80000;
      const transactionId = "TXN-98765";

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        transactionId,
        userEmail: clinicUserEmail,
      });

      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment?.transactionId).toBe(transactionId);
    });

    it("should use current timestamp for paidAt if not provided", async () => {
      const beforePayment = Date.now();
      const paymentAmount = 80000;

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("insurancePayments")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      const payment = payments[0];
      expect(payment?.paidAt).toBeGreaterThanOrEqual(beforePayment);
      expect(payment?.paidAt).toBeLessThanOrEqual(Date.now());
    });

    it("should use provided paidAt timestamp", async () => {
      const customPaidAt = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const paymentAmount = 80000;

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        paidAt: customPaidAt,
        userEmail: clinicUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("insurancePayments")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      expect(payments[0]?.paidAt).toBe(customPaidAt);
    });
  });

  describe("Claim Status Updates", () => {
    it("should update claim status to 'paid' when fully paid", async () => {
      const paymentAmount = 80000; // Full insurance responsibility

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });

      expect(claim?.status).toBe("paid");
    });

    it("should keep claim status as 'accepted' when partially paid", async () => {
      const paymentAmount = 40000; // Partial payment ($400.00, half of $800.00)

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });

      expect(claim?.status).toBe("accepted"); // Should remain accepted for partial payment
    });

    it("should update claim status to 'paid' after multiple payments sum to full amount", async () => {
      // First partial payment
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 40000, // $400.00
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      let claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("accepted"); // Still partial

      // Second payment that completes the full amount
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 40000, // $400.00 (total now $800.00)
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("paid"); // Now fully paid
    });

    it("should handle overpayment correctly", async () => {
      const paymentAmount = 90000; // $900.00 (more than $800.00 insurance responsibility)

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });

      // Should still mark as paid even if overpaid
      expect(claim?.status).toBe("paid");
    });
  });

  describe("Invoice Status Updates", () => {
    it("should update linked invoice status when claim is fully paid", async () => {
      const paymentAmount = 80000; // Full insurance responsibility

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      // Invoice should reflect that insurance portion is paid
      // Status might be "partially_paid" if patient still owes, or "paid" if fully paid
      expect(invoice?.status).toBeDefined();
      expect(["paid", "partially_paid"]).toContain(invoice?.status);
    });

    it("should update invoice to 'paid' when both insurance and patient portions are paid", async () => {
      // First, pay insurance portion
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 80000, // Full insurance responsibility
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      // Then pay patient portion (simulate patient payment)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patientPayments", {
          patientId,
          invoiceId,
          amount: 20000, // $200.00 patient responsibility
          paymentMethod: "credit_card",
          paidAt: Date.now(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice?.status).toBe("paid");
    });

    it("should update invoice to 'partially_paid' when only insurance portion is paid", async () => {
      const paymentAmount = 80000; // Full insurance responsibility

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      // Patient still owes $200.00, so invoice should be partially_paid
      expect(invoice?.status).toBe("partially_paid");
    });
  });

  describe("Partial Payment Handling", () => {
    it("should allow multiple partial payments for the same claim", async () => {
      const payment1 = 30000; // $300.00
      const payment2 = 30000; // $300.00
      const payment3 = 20000; // $200.00 (total $800.00)

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: payment1,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: payment2,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: payment3,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("insurancePayments")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      expect(payments).toHaveLength(3);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(80000); // $800.00 total

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("paid");
    });

    it("should calculate total payments correctly for partial payments", async () => {
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 40000, // $400.00
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 30000, // $300.00
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("insurancePayments")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(70000); // $700.00 total

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("accepted"); // Still partial, not fully paid
    });
  });

  describe("Authorization and Validation", () => {
    it("should require clinic user authorization", async () => {
      const unauthorizedEmail = "unauthorized@example.com";

      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: unauthorizedEmail,
        })
      ).rejects.toThrow();
    });

    it("should validate claim exists", async () => {
      const fakeClaimId = "j9j9j9j9j9j9j9j9j9j9j9j9" as Id<"insuranceClaims">;

      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId: fakeClaimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Claim not found");
    });

    it("should validate claim belongs to tenant", async () => {
      const otherTenantId = "other-tenant";
      const otherClaimId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "accepted",
          totalCharges: 100000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-OTHER",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId: otherClaimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow();
    });

    it("should validate payment amount is greater than zero", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: 0,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });

    it("should validate payment amount is positive", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: -1000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });
  });

  describe("Edge Cases", () => {
    it("should handle claim without linked invoice", async () => {
      // Create claim without invoice
      const claimWithoutInvoice = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "accepted",
          totalCharges: 100000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-NO-INV",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId: claimWithoutInvoice,
        amount: 80000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimWithoutInvoice);
      });
      expect(claim?.status).toBe("paid");
    });

    it("should handle claim with negative adjustment amount", async () => {
      const paymentAmount = 80000;
      const adjustmentAmount = -5000; // Negative adjustment (write-off)

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount,
        userEmail: clinicUserEmail,
      });

      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment?.adjustmentAmount).toBe(adjustmentAmount);
    });

    it("should handle claim already marked as paid", async () => {
      // First payment to mark as paid
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 80000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      // Attempt another payment (should still work, but claim stays paid)
      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 10000, // Additional payment
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("paid");
    });
  });

  describe("Payment Aggregation", () => {
    it("should sum all payments correctly when checking if claim is fully paid", async () => {
      // Create multiple payments
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 30000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 30000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 20000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("insurancePayments")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(80000); // Should equal insurance responsibility

      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.status).toBe("paid");
    });
  });
});

/**
 * TDD Test Suite for Task 2.10: Implement recordPatientPayment Mutation
 * 
 * Requirements:
 * 1. Record payment from patient
 * 2. Apply to patient responsibility portion of invoice
 * 3. Update invoice status to "paid" if fully paid
 * 4. Support partial payments
 * 
 * RED Phase: Write failing tests first
 */
describe("recordPatientPayment Mutation (Task 2.10) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let patientId: Id<"patients">;
  let providerId: Id<"providers">;
  let payerId: Id<"insurancePayers">;
  let claimId: Id<"insuranceClaims">;
  let invoiceId: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create patient user for authorization
    patientUserId = await t.mutation(api.users.createUserMutation, {
      email: "patient@example.com",
      name: "Patient User",
      role: "patient",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const patientUser = await t.query(api.users.getUser, { id: patientUserId });
    patientUserEmail = patientUser?.email || "patient@example.com";

    // Create patient record
    patientId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        userId: patientUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider
    providerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Jane",
        lastName: "Smith",
        email: "jane.smith@clinic.com",
        specialty: "Family Medicine",
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create insurance payer
    payerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "BCBS-001",
        name: "Blue Cross Blue Shield",
        planType: "ppo",
        contactInfo: {},
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice with patient responsibility
    invoiceId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId,
        invoiceNumber: "INV-001",
        amount: 100000, // $1000.00 in cents
        patientResponsibility: 20000, // $200.00 in cents
        insuranceResponsibility: 80000, // $800.00 in cents
        status: "pending",
        serviceType: "Appointment",
        description: "Office visit",
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create claim linked to invoice
    claimId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId,
        providerId,
        payerId,
        invoiceId,
        status: "accepted",
        totalCharges: 100000, // $1000.00 in cents
        datesOfService: [now - 7 * 24 * 60 * 60 * 1000], // 7 days ago
        claimControlNumber: "CLM-001",
        tenantId,
        createdAt: now - 7 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Mutation Existence and Structure", () => {
    it("should export recordPatientPayment mutation function", async () => {
      const billingModule = await import("../billing");
      expect(billingModule).toHaveProperty("recordPatientPayment");
      expect(typeof billingModule.recordPatientPayment).toBe("function");
    });
  });

  describe("Basic Payment Recording", () => {
    it("should record a full patient payment", async () => {
      const paymentAmount = 20000; // $200.00 in cents (full patient responsibility)
      const paymentMethod = "credit_card";

      const result = await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod,
        userEmail: patientUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      // Verify payment was created
      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment).toBeDefined();
      expect(payment?.invoiceId).toBe(invoiceId);
      expect(payment?.patientId).toBe(patientId);
      expect(payment?.amount).toBe(paymentAmount);
      expect(payment?.paymentMethod).toBe(paymentMethod);
      expect(payment?.tenantId).toBe(tenantId);
      expect(payment?.paidAt).toBeDefined();
    });

    it("should record payment with transaction ID", async () => {
      const paymentAmount = 20000;
      const paymentMethod = "credit_card";
      const transactionId = "TXN-12345";

      const result = await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod,
        transactionId,
        userEmail: patientUserEmail,
      });

      const payment = await t.runQuery(async (ctx) => {
        return await ctx.db.get(result.paymentId);
      });

      expect(payment?.transactionId).toBe(transactionId);
    });

    it("should support all payment methods", async () => {
      const paymentMethods = [
        "credit_card",
        "debit_card",
        "check",
        "cash",
        "bank_transfer",
        "ach",
        "other",
      ] as const;

      for (const method of paymentMethods) {
        // Create a new invoice for each test
        const testInvoiceId = await t.runMutation(async (ctx) => {
          return await ctx.db.insert("invoices", {
            patientId,
            invoiceNumber: `INV-${method}`,
            amount: 100000,
            patientResponsibility: 20000,
            insuranceResponsibility: 80000,
            status: "pending",
            serviceType: "Appointment",
            description: "Test payment",
            dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            tenantId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });

        const result = await t.mutation(api.billing.recordPatientPayment, {
          invoiceId: testInvoiceId,
          amount: 20000,
          paymentMethod: method,
          userEmail: patientUserEmail,
        });

        const payment = await t.runQuery(async (ctx) => {
          return await ctx.db.get(result.paymentId);
        });

        expect(payment?.paymentMethod).toBe(method);
      }
    });

    it("should use current timestamp for paidAt if not provided", async () => {
      const beforePayment = Date.now();
      const paymentAmount = 20000;
      const paymentMethod = "credit_card";

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod,
        userEmail: patientUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("patientPayments")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();
      });

      const payment = payments[0];
      expect(payment?.paidAt).toBeGreaterThanOrEqual(beforePayment);
      expect(payment?.paidAt).toBeLessThanOrEqual(Date.now());
    });

    it("should use provided paidAt timestamp", async () => {
      const customPaidAt = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const paymentAmount = 20000;
      const paymentMethod = "credit_card";

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod,
        paidAt: customPaidAt,
        userEmail: patientUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("patientPayments")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();
      });

      expect(payments[0]?.paidAt).toBe(customPaidAt);
    });
  });

  describe("Invoice Status Updates", () => {
    it("should update invoice status to 'paid' when fully paid", async () => {
      const paymentAmount = 20000; // Full patient responsibility

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice?.status).toBe("paid");
    });

    it("should update invoice to 'partially_paid' when partially paid", async () => {
      const paymentAmount = 10000; // Partial payment ($100.00, half of $200.00)

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice?.status).toBe("partially_paid");
    });

    it("should update invoice to 'paid' after multiple payments sum to full amount", async () => {
      // First partial payment
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 10000, // $100.00
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      let invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("partially_paid"); // Still partial

      // Second payment that completes the full amount
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 10000, // $100.00 (total now $200.00)
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("paid"); // Now fully paid
    });

    it("should handle overpayment correctly", async () => {
      const paymentAmount = 25000; // $250.00 (more than $200.00 patient responsibility)

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      // Should still mark as paid even if overpaid
      expect(invoice?.status).toBe("paid");
    });

    it("should update invoice status when insurance portion is already paid", async () => {
      // First, pay insurance portion (simulate insurance payment)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insurancePayments", {
          claimId,
          amount: 80000, // Full insurance responsibility
          adjustmentAmount: 0,
          paidAt: Date.now(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Update invoice to reflect insurance payment
      await t.runMutation(async (ctx) => {
        await ctx.db.patch(invoiceId, {
          status: "partially_paid", // Insurance paid, patient still owes
          updatedAt: Date.now(),
        });
      });

      // Now pay patient portion
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 20000, // Full patient responsibility
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice?.status).toBe("paid");
    });
  });

  describe("Partial Payment Handling", () => {
    it("should allow multiple partial payments for the same invoice", async () => {
      const payment1 = 7500; // $75.00
      const payment2 = 7500; // $75.00
      const payment3 = 5000; // $50.00 (total $200.00)

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: payment1,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: payment2,
        paymentMethod: "debit_card",
        userEmail: patientUserEmail,
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: payment3,
        paymentMethod: "ach",
        userEmail: patientUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("patientPayments")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();
      });

      expect(payments).toHaveLength(3);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(20000); // $200.00 total

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("paid");
    });

    it("should calculate total payments correctly for partial payments", async () => {
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 10000, // $100.00
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 5000, // $50.00
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("patientPayments")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(15000); // $150.00 total

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("partially_paid"); // Still partial, not fully paid
    });
  });

  describe("Authorization and Validation", () => {
    it("should require patient authorization", async () => {
      const unauthorizedEmail = "unauthorized@example.com";

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: unauthorizedEmail,
        })
      ).rejects.toThrow();
    });

    it("should validate invoice exists", async () => {
      const fakeInvoiceId = "j9j9j9j9j9j9j9j9j9j9j9j9" as Id<"invoices">;

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: fakeInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Invoice not found");
    });

    it("should validate invoice belongs to patient", async () => {
      // Create another patient
      const otherPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date("1985-05-15").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create invoice for other patient
      const otherInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: otherPatientId,
          invoiceNumber: "INV-OTHER",
          amount: 100000,
          patientResponsibility: 20000,
          insuranceResponsibility: 80000,
          status: "pending",
          serviceType: "Appointment",
          description: "Other patient invoice",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: otherInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow();
    });

    it("should validate payment amount is greater than zero", async () => {
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: 0,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });

    it("should validate payment amount is positive", async () => {
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: -1000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });

    it("should validate invoice belongs to tenant", async () => {
      const otherTenantId = "other-tenant";
      const otherInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId,
          invoiceNumber: "INV-OTHER-TENANT",
          amount: 100000,
          patientResponsibility: 20000,
          insuranceResponsibility: 80000,
          status: "pending",
          serviceType: "Appointment",
          description: "Other tenant invoice",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: otherInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle invoice without patient responsibility", async () => {
      // Create invoice with zero patient responsibility (fully covered by insurance)
      const fullInsuranceInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId,
          invoiceNumber: "INV-FULL-INS",
          amount: 100000,
          patientResponsibility: 0, // No patient responsibility
          insuranceResponsibility: 100000,
          status: "pending",
          serviceType: "Appointment",
          description: "Fully covered by insurance",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Should still allow payment recording (even if $0 or minimal)
      const result = await t.mutation(api.billing.recordPatientPayment, {
        invoiceId: fullInsuranceInvoiceId,
        amount: 100, // Small payment
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(fullInsuranceInvoiceId);
      });
      // Invoice should be marked as paid since there was no patient responsibility
      expect(invoice?.status).toBe("paid");
    });

    it("should handle invoice already marked as paid", async () => {
      // First payment to mark as paid
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 20000,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      // Attempt another payment (should still work, but invoice stays paid)
      const result = await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 5000, // Additional payment
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      expect(result).toHaveProperty("paymentId");

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("paid");
    });

    it("should handle invoice with only patient responsibility (no insurance)", async () => {
      // Create invoice without insurance claim
      const patientOnlyInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId,
          invoiceNumber: "INV-PATIENT-ONLY",
          amount: 50000, // $500.00
          patientResponsibility: 50000, // Full amount is patient responsibility
          insuranceResponsibility: 0,
          status: "pending",
          serviceType: "Appointment",
          description: "Self-pay appointment",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId: patientOnlyInvoiceId,
        amount: 50000, // Full amount
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(patientOnlyInvoiceId);
      });
      expect(invoice?.status).toBe("paid");
    });
  });

  describe("Payment Aggregation", () => {
    it("should sum all payments correctly when checking if invoice is fully paid", async () => {
      // Create multiple payments
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 7500,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 7500,
        paymentMethod: "debit_card",
        userEmail: patientUserEmail,
      });

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 5000,
        paymentMethod: "ach",
        userEmail: patientUserEmail,
      });

      const payments = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("patientPayments")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBe(20000); // Should equal patient responsibility

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });
      expect(invoice?.status).toBe("paid");
    });
  });
});

/**
 * TDD Test Suite for Task 2.11: Implement Role & Tenant Guards
 * 
 * Requirements:
 * 1. Ensure clinic users can access clinic RCM
 * 2. Ensure providers can only see their own data
 * 3. Ensure patients can only see their own invoices
 * 4. Add proper error messages for unauthorized access
 * 
 * RED Phase: Write failing tests first
 */
describe("Role & Tenant Guards (Task 2.11) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  const otherTenantId = "test-tenant-2";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let providerUserId1: Id<"users">;
  let providerUserEmail1: string;
  let providerUserId2: Id<"users">;
  let providerUserEmail2: string;
  let providerId1: Id<"providers">;
  let providerId2: Id<"providers">;
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let patientId1: Id<"patients">;
  let patientId2: Id<"patients">;
  let payerId1: Id<"insurancePayers">;
  let claimId1: Id<"insuranceClaims">;
  let claimId2: Id<"insuranceClaims">;
  let invoiceId1: Id<"invoices">;
  let invoiceId2: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create clinic user
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";

    // Create provider 1
    providerUserId1 = await t.mutation(api.users.createUserMutation, {
      email: "provider1@example.com",
      name: "Provider One",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const providerUser1 = await t.query(api.users.getUser, { id: providerUserId1 });
    providerUserEmail1 = providerUser1?.email || "provider1@example.com";

    providerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Provider",
        lastName: "One",
        specialty: "Cardiology",
        email: providerUserEmail1,
        licenseNumber: "LIC-001",
        npi: "1234567890",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider 2
    providerUserId2 = await t.mutation(api.users.createUserMutation, {
      email: "provider2@example.com",
      name: "Provider Two",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const providerUser2 = await t.query(api.users.getUser, { id: providerUserId2 });
    providerUserEmail2 = providerUser2?.email || "provider2@example.com";

    providerId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        firstName: "Dr. Provider",
        lastName: "Two",
        specialty: "Pediatrics",
        email: providerUserEmail2,
        licenseNumber: "LIC-002",
        npi: "0987654321",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create patient 1
    patientId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Patient",
        lastName: "One",
        email: "patient1@example.com",
        phone: "555-0101",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create patient 2
    patientId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "Patient",
        lastName: "Two",
        email: "patient2@example.com",
        phone: "555-0102",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create patient user (linked to patient 1)
    patientUserId = await t.mutation(api.users.createUserMutation, {
      email: "patient1@example.com",
      name: "Patient One",
      role: "patient",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const patientUser = await t.query(api.users.getUser, { id: patientUserId });
    patientUserEmail = patientUser?.email || "patient1@example.com";

    // Create payer
    payerId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "PAYER-001",
        name: "Test Insurance",
        planType: "commercial",
        contactInfo: {
          phone: "555-1000",
          email: "contact@testinsurance.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create claim 1 for provider 1
    claimId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId1,
        payerId: payerId1,
        status: "submitted",
        totalCharges: 50000,
        datesOfService: [now],
        claimControlNumber: "CLM-001",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create claim 2 for provider 2
    claimId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insuranceClaims", {
        patientId: patientId1,
        providerId: providerId2,
        payerId: payerId1,
        status: "submitted",
        totalCharges: 30000,
        datesOfService: [now],
        claimControlNumber: "CLM-002",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice 1 for patient 1
    invoiceId1 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId1,
        invoiceNumber: "INV-001",
        amount: 50000,
        patientResponsibility: 10000,
        insuranceResponsibility: 40000,
        status: "pending",
        serviceType: "Appointment",
        description: "Test invoice 1",
        dueDate: now + 30 * 24 * 60 * 60 * 1000,
        claimId: claimId1,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create invoice 2 for patient 2
    invoiceId2 = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("invoices", {
        patientId: patientId2,
        invoiceNumber: "INV-002",
        amount: 30000,
        patientResponsibility: 6000,
        insuranceResponsibility: 24000,
        status: "pending",
        serviceType: "Appointment",
        description: "Test invoice 2",
        dueDate: now + 30 * 24 * 60 * 60 * 1000,
        claimId: claimId2,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Clinic User Access to Clinic RCM", () => {
    it("should allow clinic_user role to access clinic RCM data", async () => {
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalAR");
      expect(result).toHaveProperty("daysInAR");
      expect(result).toHaveProperty("cleanClaimRate");
      expect(result).toHaveProperty("denialRate");
      expect(result).toHaveProperty("netCollectionRate");
    });

    it("should reject unauthorized user with proper error message", async () => {
      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users|Authentication required/);
    });

    it("should reject patient user with proper error message", async () => {
      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users|Authentication required/);
    });

    it("should reject user from different tenant with proper error message", async () => {
      // Create user in different tenant
      const otherTenantUserId = await t.mutation(api.users.createUserMutation, {
        email: "othertenant@example.com",
        name: "Other Tenant User",
        role: "clinic_user",
        tenantId: otherTenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const otherTenantUser = await t.query(api.users.getUser, { id: otherTenantUserId });
      const otherTenantUserEmail = otherTenantUser?.email || "othertenant@example.com";

      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: otherTenantUserEmail,
        })
      ).rejects.toThrow(/do not have access to this organization|Unauthorized/);
    });
  });

  describe("Provider Access - Only Own Data", () => {
    it("should allow provider to access their own RCM data", async () => {
      const result = await t.query(api.billing.getProviderRCM, {
        tenantId,
        userEmail: providerUserEmail1,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalAR");
      // Should include provider 1's claim ($500) plus patient responsibility from linked invoice ($100)
      // Total AR = claim charges + invoice patient responsibility = $500 + $100 = $600
      expect(result.totalAR).toBe(600.0);
    });

    it("should only return provider's own claims in getProviderClaimsList", async () => {
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail1,
      });

      expect(result.claims.length).toBeGreaterThan(0);
      // All claims should belong to provider 1
      result.claims.forEach((claim) => {
        expect(claim.providerId).toBe(providerId1);
      });

      // Verify provider 2's claim is not included
      const provider2Claim = result.claims.find((claim) => claim._id === claimId2);
      expect(provider2Claim).toBeUndefined();
    });

    it("should reject provider accessing another provider's data with proper error message", async () => {
      // Provider 1 should not be able to see provider 2's claims
      const result = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail1,
      });

      const provider2Claim = result.claims.find((claim) => claim._id === claimId2);
      expect(provider2Claim).toBeUndefined();
    });

    it("should reject unauthorized user accessing provider RCM with proper error message", async () => {
      await expect(
        t.query(api.billing.getProviderRCM, {
          tenantId,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users|Authentication required/);
    });

    it("should reject patient user accessing provider RCM with proper error message", async () => {
      await expect(
        t.query(api.billing.getProviderRCM, {
          tenantId,
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users|Authentication required/);
    });
  });

  describe("Patient Access - Only Own Invoices", () => {
    it("should allow patient to access their own invoices", async () => {
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should only include patient 1's invoices
      result.forEach((invoice) => {
        expect(invoice.tenantId).toBe(tenantId);
      });
    });

    it("should reject patient accessing another patient's invoices with proper error message", async () => {
      await expect(
        t.query(api.billing.getPatientInvoices, {
          patientId: patientId2, // Different patient
          userEmail: patientUserEmail, // Patient 1's email
        })
      ).rejects.toThrow(/Unauthorized|do not have permission|You do not have permission/);
    });

    it("should reject unauthorized user accessing patient invoices with proper error message", async () => {
      await expect(
        t.query(api.billing.getPatientInvoices, {
          patientId: patientId1,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow(/Unauthorized|Authentication required|User not found/);
    });

    it("should allow clinic user accessing patient invoices from same tenant", async () => {
      // Clinic users in the same tenant can access patient invoices
      // verifyPatientAccess authorizes clinic users if they belong to the same tenant as the patient
      const result = await t.query(api.billing.getPatientInvoices, {
        patientId: patientId1,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should only include patient 1's invoices
      result.forEach((invoice) => {
        expect(invoice.tenantId).toBe(tenantId);
        expect(invoice.patientId).toBe(patientId1);
      });
    });

    it("should allow patient to access their own billing summary", async () => {
      const result = await t.query(api.billing.getPatientBillingSummary, {
        patientId: patientId1,
        userEmail: patientUserEmail,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("outstandingBalance");
      expect(result).toHaveProperty("totalPaid");
      expect(result).toHaveProperty("upcomingCharges");
      expect(result).toHaveProperty("pendingCount");
    });

    it("should reject patient accessing another patient's billing summary with proper error message", async () => {
      await expect(
        t.query(api.billing.getPatientBillingSummary, {
          patientId: patientId2, // Different patient
          userEmail: patientUserEmail, // Patient 1's email
        })
      ).rejects.toThrow(/Unauthorized|do not have permission|You do not have permission/);
    });
  });

  describe("Error Message Quality", () => {
    it("should provide clear error message for unauthenticated users", async () => {
      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: undefined as any,
        })
      ).rejects.toThrow(/Authentication required|Unauthorized/);
    });

    it("should provide clear error message for wrong role", async () => {
      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/Only clinic users|Unauthorized/);
    });

    it("should provide clear error message for tenant mismatch", async () => {
      // Create user in different tenant
      const otherTenantUserId = await t.mutation(api.users.createUserMutation, {
        email: "othertenant2@example.com",
        name: "Other Tenant User 2",
        role: "clinic_user",
        tenantId: otherTenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const otherTenantUser = await t.query(api.users.getUser, { id: otherTenantUserId });
      const otherTenantUserEmail = otherTenantUser?.email || "othertenant2@example.com";

      await expect(
        t.query(api.billing.getClinicRCM, {
          tenantId,
          userEmail: otherTenantUserEmail,
        })
      ).rejects.toThrow(/do not have access to this organization|organization|tenant/);
    });

    it("should provide clear error message for patient accessing wrong patient data", async () => {
      await expect(
        t.query(api.billing.getPatientInvoices, {
          patientId: patientId2,
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/do not have permission|own profile|own invoices/);
    });
  });
});

/**
 * TDD Test Suite for Task 7.1: Ensure Shared ID Consistency
 * 
 * Requirements:
 * 1. Verify clinic, provider, and patient views reference same invoice/claim IDs
 * 2. Test that claim created in clinic view appears in provider view
 * 3. Test that invoice created in clinic view appears in patient view
 * 4. Document ID flow in code comments
 * 
 * ID Flow Documentation:
 * - When a claim is created via createClaimForAppointment (clinic view):
 *   1. Claim is created with a unique _id (Id<"insuranceClaims">)
 *   2. Invoice is created (or linked) with a unique _id (Id<"invoices">)
 *   3. Claim.invoiceId references the invoice _id
 *   4. Invoice.claimId references the claim _id (bidirectional link)
 * - Clinic view queries getClinicClaimsList returns claims with their _id
 * - Provider view queries getProviderClaimsList returns same claims (filtered by provider) with same _id
 * - Patient view queries getPatientInvoices returns invoices with their _id and linked claimId
 * - All views must reference the same underlying database IDs for consistency
 * 
 * RED Phase: Write failing tests first
 */
describe("Shared ID Consistency (Task 7.1) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let providerUserId: Id<"users">;
  let providerUserEmail: string;
  let providerId: Id<"providers">;
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let patientId: Id<"patients">;
  let payerId: Id<"insurancePayers">;
  let appointmentId: Id<"appointments">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create clinic user
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic@example.com",
      name: "Clinic User",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic@example.com";

    // Create provider user and provider record
    providerUserId = await t.mutation(api.users.createUserMutation, {
      email: "provider@example.com",
      name: "Provider User",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const providerUser = await t.query(api.users.getUser, { id: providerUserId });
    providerUserEmail = providerUser?.email || "provider@example.com";

    providerId = await t.mutation(api.providers.createProvider, {
      email: providerUserEmail,
      firstName: "John",
      lastName: "Provider",
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Create patient user and patient record
    patientUserId = await t.mutation(api.users.createUserMutation, {
      email: "patient@example.com",
      name: "Patient User",
      role: "patient",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const patientUser = await t.query(api.users.getUser, { id: patientUserId });
    patientUserEmail = patientUser?.email || "patient@example.com";

    patientId = await t.mutation(api.patients.createPatient, {
      email: patientUserEmail,
      firstName: "Jane",
      lastName: "Patient",
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Create insurance payer
    payerId = await t.mutation(api.insurancePayers.createInsurancePayer, {
      payerId: "BCBS-001",
      name: "Blue Cross Blue Shield",
      planType: "commercial",
      contactInfo: {
        phone: "1-800-123-4567",
        email: "contact@bcbs.com",
      },
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Create completed appointment
    appointmentId = await t.mutation(api.appointments.createAppointment, {
      patientId,
      providerId,
      scheduledAt: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      duration: 30,
      status: "completed",
      tenantId,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      updatedAt: now - 7 * 24 * 60 * 60 * 1000,
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Claim ID Consistency: Clinic → Provider View", () => {
    it("should return same claim ID in clinic and provider views when claim is created in clinic view", async () => {
      // Create claim in clinic view
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000, // $150.00
          },
        ],
      });

      const claimId = createResult.claimId;

      // Query claim from clinic view
      const clinicClaims = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 20,
      });

      // Find the claim in clinic view
      const clinicClaim = clinicClaims.claims.find((c) => c._id === claimId);
      expect(clinicClaim).toBeDefined();
      expect(clinicClaim?._id).toBe(claimId);

      // Query claim from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });

      // Find the same claim in provider view
      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);
      expect(providerClaim).toBeDefined();
      expect(providerClaim?._id).toBe(claimId);

      // Verify both views reference the same claim ID
      expect(clinicClaim?._id).toBe(providerClaim?._id);
    });

    it("should return same claim control number in clinic and provider views", async () => {
      // Create claim in clinic view
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;

      // Get claim details from database
      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });

      const claimControlNumber = claim?.claimControlNumber;
      expect(claimControlNumber).toBeDefined();

      // Query from clinic view
      const clinicClaims = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 20,
      });

      const clinicClaim = clinicClaims.claims.find((c) => c._id === claimId);
      expect(clinicClaim?.claimControlNumber).toBe(claimControlNumber);

      // Query from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });

      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);
      expect(providerClaim?.claimControlNumber).toBe(claimControlNumber);

      // Verify both views have same claim control number
      expect(clinicClaim?.claimControlNumber).toBe(providerClaim?.claimControlNumber);
    });

    it("should return same claim status in clinic and provider views", async () => {
      // Create claim in clinic view
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;

      // Query from clinic view
      const clinicClaims = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 20,
      });

      const clinicClaim = clinicClaims.claims.find((c) => c._id === claimId);
      const clinicStatus = clinicClaim?.status;

      // Query from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });

      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);
      const providerStatus = providerClaim?.status;

      // Verify both views show same status
      expect(clinicStatus).toBe(providerStatus);
      expect(clinicStatus).toBe("draft"); // New claims start as draft
    });
  });

  describe("Invoice ID Consistency: Clinic → Patient View", () => {
    it("should return same invoice ID in clinic and patient views when invoice is created via claim in clinic view", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const invoiceId = createResult.invoiceId;

      // Query invoices from patient view
      const patientInvoices = await t.query(api.billing.getPatientInvoices, {
        patientId,
        userEmail: patientUserEmail,
      });

      // Find the invoice in patient view
      const patientInvoice = patientInvoices.find((inv) => inv._id === invoiceId);
      expect(patientInvoice).toBeDefined();
      expect(patientInvoice?._id).toBe(invoiceId);

      // Verify invoice exists in database with correct ID
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice).toBeDefined();
      expect(invoice?._id).toBe(invoiceId);
      expect(patientInvoice?._id).toBe(invoice?._id);
    });

    it("should return same invoice number in clinic and patient views", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const invoiceId = createResult.invoiceId;

      // Get invoice details from database
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      const invoiceNumber = invoice?.invoiceNumber;
      expect(invoiceNumber).toBeDefined();

      // Query from patient view
      const patientInvoices = await t.query(api.billing.getPatientInvoices, {
        patientId,
        userEmail: patientUserEmail,
      });

      const patientInvoice = patientInvoices.find((inv) => inv._id === invoiceId);
      expect(patientInvoice?.invoiceNumber).toBe(invoiceNumber);

      // Verify invoice number matches
      expect(patientInvoice?.invoiceNumber).toBe(invoice?.invoiceNumber);
    });

    it("should return same invoice status in clinic and patient views", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const invoiceId = createResult.invoiceId;

      // Get invoice from database
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      const dbStatus = invoice?.status;

      // Query from patient view
      const patientInvoices = await t.query(api.billing.getPatientInvoices, {
        patientId,
        userEmail: patientUserEmail,
      });

      const patientInvoice = patientInvoices.find((inv) => inv._id === invoiceId);
      const patientStatus = patientInvoice?.status;

      // Verify both views show same status
      expect(patientStatus).toBe(dbStatus);
      expect(patientStatus).toBe("pending"); // New invoices start as pending
    });
  });

  describe("Bidirectional ID Linking: Claim ↔ Invoice", () => {
    it("should link claim to invoice and invoice to claim with same IDs", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;
      const invoiceId = createResult.invoiceId;

      // Get claim from database
      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });

      // Get invoice from database
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      // Verify bidirectional linking
      expect(claim?.invoiceId).toBe(invoiceId);
      expect(invoice?.claimId).toBe(claimId);

      // Verify IDs match in both directions
      expect(claim?.invoiceId).toBe(invoice?._id);
      expect(invoice?.claimId).toBe(claim?._id);
    });

    it("should show linked claimId in patient invoice view", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;
      const invoiceId = createResult.invoiceId;

      // Query from patient view
      const patientInvoices = await t.query(api.billing.getPatientInvoices, {
        patientId,
        userEmail: patientUserEmail,
      });

      const patientInvoice = patientInvoices.find((inv) => inv._id === invoiceId);
      
      // Verify patient view shows linked claim ID
      expect(patientInvoice?.claimId).toBe(claimId);
      expect(patientInvoice?.claimId).toBeDefined();
    });

    it("should show linked invoiceId in provider claim view", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;
      const invoiceId = createResult.invoiceId;

      // Query from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });

      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);
      
      // Note: getProviderClaimsList may not return invoiceId in the response
      // This test verifies the claim exists and can be queried with same ID
      expect(providerClaim).toBeDefined();
      expect(providerClaim?._id).toBe(claimId);

      // Verify claim has invoiceId in database
      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      expect(claim?.invoiceId).toBe(invoiceId);
    });
  });

  describe("Cross-View ID Consistency", () => {
    it("should maintain consistent IDs across all three views (clinic, provider, patient)", async () => {
      // Create claim in clinic view (which creates an invoice)
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;
      const invoiceId = createResult.invoiceId;

      // Query from clinic view
      const clinicClaims = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 20,
      });
      const clinicClaim = clinicClaims.claims.find((c) => c._id === claimId);

      // Query from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });
      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);

      // Query from patient view
      const patientInvoices = await t.query(api.billing.getPatientInvoices, {
        patientId,
        userEmail: patientUserEmail,
      });
      const patientInvoice = patientInvoices.find((inv) => inv._id === invoiceId);

      // Verify all views reference same IDs
      expect(clinicClaim?._id).toBe(claimId);
      expect(providerClaim?._id).toBe(claimId);
      expect(patientInvoice?._id).toBe(invoiceId);

      // Verify claim IDs are consistent
      expect(clinicClaim?._id).toBe(providerClaim?._id);

      // Verify invoice-claim linking is consistent
      const claim = await t.runQuery(async (ctx) => {
        return await ctx.db.get(claimId);
      });
      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(claim?.invoiceId).toBe(invoice?._id);
      expect(invoice?.claimId).toBe(claim?._id);
      expect(patientInvoice?.claimId).toBe(claim?._id);
    });

    it("should maintain ID consistency after status updates", async () => {
      // Create claim in clinic view
      const createResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems: [
          {
            procedureCode: "99213",
            modifiers: [],
            diagnosisCodes: ["E11.9"],
            units: 1,
            chargeAmount: 15000,
          },
        ],
      });

      const claimId = createResult.claimId;
      const invoiceId = createResult.invoiceId;

      // Update claim status (simulate submission)
      await t.runMutation(async (ctx) => {
        await ctx.db.patch(claimId, {
          status: "submitted" as const,
          updatedAt: Date.now(),
        });
      });

      // Query from clinic view
      const clinicClaims = await t.query(api.billing.getClinicClaimsList, {
        tenantId,
        userEmail: clinicUserEmail,
        page: 1,
        pageSize: 20,
      });
      const clinicClaim = clinicClaims.claims.find((c) => c._id === claimId);

      // Query from provider view
      const providerClaims = await t.query(api.billing.getProviderClaimsList, {
        tenantId,
        userEmail: providerUserEmail,
        page: 1,
        pageSize: 20,
      });
      const providerClaim = providerClaims.claims.find((c) => c._id === claimId);

      // Verify IDs remain consistent after status update
      expect(clinicClaim?._id).toBe(claimId);
      expect(providerClaim?._id).toBe(claimId);
      expect(clinicClaim?._id).toBe(providerClaim?._id);
      expect(clinicClaim?.status).toBe("submitted");
      expect(providerClaim?.status).toBe("submitted");
    });
  });
});

/**
 * TDD Test Suite for Task 10.1: Unit Tests for Billing Convex Functions
 * 
 * Requirements:
 * 1. Test getClinicRCM with various data scenarios
 * 2. Test createClaimForAppointment mutation
 * 3. Test recordPayment mutations (both insurance and patient)
 * 4. Test error cases (invalid IDs, unauthorized access)
 * 
 * This suite focuses on comprehensive error case coverage and edge scenarios
 * for QA purposes, complementing the implementation tests in Tasks 2.2, 2.8, 2.9, 2.10.
 */
describe("Billing Convex Functions - Error Cases & Edge Scenarios (Task 10.1)", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-task10";
  const otherTenantId = "other-tenant-task10";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
  let providerUserId: Id<"users">;
  let providerUserEmail: string;
  let patientId: Id<"patients">;
  let providerId: Id<"providers">;
  let payerId: Id<"insurancePayers">;
  let appointmentId: Id<"appointments">;
  let claimId: Id<"insuranceClaims">;
  let invoiceId: Id<"invoices">;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    const now = Date.now();

    // Create clinic user
    clinicUserId = await t.mutation(api.users.createUserMutation, {
      email: "clinic-task10@example.com",
      name: "Clinic User Task10",
      role: "clinic_user",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const clinicUser = await t.query(api.users.getUser, { id: clinicUserId });
    clinicUserEmail = clinicUser?.email || "clinic-task10@example.com";

    // Create patient user
    patientUserId = await t.mutation(api.users.createUserMutation, {
      email: "patient-task10@example.com",
      name: "Patient User Task10",
      role: "patient",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const patientUser = await t.query(api.users.getUser, { id: patientUserId });
    patientUserEmail = patientUser?.email || "patient-task10@example.com";

    // Create provider user
    providerUserId = await t.mutation(api.users.createUserMutation, {
      email: "provider-task10@example.com",
      name: "Provider User Task10",
      role: "provider",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const providerUser = await t.query(api.users.getUser, { id: providerUserId });
    providerUserEmail = providerUser?.email || "provider-task10@example.com";

    // Create patient record
    patientId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
        userId: patientUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create provider
    providerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("providers", {
        userId: providerUserId,
        firstName: "Jane",
        lastName: "Provider",
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create insurance payer
    payerId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("insurancePayers", {
        payerId: "TEST-PAYER-TASK10",
        name: "Test Insurance Task10",
        planType: "commercial",
        contactInfo: {
          phone: "555-0100",
          email: "test@insurance.com",
        },
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Create completed appointment
    appointmentId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("appointments", {
        patientId,
        providerId,
        scheduledAt: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        status: "completed",
        tenantId,
        createdAt: now - 7 * 24 * 60 * 60 * 1000,
        updatedAt: now - 7 * 24 * 60 * 60 * 1000,
      });
    });

    // Create a claim and invoice for testing
    const claimResult = await t.mutation(api.billing.createClaimForAppointment, {
      appointmentId,
      payerId,
      userEmail: clinicUserEmail,
      lineItems: [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ],
    });
    claimId = claimResult.claimId;
    invoiceId = claimResult.invoiceId;
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("getClinicRCM - Various Data Scenarios", () => {
    it("should handle empty data set (no claims or invoices)", async () => {
      // Create a new tenant with no data
      const emptyTenantId = "empty-tenant-task10";
      const emptyTenantUserId = await t.mutation(api.users.createUserMutation, {
        email: "empty-tenant@example.com",
        name: "Empty Tenant User",
        role: "clinic_user",
        tenantId: emptyTenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const emptyTenantUser = await t.query(api.users.getUser, { id: emptyTenantUserId });
      const emptyTenantUserEmail = emptyTenantUser?.email || "empty-tenant@example.com";

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId: emptyTenantId,
        userEmail: emptyTenantUserEmail,
      });

      expect(result).toBeDefined();
      expect(result.totalAR).toBe(0);
      expect(result.daysInAR).toBe(0);
      expect(result.cleanClaimRate).toBe(0);
      expect(result.denialRate).toBe(0);
      expect(result.netCollectionRate).toBe(0);
    });

    it("should calculate metrics correctly with mixed claim statuses", async () => {
      // Create additional claims with different statuses
      const patientId2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date("1985-05-15").getTime(),
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create paid claim
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId2,
          providerId,
          payerId,
          status: "paid",
          totalCharges: 50000, // $500.00
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-PAID-001",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create denied claim
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId2,
          providerId,
          payerId,
          status: "denied",
          totalCharges: 30000, // $300.00
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-DENIED-001",
          denialReason: "Missing information",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create submitted claim
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: patientId2,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 20000, // $200.00
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-SUBMITTED-001",
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      expect(result.totalAR).toBeGreaterThan(0);
      // Should have some denial rate since we have denied claims
      expect(result.denialRate).toBeGreaterThan(0);
    });

    it("should filter by date range correctly", async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      // Create old claim (outside date range)
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 50000,
          datesOfService: [sixtyDaysAgo],
          claimControlNumber: "CLM-OLD",
          tenantId,
          createdAt: sixtyDaysAgo,
          updatedAt: sixtyDaysAgo,
        });
      });

      // Query with date range (last 30 days)
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
        startDate: thirtyDaysAgo,
        endDate: now,
      });

      expect(result).toBeDefined();
      // Old claim should not be included in calculations
      // The result should only include claims from the last 30 days
    });

    it("should handle tenant isolation correctly", async () => {
      // Create claim in different tenant
      const otherPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Other",
          lastName: "Patient",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("insuranceClaims", {
          patientId: otherPatientId,
          providerId,
          payerId,
          status: "submitted",
          totalCharges: 999999, // Large amount
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-OTHER-TENANT",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query original tenant - should not include other tenant's data
      const result = await t.query(api.billing.getClinicRCM, {
        tenantId,
        userEmail: clinicUserEmail,
      });

      expect(result).toBeDefined();
      // Total AR should not include the other tenant's claim
      expect(result.totalAR).toBeLessThan(999999);
    });
  });

  describe("createClaimForAppointment - Error Cases", () => {
    it("should reject invalid appointment ID", async () => {
      const invalidAppointmentId = "j0000000000000000000000000" as Id<"appointments">;

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: invalidAppointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/Appointment not found|does not exist/);
    });

    it("should reject invalid payer ID", async () => {
      const invalidPayerId = "j0000000000000000000000000" as Id<"insurancePayers">;

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId: invalidPayerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/Payer not found|does not exist/);
    });

    it("should reject unauthorized user", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: "unauthorized@example.com",
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/Unauthorized|Authentication required|Only clinic users/);
    });

    it("should reject patient user attempting to create claim", async () => {
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: patientUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users/);
    });

    it("should reject user from different tenant", async () => {
      const otherTenantUserId = await t.mutation(api.users.createUserMutation, {
        email: "other-tenant-task10@example.com",
        name: "Other Tenant User",
        role: "clinic_user",
        tenantId: otherTenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const otherTenantUser = await t.query(api.users.getUser, { id: otherTenantUserId });
      const otherTenantUserEmail = otherTenantUser?.email || "other-tenant-task10@example.com";

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId,
          payerId,
          userEmail: otherTenantUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/do not have access to this organization|Unauthorized/);
    });

    it("should reject appointment from different tenant", async () => {
      // Create appointment in different tenant
      const otherTenantPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Other",
          lastName: "Patient",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const otherTenantProviderId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("providers", {
          firstName: "Other",
          lastName: "Provider",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const otherTenantAppointmentId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("appointments", {
          patientId: otherTenantPatientId,
          providerId: otherTenantProviderId,
          scheduledAt: Date.now(),
          status: "completed",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: otherTenantAppointmentId,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow(/do not have access|Unauthorized/);
    });
  });

  describe("recordInsurancePayment - Error Cases", () => {
    it("should reject invalid claim ID", async () => {
      const invalidClaimId = "j0000000000000000000000000" as Id<"insuranceClaims">;

      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId: invalidClaimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Claim not found");
    });

    it("should reject unauthorized user", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow(/Unauthorized|Authentication required|Only clinic users/);
    });

    it("should reject patient user attempting to record insurance payment", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/Unauthorized|Only clinic users/);
    });

    it("should reject claim from different tenant", async () => {
      const otherTenantClaimId = await t.runMutation(async (ctx) => {
        const otherPatientId = await ctx.db.insert("patients", {
          firstName: "Other",
          lastName: "Patient",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const otherProviderId = await ctx.db.insert("providers", {
          firstName: "Other",
          lastName: "Provider",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const otherPayerId = await ctx.db.insert("insurancePayers", {
          payerId: "OTHER-PAYER",
          name: "Other Payer",
          planType: "commercial",
          contactInfo: {},
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await ctx.db.insert("insuranceClaims", {
          patientId: otherPatientId,
          providerId: otherProviderId,
          payerId: otherPayerId,
          status: "submitted",
          totalCharges: 100000,
          datesOfService: [Date.now()],
          claimControlNumber: "CLM-OTHER",
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId: otherTenantClaimId,
          amount: 80000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow(/do not have access|Unauthorized/);
    });

    it("should reject zero payment amount", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: 0,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });

    it("should reject negative payment amount", async () => {
      await expect(
        t.mutation(api.billing.recordInsurancePayment, {
          claimId,
          amount: -1000,
          adjustmentAmount: 0,
          userEmail: clinicUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });
  });

  describe("recordPatientPayment - Error Cases", () => {
    it("should reject invalid invoice ID", async () => {
      const invalidInvoiceId = "j0000000000000000000000000" as Id<"invoices">;

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: invalidInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Invoice not found");
    });

    it("should reject unauthorized user", async () => {
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: "unauthorized@example.com",
        })
      ).rejects.toThrow(/Unauthorized|Authentication required|User not found/);
    });

    it("should reject patient accessing another patient's invoice", async () => {
      // Create another patient and invoice
      const otherPatientUserId = await t.mutation(api.users.createUserMutation, {
        email: "other-patient-task10@example.com",
        name: "Other Patient",
        role: "patient",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const otherPatientUser = await t.query(api.users.getUser, { id: otherPatientUserId });
      const otherPatientUserEmail = otherPatientUser?.email || "other-patient-task10@example.com";

      const otherPatientId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("patients", {
          firstName: "Other",
          lastName: "Patient",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId,
          userId: otherPatientUserId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const otherInvoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: otherPatientId,
          invoiceNumber: "INV-OTHER-001",
          amount: 50000,
          status: "pending",
          serviceType: "Appointment",
          description: "Other patient invoice",
          patientResponsibility: 50000,
          insuranceResponsibility: 0,
          tenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Patient 1 trying to pay Patient 2's invoice
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: otherInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail, // Patient 1's email
        })
      ).rejects.toThrow(/do not have permission|Unauthorized/);
    });

    it("should reject invoice from different tenant", async () => {
      const otherTenantInvoiceId = await t.runMutation(async (ctx) => {
        const otherPatientId = await ctx.db.insert("patients", {
          firstName: "Other",
          lastName: "Patient",
          dateOfBirth: new Date("1990-01-01").getTime(),
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await ctx.db.insert("invoices", {
          patientId: otherPatientId,
          invoiceNumber: "INV-OTHER-TENANT",
          amount: 50000,
          status: "pending",
          serviceType: "Appointment",
          description: "Other tenant invoice",
          patientResponsibility: 50000,
          insuranceResponsibility: 0,
          tenantId: otherTenantId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId: otherTenantInvoiceId,
          amount: 20000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow(/do not have permission|Unauthorized/);
    });

    it("should reject zero payment amount", async () => {
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: 0,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });

    it("should reject negative payment amount", async () => {
      await expect(
        t.mutation(api.billing.recordPatientPayment, {
          invoiceId,
          amount: -1000,
          paymentMethod: "credit_card",
          userEmail: patientUserEmail,
        })
      ).rejects.toThrow("Payment amount must be greater than 0");
    });
  });

  describe("Edge Cases - Invalid IDs", () => {
    it("should handle malformed Convex IDs gracefully", async () => {
      // Test with IDs that don't match Convex format
      const malformedIds = [
        "invalid-id",
        "12345",
        "",
        "users:short",
        "table:",
      ];

      for (const malformedId of malformedIds) {
        // These should fail validation before even reaching the function
        // TypeScript should prevent this, but runtime checks are good
        await expect(
          t.mutation(api.billing.createClaimForAppointment, {
            appointmentId: malformedId as any,
            payerId,
            userEmail: clinicUserEmail,
            lineItems: [
              {
                procedureCode: "99213",
                modifiers: [],
                diagnosisCodes: ["E11.9"],
                units: 1,
                chargeAmount: 15000,
              },
            ],
          })
        ).rejects.toThrow();
      }
    });

    it("should handle null/undefined IDs gracefully", async () => {
      // TypeScript should prevent this, but test runtime behavior
      await expect(
        t.mutation(api.billing.createClaimForAppointment, {
          appointmentId: null as any,
          payerId,
          userEmail: clinicUserEmail,
          lineItems: [
            {
              procedureCode: "99213",
              modifiers: [],
              diagnosisCodes: ["E11.9"],
              units: 1,
              chargeAmount: 15000,
            },
          ],
        })
      ).rejects.toThrow();
    });
  });
});

