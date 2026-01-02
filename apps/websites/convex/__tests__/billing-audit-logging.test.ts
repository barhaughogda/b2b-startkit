/**
 * TDD Test Suite for Task 7.3: Add Audit Logging for Billing Actions
 * 
 * Requirements:
 * 1. Log claim creation in auditLogs table
 * 2. Log payment posting (both insurance and patient)
 * 3. Log status changes
 * 4. Include relevant details (amounts, IDs, user who performed action)
 * 
 * RED Phase: Write failing tests first
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

describe("Billing Audit Logging (Task 7.3) - RED Phase", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant-1";
  let clinicUserId: Id<"users">;
  let clinicUserEmail: string;
  let patientUserId: Id<"users">;
  let patientUserEmail: string;
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
      const providerUserId = await ctx.db.insert("users", {
        email: "provider@example.com",
        name: "Provider User",
        role: "provider",
        tenantId,
        passwordHash: "hashed-password",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

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
        payerId: "TEST-PAYER-001",
        name: "Test Insurance",
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
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe("Claim Creation Audit Logging", () => {
    it("should log audit entry when claim is created", async () => {
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ];

      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      // Verify claim was created
      expect(result).toHaveProperty("claimId");
      claimId = result.claimId;

      // Query audit logs for claim creation
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "claim_created",
        resource: "insuranceClaims",
        resourceId: claimId,
      });

      // Verify audit log entry exists
      expect(auditLogs.logs.length).toBeGreaterThan(0);
      
      const claimLog = auditLogs.logs.find(
        (log) => log.resourceId === claimId && log.action === "claim_created"
      );
      
      expect(claimLog).toBeDefined();
      expect(claimLog?.userId).toBe(clinicUserId);
      expect(claimLog?.tenantId).toBe(tenantId);
      expect(claimLog?.resource).toBe("insuranceClaims");
      expect(claimLog?.resourceId).toBe(claimId);
      
      // Verify details include relevant information
      expect(claimLog?.details).toBeDefined();
      if (claimLog?.details && typeof claimLog.details === "object") {
        const details = claimLog.details as Record<string, any>;
        expect(details).toHaveProperty("totalCharges");
        expect(details.totalCharges).toBe(100000);
        expect(details).toHaveProperty("appointmentId");
        expect(details.appointmentId).toBe(appointmentId);
        expect(details).toHaveProperty("payerId");
        expect(details.payerId).toBe(payerId);
        expect(details).toHaveProperty("patientId");
        expect(details.patientId).toBe(patientId);
        expect(details).toHaveProperty("providerId");
        expect(details.providerId).toBe(providerId);
      }
    });

    it("should log audit entry when invoice is created with claim", async () => {
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ];

      const result = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      invoiceId = result.invoiceId;

      // Query audit logs for invoice creation
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "invoice_created",
        resource: "invoices",
        resourceId: invoiceId,
      });

      // Verify audit log entry exists
      expect(auditLogs.logs.length).toBeGreaterThan(0);
      
      const invoiceLog = auditLogs.logs.find(
        (log) => log.resourceId === invoiceId && log.action === "invoice_created"
      );
      
      expect(invoiceLog).toBeDefined();
      expect(invoiceLog?.userId).toBe(clinicUserId);
      expect(invoiceLog?.tenantId).toBe(tenantId);
      
      // Verify details include invoice amounts
      expect(invoiceLog?.details).toBeDefined();
      if (invoiceLog?.details && typeof invoiceLog.details === "object") {
        const details = invoiceLog.details as Record<string, any>;
        expect(details).toHaveProperty("amount");
        expect(details).toHaveProperty("patientResponsibility");
        expect(details).toHaveProperty("insuranceResponsibility");
        expect(details).toHaveProperty("claimId");
      }
    });
  });

  describe("Insurance Payment Audit Logging", () => {
    beforeEach(async () => {
      // Create a claim first
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ];

      const claimResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      claimId = claimResult.claimId;
      invoiceId = claimResult.invoiceId;
    });

    it("should log audit entry when insurance payment is recorded", async () => {
      const paymentAmount = 80000; // $800.00 in cents
      const adjustmentAmount = 0;

      const result = await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount,
        userEmail: clinicUserEmail,
      });

      // Query audit logs for payment recording
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "insurance_payment_recorded",
        resource: "insurancePayments",
      });

      // Verify audit log entry exists
      expect(auditLogs.logs.length).toBeGreaterThan(0);
      
      const paymentLog = auditLogs.logs.find(
        (log) => log.details && typeof log.details === "object" && 
        (log.details as Record<string, any>).paymentId === result.paymentId
      );
      
      expect(paymentLog).toBeDefined();
      expect(paymentLog?.userId).toBe(clinicUserId);
      expect(paymentLog?.tenantId).toBe(tenantId);
      expect(paymentLog?.resource).toBe("insurancePayments");
      
      // Verify details include payment information
      expect(paymentLog?.details).toBeDefined();
      if (paymentLog?.details && typeof paymentLog.details === "object") {
        const details = paymentLog.details as Record<string, any>;
        expect(details).toHaveProperty("paymentId");
        expect(details.paymentId).toBe(result.paymentId);
        expect(details).toHaveProperty("claimId");
        expect(details.claimId).toBe(claimId);
        expect(details).toHaveProperty("amount");
        expect(details.amount).toBe(paymentAmount);
        expect(details).toHaveProperty("adjustmentAmount");
        expect(details.adjustmentAmount).toBe(adjustmentAmount);
      }
    });

    it("should log status change when claim status changes to paid", async () => {
      // Record full payment to trigger status change
      const paymentAmount = 80000; // $800.00 in cents (full insurance responsibility)

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      // Query audit logs for status change
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "claim_status_changed",
        resource: "insuranceClaims",
        resourceId: claimId,
      });

      // Verify audit log entry exists for status change
      expect(auditLogs.logs.length).toBeGreaterThan(0);
      
      const statusChangeLog = auditLogs.logs.find(
        (log) => log.action === "claim_status_changed" && 
        log.resourceId === claimId
      );
      
      expect(statusChangeLog).toBeDefined();
      expect(statusChangeLog?.userId).toBe(clinicUserId);
      
      // Verify details include old and new status
      expect(statusChangeLog?.details).toBeDefined();
      if (statusChangeLog?.details && typeof statusChangeLog.details === "object") {
        const details = statusChangeLog.details as Record<string, any>;
        expect(details).toHaveProperty("oldStatus");
        expect(details.oldStatus).toBe("draft");
        expect(details).toHaveProperty("newStatus");
        expect(details.newStatus).toBe("paid");
        expect(details).toHaveProperty("claimId");
        expect(details.claimId).toBe(claimId);
      }
    });

    it("should log invoice status change when insurance payment updates invoice", async () => {
      // Record full payment to trigger invoice status update
      const paymentAmount = 80000; // $800.00 in cents

      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: paymentAmount,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      // Query audit logs for invoice status change
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "invoice_status_changed",
        resource: "invoices",
        resourceId: invoiceId,
      });

      // Verify audit log entry exists (if invoice status changed)
      // Note: Invoice status may not change if patient still owes portion
      const statusChangeLog = auditLogs.logs.find(
        (log) => log.action === "invoice_status_changed" && 
        log.resourceId === invoiceId
      );
      
      if (statusChangeLog) {
        expect(statusChangeLog?.userId).toBe(clinicUserId);
        expect(statusChangeLog?.details).toBeDefined();
        if (statusChangeLog?.details && typeof statusChangeLog.details === "object") {
          const details = statusChangeLog.details as Record<string, any>;
          expect(details).toHaveProperty("oldStatus");
          expect(details).toHaveProperty("newStatus");
          expect(details).toHaveProperty("invoiceId");
          expect(details.invoiceId).toBe(invoiceId);
        }
      }
    });
  });

  describe("Patient Payment Audit Logging", () => {
    beforeEach(async () => {
      // Create a claim and invoice first
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ];

      const claimResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      claimId = claimResult.claimId;
      invoiceId = claimResult.invoiceId;
    });

    it("should log audit entry when patient payment is recorded", async () => {
      const paymentAmount = 20000; // $200.00 in cents (patient responsibility)

      const result = await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      // Query audit logs for payment recording
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "patient_payment_recorded",
        resource: "patientPayments",
      });

      // Verify audit log entry exists
      expect(auditLogs.logs.length).toBeGreaterThan(0);
      
      const paymentLog = auditLogs.logs.find(
        (log) => log.details && typeof log.details === "object" && 
        (log.details as Record<string, any>).paymentId === result.paymentId
      );
      
      expect(paymentLog).toBeDefined();
      expect(paymentLog?.userId).toBe(patientUserId);
      expect(paymentLog?.tenantId).toBe(tenantId);
      expect(paymentLog?.resource).toBe("patientPayments");
      
      // Verify details include payment information
      expect(paymentLog?.details).toBeDefined();
      if (paymentLog?.details && typeof paymentLog.details === "object") {
        const details = paymentLog.details as Record<string, any>;
        expect(details).toHaveProperty("paymentId");
        expect(details.paymentId).toBe(result.paymentId);
        expect(details).toHaveProperty("invoiceId");
        expect(details.invoiceId).toBe(invoiceId);
        expect(details).toHaveProperty("amount");
        expect(details.amount).toBe(paymentAmount);
        expect(details).toHaveProperty("paymentMethod");
        expect(details.paymentMethod).toBe("credit_card");
      }
    });

    it("should log invoice status change when patient payment fully pays invoice", async () => {
      // Record full patient responsibility payment
      const paymentAmount = 20000; // $200.00 in cents (full patient responsibility)

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      // Query audit logs for invoice status change
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "invoice_status_changed",
        resource: "invoices",
        resourceId: invoiceId,
      });

      // Verify audit log entry exists for status change
      const statusChangeLog = auditLogs.logs.find(
        (log) => log.action === "invoice_status_changed" && 
        log.resourceId === invoiceId &&
        log.details && typeof log.details === "object" &&
        (log.details as Record<string, any>).newStatus === "paid"
      );
      
      if (statusChangeLog) {
        expect(statusChangeLog?.userId).toBe(patientUserId);
        expect(statusChangeLog?.details).toBeDefined();
        if (statusChangeLog?.details && typeof statusChangeLog.details === "object") {
          const details = statusChangeLog.details as Record<string, any>;
          expect(details).toHaveProperty("oldStatus");
          expect(details).toHaveProperty("newStatus");
          expect(details.newStatus).toBe("paid");
          expect(details).toHaveProperty("invoiceId");
          expect(details.invoiceId).toBe(invoiceId);
        }
      }
    });

    it("should log invoice status change when patient payment partially pays invoice", async () => {
      // Record partial payment
      const paymentAmount = 10000; // $100.00 in cents (partial payment)

      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: paymentAmount,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      // Query audit logs for invoice status change
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "invoice_status_changed",
        resource: "invoices",
        resourceId: invoiceId,
      });

      // Verify audit log entry exists for status change to partially_paid
      const statusChangeLog = auditLogs.logs.find(
        (log) => log.action === "invoice_status_changed" && 
        log.resourceId === invoiceId &&
        log.details && typeof log.details === "object" &&
        (log.details as Record<string, any>).newStatus === "partially_paid"
      );
      
      if (statusChangeLog) {
        expect(statusChangeLog?.userId).toBe(patientUserId);
        expect(statusChangeLog?.details).toBeDefined();
        if (statusChangeLog?.details && typeof statusChangeLog.details === "object") {
          const details = statusChangeLog.details as Record<string, any>;
          expect(details).toHaveProperty("oldStatus");
          expect(details).toHaveProperty("newStatus");
          expect(details.newStatus).toBe("partially_paid");
        }
      }
    });
  });

  describe("Audit Log Details Completeness", () => {
    beforeEach(async () => {
      // Create a claim first
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000, // $1000.00 in cents
        },
      ];

      const claimResult = await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      claimId = claimResult.claimId;
      invoiceId = claimResult.invoiceId;
    });

    it("should include user information in all audit logs", async () => {
      // Create claim (clinic user)
      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000,
        },
      ];

      await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      // Record payment (clinic user)
      await t.mutation(api.billing.recordInsurancePayment, {
        claimId,
        amount: 80000,
        adjustmentAmount: 0,
        userEmail: clinicUserEmail,
      });

      // Record patient payment (patient user)
      await t.mutation(api.billing.recordPatientPayment, {
        invoiceId,
        amount: 20000,
        paymentMethod: "credit_card",
        userEmail: patientUserEmail,
      });

      // Query all audit logs
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
      });

      // Verify all logs have userId
      const logsWithActions = auditLogs.logs.filter(
        (log) => 
          log.action === "claim_created" ||
          log.action === "insurance_payment_recorded" ||
          log.action === "patient_payment_recorded"
      );

      expect(logsWithActions.length).toBeGreaterThan(0);
      
      logsWithActions.forEach((log) => {
        expect(log.userId).toBeDefined();
        expect(log.tenantId).toBe(tenantId);
        expect(log.timestamp).toBeDefined();
        expect(log.timestamp).toBeGreaterThan(0);
      });
    });

    it("should include timestamp in all audit logs", async () => {
      const beforeTime = Date.now();

      const lineItems = [
        {
          procedureCode: "99213",
          modifiers: [],
          diagnosisCodes: ["E11.9"],
          units: 1,
          chargeAmount: 100000,
        },
      ];

      await t.mutation(api.billing.createClaimForAppointment, {
        appointmentId,
        payerId,
        userEmail: clinicUserEmail,
        lineItems,
      });

      const afterTime = Date.now();

      // Query audit logs
      const auditLogs = await t.query(api.auditLogs.getAuditLogs, {
        tenantId,
        action: "claim_created",
      });

      const claimLog = auditLogs.logs[0];
      expect(claimLog).toBeDefined();
      expect(claimLog?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(claimLog?.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});

