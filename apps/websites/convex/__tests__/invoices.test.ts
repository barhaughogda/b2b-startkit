import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

/**
 * TDD Test Suite for Task 1.3: Extend invoices Table Schema
 * 
 * RED Phase: These tests will fail initially until schema is updated
 * 
 * Requirements:
 * - Add claimId (optional reference to insuranceClaims)
 * - Add patientResponsibility (number in cents)
 * - Add insuranceResponsibility (number in cents)
 * - Update status enum to support RCM workflow
 * - Add indexes for efficient queries by claim, patient, status
 */

// Minimal test functions for schema validation
// These will be registered with the ConvexTestingHelper

export const testCreateInvoice = mutation({
  args: {
    patientId: v.id("patients"),
    invoiceNumber: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
      v.literal("draft"), // New status
      v.literal("submitted"), // New status
      v.literal("denied"), // New status
      v.literal("partially_paid") // New status
    ),
    serviceType: v.string(),
    description: v.string(),
    dueDate: v.number(),
    tenantId: v.string(),
    // New fields from Task 1.3
    claimId: v.optional(v.id("insuranceClaims")),
    patientResponsibility: v.number(),
    insuranceResponsibility: v.number(),
    appointmentId: v.optional(v.id("appointments")),
    paidDate: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invoices", {
      patientId: args.patientId,
      invoiceNumber: args.invoiceNumber,
      amount: args.amount,
      status: args.status,
      serviceType: args.serviceType,
      description: args.description,
      dueDate: args.dueDate,
      tenantId: args.tenantId,
      claimId: args.claimId,
      patientResponsibility: args.patientResponsibility,
      insuranceResponsibility: args.insuranceResponsibility,
      appointmentId: args.appointmentId,
      paidDate: args.paidDate,
      paymentMethod: args.paymentMethod,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const testGetInvoice = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const testGetInvoicesByClaim = query({
  args: { claimId: v.id("insuranceClaims") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
      .collect();
  },
});

export const testGetInvoicesByStatus = query({
  args: { status: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});

export const testGetInvoicesByPatientAndStatus = query({
  args: {
    patientId: v.id("patients"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_patient_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", args.status)
      )
      .collect();
  },
});

describe("Invoices Schema Extension (Task 1.3) - RED Phase", () => {
  let t: ConvexTestingHelper<typeof schema>;
  let testPatientId: Id<"patients">;

  beforeEach(async () => {
    t = new ConvexTestingHelper(schema);
    await t.setup();

    // Create a test patient for invoice tests
    // Using direct db access since we need a patient
    testPatientId = await t.runMutation(async (ctx) => {
      return await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId: "test-tenant",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Schema Field Validation", () => {
    it("should accept invoice with claimId field", async () => {
      const invoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-001",
          amount: 10000, // $100.00 in cents
          status: "pending",
          serviceType: "Appointment",
          description: "Test invoice",
          dueDate: Date.now() + 86400000, // Tomorrow
          tenantId: "test-tenant",
          claimId: "insuranceClaims:test123" as Id<"insuranceClaims">,
          patientResponsibility: 2000, // $20.00 in cents
          insuranceResponsibility: 8000, // $80.00 in cents
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(invoiceId).toBeDefined();

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice).toHaveProperty("claimId");
      expect(invoice?.claimId).toBe("insuranceClaims:test123");
      expect(invoice?.patientResponsibility).toBe(2000);
      expect(invoice?.insuranceResponsibility).toBe(8000);
    });

    it("should accept invoice without claimId (optional field)", async () => {
      const invoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-002",
          amount: 5000,
          status: "pending",
          serviceType: "Lab Services",
          description: "Test invoice without claim",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 5000,
          insuranceResponsibility: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(invoiceId).toBeDefined();

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice).toHaveProperty("claimId");
      expect(invoice?.claimId).toBeUndefined();
      expect(invoice?.patientResponsibility).toBe(5000);
      expect(invoice?.insuranceResponsibility).toBe(0);
    });

    it("should require patientResponsibility field", async () => {
      await expect(
        t.runMutation(async (ctx) => {
          return await ctx.db.insert("invoices", {
            patientId: testPatientId,
            invoiceNumber: "INV-003",
            amount: 10000,
            status: "pending",
            serviceType: "Procedure",
            description: "Test invoice",
            dueDate: Date.now() + 86400000,
            tenantId: "test-tenant",
            insuranceResponsibility: 8000,
            // Missing patientResponsibility - should fail schema validation
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any);
        })
      ).rejects.toThrow();
    });

    it("should require insuranceResponsibility field", async () => {
      await expect(
        t.runMutation(async (ctx) => {
          return await ctx.db.insert("invoices", {
            patientId: testPatientId,
            invoiceNumber: "INV-004",
            amount: 10000,
            status: "pending",
            serviceType: "Consultation",
            description: "Test invoice",
            dueDate: Date.now() + 86400000,
            tenantId: "test-tenant",
            patientResponsibility: 2000,
            // Missing insuranceResponsibility - should fail schema validation
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any);
        })
      ).rejects.toThrow();
    });

    it("should accept patientResponsibility and insuranceResponsibility that sum to amount", async () => {
      const invoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-006",
          amount: 10000, // $100.00
          status: "pending",
          serviceType: "Appointment",
          description: "Test invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 2000, // $20.00
          insuranceResponsibility: 8000, // $80.00
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(invoiceId).toBeDefined();

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      expect(invoice?.patientResponsibility).toBe(2000);
      expect(invoice?.insuranceResponsibility).toBe(8000);
      expect(invoice?.amount).toBe(10000);
    });
  });

  describe("Status Enum Extension", () => {
    it("should accept expanded status values for RCM workflow", async () => {
      const statuses = [
        "draft", // New: claim not yet submitted
        "submitted", // New: claim submitted to insurance
        "pending", // Existing
        "paid", // Existing
        "denied", // New: claim denied by insurance
        "partially_paid", // New: partial payment received
        "overdue", // Existing
        "cancelled", // Existing
      ] as const;

      for (const status of statuses) {
        const invoiceId = await t.runMutation(async (ctx) => {
          return await ctx.db.insert("invoices", {
            patientId: testPatientId,
            invoiceNumber: `INV-${status.toUpperCase()}`,
            amount: 10000,
            status: status as any, // Type assertion for testing
            serviceType: "Appointment",
            description: `Test invoice with ${status} status`,
            dueDate: Date.now() + 86400000,
            tenantId: "test-tenant",
            patientResponsibility: 2000,
            insuranceResponsibility: 8000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });

        expect(invoiceId).toBeDefined();

        const invoice = await t.runQuery(async (ctx) => {
          return await ctx.db.get(invoiceId);
        });

        expect(invoice?.status).toBe(status);
      }
    });
  });

  describe("Index Validation", () => {
    it("should support efficient querying by claimId", async () => {
      const claimId = "insuranceClaims:claim123" as Id<"insuranceClaims">;

      // Create multiple invoices with same claimId
      const invoice1 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-CLAIM-001",
          amount: 10000,
          status: "pending",
          serviceType: "Appointment",
          description: "Invoice 1",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          claimId: claimId,
          patientResponsibility: 2000,
          insuranceResponsibility: 8000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const invoice2 = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-CLAIM-002",
          amount: 15000,
          status: "pending",
          serviceType: "Procedure",
          description: "Invoice 2",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          claimId: claimId,
          patientResponsibility: 3000,
          insuranceResponsibility: 12000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query invoices by claimId (should use index)
      const invoicesByClaim = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("invoices")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId))
          .collect();
      });

      expect(invoicesByClaim).toHaveLength(2);
      expect(invoicesByClaim?.map((inv) => inv._id)).toContain(invoice1);
      expect(invoicesByClaim?.map((inv) => inv._id)).toContain(invoice2);
    });

    it("should support efficient querying by status", async () => {
      // Create invoices with different statuses
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-STATUS-001",
          amount: 10000,
          status: "pending",
          serviceType: "Appointment",
          description: "Pending invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 2000,
          insuranceResponsibility: 8000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-STATUS-002",
          amount: 15000,
          status: "paid",
          serviceType: "Procedure",
          description: "Paid invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 3000,
          insuranceResponsibility: 12000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query invoices by status (should use index)
      const pendingInvoices = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("invoices")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .filter((q) => q.eq(q.field("tenantId"), "test-tenant"))
          .collect();
      });

      expect(pendingInvoices?.length).toBeGreaterThan(0);
      expect(pendingInvoices?.every((inv) => inv.status === "pending")).toBe(
        true
      );
    });

    it("should support efficient querying by patientId and status", async () => {
      // Create invoices for same patient with different statuses
      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-PATIENT-001",
          amount: 10000,
          status: "pending",
          serviceType: "Appointment",
          description: "Pending invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 2000,
          insuranceResponsibility: 8000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-PATIENT-002",
          amount: 15000,
          status: "paid",
          serviceType: "Procedure",
          description: "Paid invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 3000,
          insuranceResponsibility: 12000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query invoices by patientId and status (should use composite index)
      const patientPendingInvoices = await t.runQuery(async (ctx) => {
        return await ctx.db
          .query("invoices")
          .withIndex("by_patient_status", (q) =>
            q.eq("patientId", testPatientId).eq("status", "pending")
          )
          .collect();
      });

      expect(patientPendingInvoices?.length).toBeGreaterThan(0);
      expect(
        patientPendingInvoices?.every(
          (inv) => inv.patientId === testPatientId && inv.status === "pending"
        )
      ).toBe(true);
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain compatibility with existing invoice structure", async () => {
      // Create invoice with all existing fields plus new ones
      const invoiceId = await t.runMutation(async (ctx) => {
        return await ctx.db.insert("invoices", {
          patientId: testPatientId,
          invoiceNumber: "INV-COMPAT-001",
          amount: 10000,
          status: "pending",
          serviceType: "Appointment",
          description: "Test invoice",
          dueDate: Date.now() + 86400000,
          tenantId: "test-tenant",
          patientResponsibility: 2000,
          insuranceResponsibility: 8000,
          appointmentId: undefined,
          paidDate: undefined,
          paymentMethod: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(invoiceId).toBeDefined();

      const invoice = await t.runQuery(async (ctx) => {
        return await ctx.db.get(invoiceId);
      });

      // Verify all existing fields are still present
      expect(invoice).toHaveProperty("patientId");
      expect(invoice).toHaveProperty("invoiceNumber");
      expect(invoice).toHaveProperty("amount");
      expect(invoice).toHaveProperty("status");
      expect(invoice).toHaveProperty("serviceType");
      expect(invoice).toHaveProperty("description");
      expect(invoice).toHaveProperty("dueDate");
      expect(invoice).toHaveProperty("tenantId");
      expect(invoice).toHaveProperty("createdAt");
      expect(invoice).toHaveProperty("updatedAt");
      // Verify new fields are present
      expect(invoice).toHaveProperty("patientResponsibility");
      expect(invoice).toHaveProperty("insuranceResponsibility");
    });
  });
});
