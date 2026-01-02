import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import {
  verifyClinicUserAccess,
  verifyPatientAccess,
  AuthorizationResult,
} from "./utils/authorization";

/**
 * Default insurance/patient responsibility split
 * Used when creating invoices from claims
 */
const DEFAULT_INSURANCE_SPLIT = 0.8;
const DEFAULT_PATIENT_SPLIT = 1 - DEFAULT_INSURANCE_SPLIT;

/**
 * Helper function to check if a timestamp is within a date range
 * 
 * @param timestamp - Timestamp to check
 * @param startDate - Optional start date (inclusive)
 * @param endDate - Optional end date (inclusive)
 * @returns True if timestamp is within the date range
 */
function isInDateRange(
  timestamp: number,
  startDate?: number,
  endDate?: number
): boolean {
  if (startDate !== undefined && timestamp < startDate) {
    return false;
  }
  if (endDate !== undefined && timestamp > endDate) {
    return false;
  }
  return true;
}

/**
 * Helper function to get total insurance payments for a claim
 * 
 * @param ctx - Convex context
 * @param claimId - ID of the claim
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Total payment amount in cents
 */
async function getTotalInsurancePayments(
  ctx: QueryCtx | MutationCtx,
  claimId: Id<"insuranceClaims">,
  startDate?: number,
  endDate?: number
): Promise<number> {
  const payments = await ctx.db
    .query("insurancePayments")
    .withIndex("by_claim", (q) => q.eq("claimId", claimId))
    .collect();

  return payments
    .filter((payment) => isInDateRange(payment.paidAt, startDate, endDate))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Helper function to get total patient payments for an invoice
 * 
 * @param ctx - Convex context
 * @param invoiceId - ID of the invoice
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Total payment amount in cents
 */
async function getTotalPatientPayments(
  ctx: QueryCtx | MutationCtx,
  invoiceId: Id<"invoices">,
  startDate?: number,
  endDate?: number
): Promise<number> {
  const payments = await ctx.db
    .query("patientPayments")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .collect();

  return payments
    .filter((payment) => isInDateRange(payment.paidAt, startDate, endDate))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Helper function to update invoice status based on payments
 * 
 * Task 7.3: Added audit logging for status changes
 * 
 * @param ctx - Convex context
 * @param invoiceId - ID of the invoice
 * @param now - Current timestamp
 * @param userId - ID of the user performing the action (for audit logging)
 * @param tenantId - Tenant ID (for audit logging)
 * @returns The new invoice status
 */
async function updateInvoiceStatus(
  ctx: MutationCtx,
  invoiceId: Id<"invoices">,
  now: number,
  userId?: Id<"users">,
  tenantId?: string
): Promise<"paid" | "partially_paid" | "pending"> {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const oldStatus = invoice.status;
  const invoiceTenantId = tenantId || invoice.tenantId;

  // Get total patient payments
  const totalPatientPaid = await getTotalPatientPayments(ctx, invoiceId);

  // Get total insurance payments if invoice has a linked claim
  let totalInsurancePaid = 0;
  if (invoice.claimId) {
    totalInsurancePaid = await getTotalInsurancePayments(ctx, invoice.claimId);
  }

  const patientResponsibility = invoice.patientResponsibility ?? 0;
  const insuranceResponsibility = invoice.insuranceResponsibility ?? 0;

  // Determine status based on payments
  let newStatus: "paid" | "partially_paid" | "pending" = "pending";

  if (totalPatientPaid >= patientResponsibility) {
    // Patient portion is fully paid
    if (invoice.claimId) {
      // Invoice has a linked claim, check insurance payments
      if (totalInsurancePaid >= insuranceResponsibility) {
        // Both patient and insurance portions are paid
        newStatus = "paid";
      } else {
        // Only patient portion is paid, insurance still pending
        newStatus = "partially_paid";
      }
    } else {
      // No claim, so patient responsibility is the full amount
      newStatus = "paid";
    }
  } else if (totalPatientPaid > 0) {
    // Partial payment made
    newStatus = "partially_paid";
  }

  // Update invoice status
  await ctx.db.patch(invoiceId, {
    status: newStatus,
    updatedAt: now,
  });

  // Task 7.3: Log status change if status actually changed
  // Note: Audit logging failures are non-blocking to ensure billing operations
  // continue even if audit system is temporarily unavailable
  if (oldStatus !== newStatus && userId && invoiceTenantId) {
    try {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: invoiceTenantId,
        userId,
        action: "invoice_status_changed",
        resource: "invoices",
        resourceId: invoiceId,
        details: {
          invoiceId,
          oldStatus,
          newStatus,
          totalPatientPaid,
          totalInsurancePaid,
          patientResponsibility,
          insuranceResponsibility,
        },
        timestamp: now,
      });
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break operations
      console.error("Failed to log invoice status change audit event", error);
    }
  }

  return newStatus;
}

/**
 * Get all invoices for a patient (Legacy query - maintained for backward compatibility)
 * 
 * Note: This query is maintained for backward compatibility. New code should use
 * getPatientInvoices which includes proper authorization and additional features.
 * 
 * @param patientId - ID of the patient
 * @param tenantId - Tenant ID
 * @param userEmail - Email of the authenticated user (for authorization)
 * @returns Array of formatted invoices
 */
export const getPatientBilling = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify patient authorization if userEmail is provided
    if (args.userEmail) {
      const authResult = await verifyPatientBillingAccess(
        ctx,
        args.userEmail,
        args.patientId
      );

      if (!authResult.authorized) {
        throw new Error(authResult.error || "Unauthorized access to patient billing");
      }
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant_patient", (q) =>
        q.eq("tenantId", args.tenantId).eq("patientId", args.patientId)
      )
      .order("desc")
      .collect();

    // Format invoices for display
    return invoices.map((invoice) => {
      // Map invoice status to display format
      const STATUS_DISPLAY_MAP: Record<
        | "paid"
        | "pending"
        | "overdue"
        | "cancelled"
        | "draft"
        | "submitted"
        | "denied"
        | "partially_paid",
        string
      > = {
        paid: "Paid",
        pending: "Pending",
        overdue: "Overdue",
        cancelled: "Cancelled",
        draft: "Draft",
        submitted: "Submitted",
        denied: "Denied",
        partially_paid: "Partially Paid",
      } as const;

      const displayStatus = STATUS_DISPLAY_MAP[invoice.status] || "Pending";

      return {
        id: invoice.invoiceNumber,
        date: new Date(invoice.createdAt).toISOString().split("T")[0]!,
        amount: `$${(invoice.amount / 100).toFixed(2)}`,
        amountCents: invoice.amount,
        status: displayStatus,
        description: invoice.description,
        serviceType: invoice.serviceType,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
      };
    });
  },
});

/**
 * Get Patient Invoices Query (Task 2.6)
 * 
 * Returns invoices for authenticated patient with breakdown:
 * - Total amount
 * - Insurance portion
 * - Patient responsibility
 * - Status
 * - Link to claims if applicable
 * 
 * Supports filtering by status and date range.
 * 
 * ID Consistency (Task 7.1):
 * - Returns invoices with their database _id (Id<"invoices">)
 * - Same invoice IDs created in clinic view (via createClaimForAppointment) appear here
 * - Each invoice includes claimId reference if linked to a claim (bidirectional link)
 * - Invoice IDs remain consistent across status updates and queries
 * - Invoice numbers are unique identifiers but _id is the primary key for consistency
 * 
 * @param patientId - ID of the patient
 * @param userEmail - Email of the authenticated user (for authorization)
 * @param status - Optional filter by invoice status
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @returns Array of invoices with breakdown and claim information (same IDs as clinic view)
 */
export const getPatientInvoices = query({
  args: {
    patientId: v.id("patients"),
    userEmail: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("overdue"),
        v.literal("cancelled"),
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("denied"),
        v.literal("partially_paid")
      )
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify patient authorization
    const authResult = await verifyPatientBillingAccess(
      ctx,
      args.userEmail,
      args.patientId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to patient invoices");
    }

    // Get patient record to get tenantId
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const tenantId = patient.tenantId;

    // Query invoices for the patient
    let invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant_patient", (q) =>
        q.eq("tenantId", tenantId).eq("patientId", args.patientId)
      )
      .collect();

    // Filter by status if provided
    if (args.status) {
      invoices = invoices.filter((invoice) => invoice.status === args.status);
    }

    // Filter by date range if provided
    if (args.startDate !== undefined || args.endDate !== undefined) {
      invoices = invoices.filter((invoice) =>
        isInDateRange(invoice.createdAt, args.startDate, args.endDate)
      );
    }

    // Sort by creation date descending (newest first)
    invoices.sort((a, b) => b.createdAt - a.createdAt);

    // Format invoices with breakdown and claim information
    const formattedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        // Get claim information if invoice is linked to a claim
        let claimStatus: string | undefined;
        if (invoice.claimId) {
          const claim = await ctx.db.get(invoice.claimId);
          if (claim) {
            claimStatus = claim.status;
          }
        }

        // Calculate amounts in dollars (from cents)
        const total = invoice.amount / 100;
        const patientResponsibility = invoice.patientResponsibility / 100;
        const insurancePortion = invoice.insuranceResponsibility / 100;

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          date: new Date(invoice.createdAt).toISOString().split("T")[0]!,
          createdAt: invoice.createdAt,
          total,
          patientResponsibility,
          insurancePortion,
          status: invoice.status,
          claimId: invoice.claimId,
          claimStatus,
          description: invoice.description,
          serviceType: invoice.serviceType,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          tenantId: invoice.tenantId,
        };
      })
    );

    return formattedInvoices;
  },
});

/**
 * Tenant Isolation Helper
 * Verifies that a user belongs to the specified tenant for billing operations
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user
 * @param tenantId - ID of the tenant to verify access for
 * @returns Authorization result with tenantId if authorized
 */
export async function verifyTenantAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  tenantId: string
): Promise<AuthorizationResult & { tenantId?: string }> {
  const authResult = await verifyClinicUserAccess(ctx, userEmail, tenantId);
  
  if (!authResult.authorized) {
    return authResult;
  }
  
  return {
    ...authResult,
    tenantId,
  };
}

/**
 * Role-Based Access Guard: Clinic Billing Access
 * Verifies that a clinic user can access clinic-level billing data
 * 
 * Ensures:
 * 1. User is authenticated
 * 2. User has clinic_user role (or admin/provider for backward compatibility)
 * 3. User belongs to the specified tenant (tenant isolation)
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user
 * @param tenantId - ID of the tenant
 * @returns Authorization result with clear error messages for unauthorized access
 */
export async function verifyClinicBillingAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  tenantId: string
): Promise<AuthorizationResult> {
  const result = await verifyClinicUserAccess(ctx, userEmail, tenantId);
  
  // Enhance error messages for billing-specific context
  if (!result.authorized && result.error) {
    // Error messages from verifyClinicUserAccess are already clear:
    // - "Authentication required. Please sign in to access patient data."
    // - "User not found. Please sign in with a valid account."
    // - "Account is inactive. Please contact support."
    // - "Only clinic users can perform this action."
    // - "You do not have access to this organization. Clinic users can only access resources in their own organization."
    return result;
  }
  
  return result;
}

/**
 * Role-Based Access Guard: Provider Billing Access
 * Verifies that a provider can access their own billing data
 * 
 * Ensures:
 * 1. User is authenticated
 * 2. User has clinic_user role (provider is a clinic user)
 * 3. User belongs to the specified tenant (tenant isolation)
 * 
 * Note: This guard verifies the user is a provider/clinic user.
 * The actual queries (getProviderRCM, getProviderClaimsList) filter data
 * by providerId to ensure providers only see their own data.
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user
 * @param tenantId - ID of the tenant
 * @returns Authorization result with clear error messages for unauthorized access
 */
export async function verifyProviderBillingAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  tenantId: string
): Promise<AuthorizationResult> {
  // First verify user is authenticated and is a clinic user (provider is a clinic user)
  const authResult = await verifyClinicUserAccess(ctx, userEmail, tenantId);
  
  if (!authResult.authorized) {
    // Error messages from verifyClinicUserAccess are already clear:
    // - "Authentication required. Please sign in to access patient data."
    // - "User not found. Please sign in with a valid account."
    // - "Account is inactive. Please contact support."
    // - "Only clinic users can perform this action."
    // - "You do not have access to this organization. Clinic users can only access resources in their own organization."
    return authResult;
  }
  
  // Providers can access their own billing data
  // The queries themselves filter by providerId to ensure data isolation
  return authResult;
}

/**
 * Role-Based Access Guard: Patient Billing Access
 * Verifies that a patient can access their own billing data
 * 
 * Ensures:
 * 1. User is authenticated
 * 2. User is the patient themselves (email match) OR
 * 3. User is a clinic user with access to the patient's tenant
 * 
 * Patients can only access their own invoices and billing data.
 * Clinic users can access patient billing data within their organization.
 * 
 * @param ctx - Convex context
 * @param userEmail - Email of the authenticated user
 * @param patientId - ID of the patient record being accessed
 * @returns Authorization result with clear error messages for unauthorized access
 */
export async function verifyPatientBillingAccess(
  ctx: QueryCtx | MutationCtx,
  userEmail: string | undefined,
  patientId: Id<"patients">
): Promise<AuthorizationResult> {
  const result = await verifyPatientAccess(ctx, patientId, userEmail);
  
  // verifyPatientAccess already provides clear error messages:
  // - "Authentication required. Please sign in to access patient data."
  // - "User not found. Please sign in with a valid account."
  // - "Account is inactive. Please contact support."
  // - "Patient not found."
  // - "You do not have permission to access this patient's profile. Patients can only access their own profile, and clinic users can only access patients in their organization."
  
  return result;
}

/**
 * Get Patient Billing Summary Query (Task 2.7)
 * 
 * Calculates billing summary for authenticated patient:
 * - Outstanding balance: Total of all unpaid invoices
 * - Upcoming charges: Invoices due in the next 30 days
 * - Total paid: Invoices paid within the last 3 months
 * - Pending count: Number of unpaid invoices
 * 
 * @param patientId - ID of the patient
 * @param userEmail - Email of the authenticated user (for authorization)
 * @returns Summary object with billing metrics
 */
export const getPatientBillingSummary = query({
  args: {
    patientId: v.id("patients"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify patient authorization
    const authResult = await verifyPatientBillingAccess(
      ctx,
      args.userEmail,
      args.patientId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to patient billing summary");
    }

    // Get patient record to get tenantId
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const tenantId = patient.tenantId;

    // Query invoices for the patient
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant_patient", (q) =>
        q.eq("tenantId", tenantId).eq("patientId", args.patientId)
      )
      .collect();

    const now = Date.now();
    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    // Calculate outstanding balance from all unpaid invoices
    const outstandingBalance = invoices
      .filter(
        (inv) =>
          inv.status === "pending" ||
          inv.status === "overdue" ||
          inv.status === "draft" ||
          inv.status === "submitted" ||
          inv.status === "denied" ||
          inv.status === "partially_paid"
      )
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate total paid from invoices paid within last 3 months
    const totalPaid = invoices
      .filter((inv) => {
        if (inv.status !== "paid") {
          return false;
        }
        // Use paidDate if available, otherwise use updatedAt as fallback
        const paymentDate = inv.paidDate || inv.updatedAt;
        return paymentDate >= threeMonthsAgo;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate upcoming charges (invoices due in the next 30 days, unpaid statuses only)
    const upcomingCharges = invoices
      .filter(
        (inv) =>
          (inv.status === "pending" ||
            inv.status === "overdue" ||
            inv.status === "draft" ||
            inv.status === "submitted" ||
            inv.status === "denied" ||
            inv.status === "partially_paid") &&
          inv.dueDate <= thirtyDaysFromNow &&
          inv.dueDate >= now
      )
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Count pending invoices
    const pendingCount = invoices.filter(
      (inv) =>
        inv.status === "pending" ||
        inv.status === "overdue" ||
        inv.status === "draft" ||
        inv.status === "submitted" ||
        inv.status === "denied" ||
        inv.status === "partially_paid"
    ).length;

    return {
      outstandingBalance: outstandingBalance / 100,
      totalPaid: totalPaid / 100,
      upcomingCharges: upcomingCharges / 100,
      pendingCount,
    };
  },
});

/**
 * Get Clinic Revenue Cycle Management (RCM) KPIs
 * 
 * Aggregates key performance indicators for clinic billing:
 * - Total AR (Accounts Receivable)
 * - Days in AR (approximate)
 * - Clean claim rate
 * - Denial rate
 * - Net collection rate
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated clinic user
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @returns Structured KPI data for dashboard
 */
export const getClinicRCM = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to clinic RCM data");
    }

    const now = Date.now();
    const startDate = args.startDate ?? 0; // Default to beginning of time if not provided
    const endDate = args.endDate ?? now; // Default to now if not provided

    // Get all claims for the tenant (filtered by date range if provided)
    const allClaims = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter claims by date range if provided
    const filteredClaims = allClaims.filter((claim) =>
      isInDateRange(claim.createdAt, startDate, endDate)
    );

    // Get all invoices for the tenant (filtered by date range if provided)
    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter invoices by date range if provided
    const filteredInvoices = allInvoices.filter((invoice) =>
      isInDateRange(invoice.createdAt, startDate, endDate)
    );

    // Calculate Total AR (Accounts Receivable)
    // AR includes: unpaid claims + denied claims + unpaid invoices
    let totalARCents = 0;

    // Add unpaid/denied claims to AR
    filteredClaims.forEach((claim) => {
      if (
        claim.status === "submitted" ||
        claim.status === "accepted" ||
        claim.status === "denied" ||
        claim.status === "draft"
      ) {
        totalARCents += claim.totalCharges;
      }
    });

    // Add unpaid invoices (patient responsibility) to AR
    filteredInvoices.forEach((invoice) => {
      if (
        invoice.status === "pending" ||
        invoice.status === "overdue" ||
        invoice.status === "draft" ||
        invoice.status === "submitted" ||
        invoice.status === "denied" ||
        invoice.status === "partially_paid"
      ) {
        // Add patient responsibility portion
        totalARCents += invoice.patientResponsibility;
        // If claim is denied, add insurance portion too (patient owes full amount)
        if (invoice.status === "denied" && invoice.claimId) {
          totalARCents += invoice.insuranceResponsibility;
        }
      }
    });

    const totalAR = totalARCents / 100; // Convert cents to dollars

    // Calculate Days in AR (approximate)
    // Average days since claim submission for unpaid claims
    let totalDays = 0;
    let claimCount = 0;

    filteredClaims.forEach((claim) => {
      if (
        claim.status === "submitted" ||
        claim.status === "accepted" ||
        claim.status === "denied"
      ) {
        const daysSinceSubmission = Math.floor(
          (now - claim.createdAt) / (24 * 60 * 60 * 1000)
        );
        totalDays += daysSinceSubmission;
        claimCount += 1;
      }
    });

    const daysInAR = claimCount > 0 ? totalDays / claimCount : 0;

    // Calculate Clean Claim Rate
    // Clean claim rate = (accepted claims) / (accepted + denied claims) * 100
    const acceptedClaims = filteredClaims.filter(
      (claim) => claim.status === "accepted"
    ).length;
    const deniedClaims = filteredClaims.filter(
      (claim) => claim.status === "denied"
    ).length;
    const totalProcessedClaims = acceptedClaims + deniedClaims;

    const cleanClaimRate =
      totalProcessedClaims > 0 ? (acceptedClaims / totalProcessedClaims) * 100 : 100;

    // Calculate Denial Rate
    // Denial rate = (denied claims) / (accepted + denied claims) * 100
    const denialRate =
      totalProcessedClaims > 0 ? (deniedClaims / totalProcessedClaims) * 100 : 0;

    // Calculate Net Collection Rate
    // Net collection rate = (total payments) / (total charges) * 100
    // Batch payment queries to avoid N+1 problem
    const claimIds = filteredClaims.map((claim) => claim._id);
    let totalPaymentsCents = 0;
    let totalChargesCents = 0;

    // Sum charges from all claims
    filteredClaims.forEach((claim) => {
      totalChargesCents += claim.totalCharges;
    });

    // Batch get all insurance payments for all claims at once
    // Note: Convex doesn't support IN queries directly, so we still need to query per claim
    // But we can optimize by using Promise.all for parallel queries
    const insurancePaymentPromises = claimIds.map((claimId) =>
      getTotalInsurancePayments(ctx, claimId, args.startDate, args.endDate)
    );
    const insurancePaymentTotals = await Promise.all(insurancePaymentPromises);
    totalPaymentsCents += insurancePaymentTotals.reduce((sum, total) => sum + total, 0);

    // Batch get all patient payments for all invoices
    const invoiceIds = filteredInvoices.map((invoice) => invoice._id);
    const patientPaymentPromises = invoiceIds.map((invoiceId) =>
      getTotalPatientPayments(ctx, invoiceId, args.startDate, args.endDate)
    );
    const patientPaymentTotals = await Promise.all(patientPaymentPromises);
    totalPaymentsCents += patientPaymentTotals.reduce((sum, total) => sum + total, 0);

    // Add invoice amounts to total charges
    filteredInvoices.forEach((invoice) => {
      totalChargesCents += invoice.amount;
    });

    const netCollectionRate =
      totalChargesCents > 0
        ? (totalPaymentsCents / totalChargesCents) * 100
        : 0;

    return {
      totalAR,
      daysInAR: Math.round(daysInAR * 100) / 100, // Round to 2 decimal places
      cleanClaimRate: Math.round(cleanClaimRate * 100) / 100,
      denialRate: Math.round(denialRate * 100) / 100,
      netCollectionRate: Math.round(netCollectionRate * 100) / 100,
    };
  },
});

/**
 * Get Monthly Revenue Data for Clinic
 * 
 * Returns monthly billed vs collected amounts for the last 12 months.
 * Used for RevenueChart component visualization.
 * 
 * Task 3.6: Monthly Revenue Data Query
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated clinic user
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @returns Array of monthly revenue data points
 */
export const getClinicMonthlyRevenue = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to clinic revenue data");
    }

    const now = Date.now();
    // Default to last 12 months if no date range provided
    const defaultStartDate = now - (12 * 30 * 24 * 60 * 60 * 1000);
    const startDate = args.startDate ?? defaultStartDate;
    const endDate = args.endDate ?? now;

    // Get all claims for the tenant
    const allClaims = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get all insurance payments
    const allInsurancePayments = await ctx.db
      .query("insurancePayments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get all patient payments
    const allPatientPayments = await ctx.db
      .query("patientPayments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Group data by month
    const monthlyData: Record<string, { billed: number; collected: number }> = {};

    // Process claims (billed amounts)
    for (const claim of allClaims) {
      if (isInDateRange(claim.createdAt, startDate, endDate)) {
        const monthKey = new Date(claim.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { billed: 0, collected: 0 };
        }
        monthlyData[monthKey].billed += claim.totalCharges;
      }
    }

    // Process insurance payments (collected amounts)
    for (const payment of allInsurancePayments) {
      if (isInDateRange(payment.paidAt, startDate, endDate)) {
        const monthKey = new Date(payment.paidAt).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { billed: 0, collected: 0 };
        }
        monthlyData[monthKey].collected += payment.amount;
      }
    }

    // Process patient payments (collected amounts)
    for (const payment of allPatientPayments) {
      if (isInDateRange(payment.paidAt, startDate, endDate)) {
        const monthKey = new Date(payment.paidAt).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { billed: 0, collected: 0 };
        }
        monthlyData[monthKey].collected += payment.amount;
      }
    }

    // Convert to array format and format month labels
    // Sort by monthKey (YYYY-MM) before mapping to ensure chronological order
    const sortedEntries = Object.entries(monthlyData).sort(([keyA], [keyB]) => {
      // Sort by YYYY-MM format chronologically
      return keyA.localeCompare(keyB);
    });

    const result = sortedEntries.map(([monthKey, data]) => {
      const date = new Date(monthKey + '-01');
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        month: monthLabel,
        billed: data.billed, // Already in cents
        collected: data.collected, // Already in cents
      };
    });

    return result;
  },
});

/**
 * Get Provider Revenue Cycle Management (RCM) KPIs
 * 
 * Aggregates key performance indicators for provider billing:
 * - Total AR (Accounts Receivable) - scoped to provider's claims
 * - Days in AR (approximate) - average for provider's claims
 * - Clean claim rate - provider's accepted vs denied claims
 * - Denial rate - provider's denied claims percentage
 * - Net collection rate - provider's payments vs charges
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated provider user
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @returns Structured KPI data for provider dashboard
 */
export const getProviderRCM = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify provider authorization
    const authResult = await verifyProviderBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to provider RCM data");
    }

    // Get provider record by email to get providerId
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_email_tenant", (q) =>
        q.eq("email", args.userEmail).eq("tenantId", args.tenantId)
      )
      .first();

    if (!provider) {
      throw new Error("Provider not found for this user");
    }

    const providerId = provider._id;

    const now = Date.now();
    const startDate = args.startDate ?? 0; // Default to beginning of time if not provided
    const endDate = args.endDate ?? now; // Default to now if not provided

    // Get all claims for the tenant, then filter by providerId
    const allClaims = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter claims by providerId and date range
    const filteredClaims = allClaims.filter(
      (claim) =>
        claim.providerId === providerId &&
        isInDateRange(claim.createdAt, startDate, endDate)
    );

    // Get invoices linked to provider's claims (filtered by date range)
    const claimIds = filteredClaims.map((claim) => claim._id);
    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter invoices that are linked to provider's claims
    const filteredInvoices = allInvoices.filter(
      (invoice) =>
        isInDateRange(invoice.createdAt, startDate, endDate) &&
        invoice.claimId !== undefined &&
        claimIds.includes(invoice.claimId)
    );

    // Calculate Total AR (Accounts Receivable) - scoped to provider
    let totalARCents = 0;

    // Add unpaid/denied claims to AR
    filteredClaims.forEach((claim) => {
      if (
        claim.status === "submitted" ||
        claim.status === "accepted" ||
        claim.status === "denied" ||
        claim.status === "draft"
      ) {
        totalARCents += claim.totalCharges;
      }
    });

    // Add unpaid invoices (patient responsibility) to AR
    filteredInvoices.forEach((invoice) => {
      if (
        invoice.status === "pending" ||
        invoice.status === "overdue" ||
        invoice.status === "draft" ||
        invoice.status === "submitted" ||
        invoice.status === "denied" ||
        invoice.status === "partially_paid"
      ) {
        // Add patient responsibility portion
        totalARCents += invoice.patientResponsibility;
        // If claim is denied, add insurance portion too (patient owes full amount)
        if (invoice.status === "denied" && invoice.claimId) {
          totalARCents += invoice.insuranceResponsibility;
        }
      }
    });

    const totalAR = totalARCents / 100; // Convert cents to dollars

    // Calculate Days in AR (approximate) - for provider's claims only
    let totalDays = 0;
    let claimCount = 0;

    filteredClaims.forEach((claim) => {
      if (
        claim.status === "submitted" ||
        claim.status === "accepted" ||
        claim.status === "denied"
      ) {
        const daysSinceSubmission = Math.floor(
          (now - claim.createdAt) / (24 * 60 * 60 * 1000)
        );
        totalDays += daysSinceSubmission;
        claimCount += 1;
      }
    });

    const daysInAR = claimCount > 0 ? totalDays / claimCount : 0;

    // Calculate Clean Claim Rate - provider's accepted vs denied claims
    const acceptedClaims = filteredClaims.filter(
      (claim) => claim.status === "accepted"
    ).length;
    const deniedClaims = filteredClaims.filter(
      (claim) => claim.status === "denied"
    ).length;
    const totalProcessedClaims = acceptedClaims + deniedClaims;

    const cleanClaimRate =
      totalProcessedClaims > 0 ? (acceptedClaims / totalProcessedClaims) * 100 : 100;

    // Calculate Denial Rate - provider's denied claims percentage
    const denialRate =
      totalProcessedClaims > 0 ? (deniedClaims / totalProcessedClaims) * 100 : 0;

    // Calculate Net Collection Rate - provider's payments vs charges
    let totalPaymentsCents = 0;
    let totalChargesCents = 0;

    // Sum charges from provider's claims
    filteredClaims.forEach((claim) => {
      totalChargesCents += claim.totalCharges;
    });

    // Batch get all insurance payments for provider's claims
    const insurancePaymentPromises = claimIds.map((claimId) =>
      getTotalInsurancePayments(ctx, claimId, args.startDate, args.endDate)
    );
    const insurancePaymentTotals = await Promise.all(insurancePaymentPromises);
    totalPaymentsCents += insurancePaymentTotals.reduce((sum, total) => sum + total, 0);

    // Batch get all patient payments for invoices linked to provider's claims
    const invoiceIds = filteredInvoices.map((invoice) => invoice._id);
    const patientPaymentPromises = invoiceIds.map((invoiceId) =>
      getTotalPatientPayments(ctx, invoiceId, args.startDate, args.endDate)
    );
    const patientPaymentTotals = await Promise.all(patientPaymentPromises);
    totalPaymentsCents += patientPaymentTotals.reduce((sum, total) => sum + total, 0);

    // Add invoice amounts to total charges
    filteredInvoices.forEach((invoice) => {
      totalChargesCents += invoice.amount;
    });

    const netCollectionRate =
      totalChargesCents > 0
        ? (totalPaymentsCents / totalChargesCents) * 100
        : 0;

    return {
      totalAR,
      daysInAR: Math.round(daysInAR * 100) / 100, // Round to 2 decimal places
      cleanClaimRate: Math.round(cleanClaimRate * 100) / 100,
      denialRate: Math.round(denialRate * 100) / 100,
      netCollectionRate: Math.round(netCollectionRate * 100) / 100,
    };
  },
});

/**
 * Helper function to filter claims by various criteria
 */
function filterClaims(
  claims: Array<{
    status: string;
    payerId: Id<"insurancePayers">;
    providerId: Id<"providers">;
    patientId: Id<"patients">;
    createdAt: number;
    totalCharges: number;
  }>,
  filters: {
    status?: string | string[];
    payerId?: Id<"insurancePayers"> | Id<"insurancePayers">[];
    providerId?: Id<"providers"> | Id<"providers">[];
    patientId?: Id<"patients"> | Id<"patients">[];
    startDate?: number;
    endDate?: number;
  }
): typeof claims {
  return claims.filter((claim) => {
    // Handle status filter (supports single value or array)
    if (filters.status !== undefined) {
      if (Array.isArray(filters.status)) {
        if (filters.status.length > 0 && !filters.status.includes(claim.status)) {
          return false;
        }
      } else if (claim.status !== filters.status) {
        return false;
      }
    }
    
    // Handle payerId filter (supports single value or array)
    if (filters.payerId !== undefined) {
      if (Array.isArray(filters.payerId)) {
        if (filters.payerId.length > 0 && !filters.payerId.includes(claim.payerId)) {
          return false;
        }
      } else if (claim.payerId !== filters.payerId) {
        return false;
      }
    }
    
    // Handle providerId filter (supports single value or array)
    if (filters.providerId !== undefined) {
      if (Array.isArray(filters.providerId)) {
        if (filters.providerId.length > 0 && !filters.providerId.includes(claim.providerId)) {
          return false;
        }
      } else if (claim.providerId !== filters.providerId) {
        return false;
      }
    }
    
    // Handle patientId filter (supports single value or array)
    if (filters.patientId !== undefined) {
      if (Array.isArray(filters.patientId)) {
        if (filters.patientId.length > 0 && !filters.patientId.includes(claim.patientId)) {
          return false;
        }
      } else if (claim.patientId !== filters.patientId) {
        return false;
      }
    }
    
    // Handle date range filters
    if (filters.startDate !== undefined && claim.createdAt < filters.startDate) {
      return false;
    }
    if (filters.endDate !== undefined && claim.createdAt > filters.endDate) {
      return false;
    }
    return true;
  });
}

/**
 * Helper function to sort claims
 */
function sortClaims<T extends { createdAt: number; totalCharges: number; status: string }>(
  claims: T[],
  sortBy: "date" | "amount" | "status",
  sortOrder: "asc" | "desc"
): T[] {
  const sorted = [...claims]; // Create a copy to avoid mutating the original array

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison = a.createdAt - b.createdAt;
        break;
      case "amount":
        comparison = a.totalCharges - b.totalCharges;
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get Clinic Claims List
 * 
 * Returns a paginated, filterable list of insurance claims for clinic billing dashboard.
 * Supports filtering by status, payer, provider, and date range.
 * Supports sorting by date, amount, and status.
 * 
 * ID Consistency (Task 7.1):
 * - Returns claims with their database _id (Id<"insuranceClaims">)
 * - Same claim IDs are visible in provider view (getProviderClaimsList) for matching provider
 * - Claim IDs remain consistent across status updates and queries
 * - Each claim includes invoiceId reference if linked to an invoice
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated clinic user
 * @param page - Page number (default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @param status - Optional filter by claim status
 * @param payerId - Optional filter by payer ID
 * @param providerId - Optional filter by provider ID
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @param sortBy - Sort field: 'date', 'amount', or 'status' (default: 'date')
 * @param sortOrder - Sort direction: 'asc' or 'desc' (default: 'desc')
 * @returns Paginated claims list with metadata (same IDs as provider/patient views)
 */
export const getClinicClaimsList = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("accepted"),
        v.literal("denied"),
        v.literal("paid"),
        v.array(
          v.union(
            v.literal("draft"),
            v.literal("submitted"),
            v.literal("accepted"),
            v.literal("denied"),
            v.literal("paid")
          )
        )
      )
    ),
    payerId: v.optional(
      v.union(v.id("insurancePayers"), v.array(v.id("insurancePayers")))
    ),
    providerId: v.optional(
      v.union(v.id("providers"), v.array(v.id("providers")))
    ),
    patientId: v.optional(
      v.union(v.id("patients"), v.array(v.id("patients")))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("date"), v.literal("amount"), v.literal("status"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to clinic claims list");
    }

    // Set defaults
    const page = Math.max(1, args.page ?? 1); // Ensure page is at least 1
    const pageSize = Math.max(1, Math.min(100, args.pageSize ?? 20)); // Clamp between 1 and 100
    const sortBy = args.sortBy ?? "date";
    const sortOrder = args.sortOrder ?? "desc";

    // Get all claims for the tenant using the tenant index
    const allClaims = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Apply filters
    const filteredClaims = filterClaims(allClaims, {
      status: args.status,
      payerId: args.payerId,
      providerId: args.providerId,
      patientId: args.patientId,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Apply sorting
    const sortedClaims = sortClaims(filteredClaims, sortBy, sortOrder);

    // Calculate pagination metadata
    const totalCount = sortedClaims.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedClaims = sortedClaims.slice(startIndex, endIndex);

    return {
      claims: paginatedClaims,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  },
});

/**
 * Get Clinic Invoices List Query
 * 
 * Returns invoices for the clinic/tenant that can receive patient payments.
 * Used for patient payment form invoice selection.
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated clinic user
 * @returns Array of invoices with patient information
 */
export const getClinicInvoicesList = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to clinic invoices list");
    }

    // Get all invoices for the tenant
    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Get patient names for invoices
    const invoicesWithPatientNames = await Promise.all(
      allInvoices.map(async (invoice) => {
        const patient = await ctx.db.get(invoice.patientId);
        const patientName = patient
          ? `${patient.firstName} ${patient.lastName}`
          : undefined;

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          patientResponsibility: invoice.patientResponsibility / 100, // Convert from cents to dollars (consistent with getPatientInvoices)
          status: invoice.status,
          patientName,
        };
      })
    );

    return invoicesWithPatientNames;
  },
});

/**
 * Get Provider Claims List
 * 
 * Returns a paginated, filterable list of insurance claims for the authenticated provider.
 * Supports filtering by status and date range.
 * Supports sorting by date, amount, and status.
 * 
 * ID Consistency (Task 7.1):
 * - Returns claims with same database _id (Id<"insuranceClaims">) as clinic view
 * - Claims are filtered by providerId but maintain same IDs as clinic view
 * - Claim IDs created in clinic view appear here with identical _id
 * - Each claim includes invoiceId reference if linked to an invoice
 * 
 * @param tenantId - Tenant ID to filter data
 * @param userEmail - Email of authenticated provider user
 * @param page - Page number (default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @param status - Optional filter by claim status
 * @param startDate - Optional start date for date range filter (timestamp)
 * @param endDate - Optional end date for date range filter (timestamp)
 * @param sortBy - Sort field: 'date', 'amount', or 'status' (default: 'date')
 * @param sortOrder - Sort direction: 'asc' or 'desc' (default: 'desc')
 * @returns Paginated claims list with metadata, scoped to authenticated provider (same IDs as clinic view)
 */
export const getProviderClaimsList = query({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("accepted"),
        v.literal("denied"),
        v.literal("paid")
      )
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("date"), v.literal("amount"), v.literal("status"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    // Verify provider authorization
    const authResult = await verifyProviderBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to provider claims list");
    }

    // Get provider record by email to get providerId
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_email_tenant", (q) =>
        q.eq("email", args.userEmail).eq("tenantId", args.tenantId)
      )
      .first();

    if (!provider) {
      throw new Error("Provider not found for this user");
    }

    const providerId = provider._id;

    // Set defaults
    const page = Math.max(1, args.page ?? 1); // Ensure page is at least 1
    const pageSize = Math.max(1, Math.min(100, args.pageSize ?? 20)); // Clamp between 1 and 100
    const sortBy = args.sortBy ?? "date";
    const sortOrder = args.sortOrder ?? "desc";

    // Get all claims for the tenant using the tenant index
    const allClaims = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter claims by providerId first (provider-scoped)
    const providerClaims = allClaims.filter((claim) => claim.providerId === providerId);

    // Apply additional filters
    const filteredClaims = filterClaims(providerClaims, {
      status: args.status,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Apply sorting
    const sortedClaims = sortClaims(filteredClaims, sortBy, sortOrder);

    // Calculate pagination metadata
    const totalCount = sortedClaims.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedClaims = sortedClaims.slice(startIndex, endIndex);

    return {
      claims: paginatedClaims,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  },
});

/**
 * Get Claim Details Query (Task 4.4)
 * 
 * Retrieves detailed information for a specific claim:
 * - Claim information (status, amounts, dates)
 * - Claim line items (procedures, codes, charges)
 * - Payment history (insurance payments)
 * - Patient and payer names
 * 
 * Provider-scoped: Only returns claims that belong to the authenticated provider
 * 
 * @param claimId - ID of the claim to retrieve (can be claimId string or _id)
 * @param tenantId - Tenant ID for tenant isolation
 * @param userEmail - Email of authenticated provider user
 * @returns Object with claim, lineItems, payments, patientName, payerName
 */
export const getClaimDetails = query({
  args: {
    claimId: v.string(), // Can be claimId string or _id
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify provider authorization
    const authResult = await verifyProviderBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to claim details");
    }

    // Get provider record by email to get providerId
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_email_tenant", (q) =>
        q.eq("email", args.userEmail).eq("tenantId", args.tenantId)
      )
      .first();

    if (!provider) {
      throw new Error("Provider not found for this user");
    }

    const providerId = provider._id;

    // Try to find claim by claimControlNumber first, then by _id
    let claim = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_claim_control_number", (q) => q.eq("claimControlNumber", args.claimId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    // If not found by claimControlNumber, try by _id
    if (!claim) {
      try {
        claim = await ctx.db.get(args.claimId as Id<"insuranceClaims">);
        // Verify tenant isolation if found by _id
        if (claim && claim.tenantId !== args.tenantId) {
          claim = null;
        }
      } catch {
        // Invalid ID format, claim not found
      }
    }

    if (!claim) {
      throw new Error("Claim not found");
    }

    // Verify claim belongs to provider (provider-scoped)
    if (claim.providerId !== providerId) {
      throw new Error("Unauthorized: You can only view your own claims");
    }

    // Verify tenant isolation
    if (claim.tenantId !== args.tenantId) {
      throw new Error("Unauthorized: Claim does not belong to your organization");
    }

    // Get claim line items
    const lineItems = await ctx.db
      .query("claimLineItems")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get insurance payments for this claim
    const payments = await ctx.db
      .query("insurancePayments")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get patient name
    const patient = await ctx.db.get(claim.patientId);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Unknown Patient";

    // Get payer name
    const payer = await ctx.db.get(claim.payerId);
    const payerName = payer?.name || "Unknown Payer";

    return {
      claim: {
        claimId: claim._id,
        patientId: claim.patientId,
        providerId: claim.providerId,
        payerId: claim.payerId,
        invoiceId: claim.invoiceId,
        status: claim.status,
        totalCharges: claim.totalCharges,
        datesOfService: claim.datesOfService,
        claimControlNumber: claim.claimControlNumber,
        denialReason: claim.denialReason,
        tenantId: claim.tenantId,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      },
      lineItems: lineItems.map((item) => ({
        lineItemId: item._id,
        claimId: item.claimId,
        procedureCode: item.procedureCode,
        modifiers: item.modifiers,
        diagnosisCodes: item.diagnosisCodes,
        units: item.units,
        chargeAmount: item.chargeAmount,
        tenantId: item.tenantId,
        createdAt: item.createdAt,
      })),
      payments: payments.map((payment) => ({
        paymentId: payment._id,
        claimId: payment.claimId,
        amount: payment.amount,
        adjustmentAmount: payment.adjustmentAmount,
        checkNumber: payment.checkNumber,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        tenantId: payment.tenantId,
        createdAt: payment.createdAt,
      })),
      patientName,
      payerName,
    };
  },
});

/**
 * Get Clinic Claim Details Query
 * 
 * Retrieves detailed information for a specific claim for clinic-level access:
 * - Claim information (status, amounts, dates)
 * - Claim line items (procedures, codes, charges)
 * - Payment history (insurance payments)
 * - Patient and payer names
 * 
 * Clinic-scoped: Returns claims within the tenant (no provider filtering)
 * Supports clinic admins/owners who may not be providers
 * 
 * @param claimId - ID of the claim to retrieve (can be claimId string or _id)
 * @param tenantId - Tenant ID for tenant isolation
 * @param userEmail - Email of authenticated clinic user
 * @returns Object with claim, lineItems, payments, patientName, payerName
 */
export const getClinicClaimDetails = query({
  args: {
    claimId: v.string(), // Can be claimId string or _id
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization (doesn't require provider role)
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to claim details");
    }

    // Try to find claim by claimControlNumber first, then by _id
    let claim = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_claim_control_number", (q) => q.eq("claimControlNumber", args.claimId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    // If not found by claimControlNumber, try by _id
    if (!claim) {
      try {
        claim = await ctx.db.get(args.claimId as Id<"insuranceClaims">);
        // Verify tenant isolation if found by _id
        if (claim && claim.tenantId !== args.tenantId) {
          claim = null;
        }
      } catch {
        // Invalid ID format, claim not found
      }
    }

    if (!claim) {
      throw new Error("Claim not found");
    }

    // Verify tenant isolation (clinic-level access - no provider filtering)
    if (claim.tenantId !== args.tenantId) {
      throw new Error("Unauthorized: Claim does not belong to your organization");
    }

    // Get claim line items
    const lineItems = await ctx.db
      .query("claimLineItems")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get insurance payments for this claim
    const payments = await ctx.db
      .query("insurancePayments")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get patient name
    const patient = await ctx.db.get(claim.patientId);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Unknown Patient";

    // Get payer name
    const payer = await ctx.db.get(claim.payerId);
    const payerName = payer?.name || "Unknown Payer";

    return {
      claim: {
        claimId: claim._id,
        patientId: claim.patientId,
        providerId: claim.providerId,
        payerId: claim.payerId,
        invoiceId: claim.invoiceId,
        status: claim.status,
        totalCharges: claim.totalCharges,
        datesOfService: claim.datesOfService,
        claimControlNumber: claim.claimControlNumber,
        denialReason: claim.denialReason,
        tenantId: claim.tenantId,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      },
      lineItems: lineItems.map((item) => ({
        lineItemId: item._id,
        claimId: item.claimId,
        procedureCode: item.procedureCode,
        modifiers: item.modifiers,
        diagnosisCodes: item.diagnosisCodes,
        units: item.units,
        chargeAmount: item.chargeAmount,
        tenantId: item.tenantId,
        createdAt: item.createdAt,
      })),
      payments: payments.map((payment) => ({
        paymentId: payment._id,
        claimId: payment.claimId,
        amount: payment.amount,
        adjustmentAmount: payment.adjustmentAmount,
        checkNumber: payment.checkNumber,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        tenantId: payment.tenantId,
        createdAt: payment.createdAt,
      })),
      patientName,
      payerName,
    };
  },
});

/**
 * Get Patient Claim Details Query (Task 5.3)
 * 
 * Retrieves detailed information for a specific claim for authenticated patient:
 * - Claim information (status, amounts, dates)
 * - Claim line items (procedures, codes, charges)
 * - Payment history (insurance payments)
 * - Patient and payer names
 * 
 * Patient-scoped: Only returns claims that belong to the authenticated patient
 * 
 * @param claimId - ID of the claim to retrieve (can be claimId string or _id)
 * @param patientId - ID of the authenticated patient
 * @param userEmail - Email of authenticated patient user
 * @returns Object with claim, lineItems, payments, patientName, payerName
 */
export const getPatientClaimDetails = query({
  args: {
    claimId: v.string(), // Can be claimId string or _id
    patientId: v.id("patients"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify patient authorization
    const authResult = await verifyPatientBillingAccess(
      ctx,
      args.userEmail,
      args.patientId
    );

    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access to claim details");
    }

    // Get patient record to verify tenantId
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const tenantId = patient.tenantId;

    // Try to find claim by claimControlNumber first, then by _id
    let claim = await ctx.db
      .query("insuranceClaims")
      .withIndex("by_claim_control_number", (q) => q.eq("claimControlNumber", args.claimId))
      .filter((q) => q.eq(q.field("tenantId"), tenantId))
      .first();

    // If not found by claimControlNumber, try by _id
    if (!claim) {
      try {
        claim = await ctx.db.get(args.claimId as Id<"insuranceClaims">);
        // Verify tenant isolation if found by _id
        if (claim && claim.tenantId !== tenantId) {
          claim = null;
        }
      } catch {
        // Invalid ID format, claim not found
      }
    }

    if (!claim) {
      throw new Error("Claim not found");
    }

    // Verify claim belongs to patient (patient-scoped)
    if (claim.patientId !== args.patientId) {
      throw new Error("Unauthorized: You can only view your own claims");
    }

    // Verify tenant isolation
    if (claim.tenantId !== tenantId) {
      throw new Error("Unauthorized: Claim does not belong to your organization");
    }

    // Get claim line items
    const lineItems = await ctx.db
      .query("claimLineItems")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get insurance payments for this claim
    const payments = await ctx.db
      .query("insurancePayments")
      .withIndex("by_claim", (q) => q.eq("claimId", claim!._id))
      .collect();

    // Get patient name
    const patientName = `${patient.firstName} ${patient.lastName}`;

    // Get payer name
    const payer = await ctx.db.get(claim.payerId);
    const payerName = payer?.name || "Unknown Payer";

    return {
      claim: {
        claimId: claim._id,
        patientId: claim.patientId,
        providerId: claim.providerId,
        payerId: claim.payerId,
        invoiceId: claim.invoiceId,
        status: claim.status,
        totalCharges: claim.totalCharges,
        datesOfService: claim.datesOfService,
        claimControlNumber: claim.claimControlNumber,
        denialReason: claim.denialReason,
        tenantId: claim.tenantId,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      },
      lineItems: lineItems.map((item) => ({
        lineItemId: item._id,
        claimId: item.claimId,
        procedureCode: item.procedureCode,
        modifiers: item.modifiers,
        diagnosisCodes: item.diagnosisCodes,
        units: item.units,
        chargeAmount: item.chargeAmount,
        tenantId: item.tenantId,
        createdAt: item.createdAt,
      })),
      payments: payments.map((payment) => ({
        paymentId: payment._id,
        claimId: payment.claimId,
        amount: payment.amount,
        adjustmentAmount: payment.adjustmentAmount,
        checkNumber: payment.checkNumber,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        tenantId: payment.tenantId,
        createdAt: payment.createdAt,
      })),
      patientName,
      payerName,
    };
  },
});

/**
 * Create Claim for Appointment Mutation (Task 2.8)
 * 
 * Generates an insurance claim from a completed appointment:
 * - Extracts patientId, providerId, and datesOfService from appointment
 * - Creates claim with line items from provided procedures
 * - Links to existing invoice or creates new invoice
 * - Validates all required fields before creation
 * 
 * ID Flow Documentation (Task 7.1):
 * ==================================
 * This mutation creates a bidirectional link between claims and invoices:
 * 
 * 1. Claim Creation:
 *    - Creates a new claim with unique _id (Id<"insuranceClaims">)
 *    - Generates unique claimControlNumber (e.g., "CLM-1234567890-000001")
 *    - Stores invoiceId reference if invoice exists or is created
 * 
 * 2. Invoice Creation/Linking:
 *    - If invoiceId provided: Links claim to existing invoice
 *    - If no invoiceId: Creates new invoice with unique _id (Id<"invoices">)
 *    - Generates unique invoiceNumber (e.g., "INV-1234567890-000002")
 * 
 * 3. Bidirectional Linking:
 *    - Claim.invoiceId → references Invoice._id
 *    - Invoice.claimId → references Claim._id (set after claim creation)
 *    - Both IDs are the same across all views (clinic, provider, patient)
 * 
 * 4. Cross-View ID Consistency:
 *    - Clinic view (getClinicClaimsList): Returns claims with their _id
 *    - Provider view (getProviderClaimsList): Returns same claims (filtered by provider) with same _id
 *    - Patient view (getPatientInvoices): Returns invoices with their _id and linked claimId
 *    - All views reference the same underlying database IDs for consistency
 * 
 * 5. ID Persistence:
 *    - IDs remain constant across status updates
 *    - IDs are preserved when querying from different views
 *    - IDs maintain referential integrity in the database
 * 
 * @param appointmentId - ID of the completed appointment
 * @param payerId - ID of the insurance payer
 * @param userEmail - Email of authenticated clinic user
 * @param lineItems - Array of procedure line items (CPT codes, diagnosis codes, charges)
 * @param invoiceId - Optional: ID of existing invoice to link to
 * @returns Object with claimId and invoiceId (same IDs visible in all views)
 */
export const createClaimForAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    payerId: v.id("insurancePayers"),
    userEmail: v.string(),
    lineItems: v.array(
      v.object({
        procedureCode: v.string(), // CPT or HCPCS code
        modifiers: v.optional(v.array(v.string())), // Array of modifier codes
        diagnosisCodes: v.array(v.string()), // Array of ICD-10 diagnosis codes
        units: v.number(), // Number of units
        chargeAmount: v.number(), // Charge amount in cents
      })
    ),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify clinic user authorization
    // Get appointment first to get tenantId
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const tenantId = appointment.tenantId;

    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to create claim"
      );
    }

    // Validate appointment is completed
    if (appointment.status !== "completed") {
      throw new Error(
        "Cannot create claim for appointment that is not completed"
      );
    }

    // Validate payer exists and belongs to tenant
    const payer = await ctx.db.get(args.payerId);
    if (!payer) {
      throw new Error("Insurance payer not found");
    }
    if (payer.tenantId !== tenantId) {
      throw new Error("Insurance payer does not belong to the specified tenant");
    }

    // Validate line items
    if (!args.lineItems || args.lineItems.length === 0) {
      throw new Error("At least one line item is required");
    }

    for (const lineItem of args.lineItems) {
      if (!lineItem.procedureCode || lineItem.procedureCode.trim() === "") {
        throw new Error("Procedure code is required for all line items");
      }
      if (!lineItem.diagnosisCodes || lineItem.diagnosisCodes.length === 0) {
        throw new Error("At least one diagnosis code is required for all line items");
      }
      if (lineItem.units <= 0) {
        throw new Error("Units must be greater than 0");
      }
      if (lineItem.chargeAmount <= 0) {
        throw new Error("Charge amount must be greater than 0");
      }
    }

    // Extract data from appointment
    const patientId = appointment.patientId;
    const providerId = appointment.providerId;
    if (!providerId) {
      throw new Error("Appointment must have a provider to create a claim");
    }

    // Dates of service: use appointment scheduledAt
    const datesOfService = [appointment.scheduledAt];

    // Calculate total charges from line items
    const totalCharges = args.lineItems.reduce(
      (sum, item) => sum + item.chargeAmount,
      0
    );

    // Generate unique claim control number
    // Format: CLM-{timestamp}-{random}
    // Increased randomness to 1,000,000 possible values to reduce collision risk
    const timestamp = now.toString().slice(-10); // Last 10 digits of timestamp
    let claimControlNumber: string;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    
    // Ensure uniqueness by checking against existing claims
    do {
      const random = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
      claimControlNumber = `CLM-${timestamp}-${random}`;
      
      // Check if this claim control number already exists
      const existingClaim = await ctx.db
        .query("insuranceClaims")
        .withIndex("by_claim_control_number", (q) => q.eq("claimControlNumber", claimControlNumber))
        .first();
      
      if (!existingClaim) {
        break; // Unique claim control number found
      }
      
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error("Failed to generate unique claim control number after multiple attempts");
      }
    } while (attempts < MAX_ATTEMPTS);

    // Handle invoice linking or creation
    let invoiceId: Id<"invoices"> | undefined = args.invoiceId;

    if (invoiceId) {
      // Validate existing invoice exists and belongs to tenant
      const existingInvoice = await ctx.db.get(invoiceId);
      if (!existingInvoice) {
        throw new Error("Invoice not found");
      }
      if (existingInvoice.tenantId !== tenantId) {
        throw new Error("Invoice does not belong to the specified tenant");
      }
      if (existingInvoice.patientId !== patientId) {
        throw new Error("Invoice does not belong to the same patient");
      }

      // Update invoice to link to claim (will be set after claim creation)
      // We'll patch it after creating the claim
    } else {
      // Create new invoice
      // Generate invoice number using same timestamp and a new random value
      const invoiceRandom = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
      const invoiceNumber = `INV-${timestamp}-${invoiceRandom}`;

      // Calculate invoice amounts (default: 80% insurance, 20% patient)
      // This could be made configurable based on payer plan type
      const insuranceResponsibility = Math.round(totalCharges * DEFAULT_INSURANCE_SPLIT);
      const patientResponsibility = totalCharges - insuranceResponsibility;

      invoiceId = await ctx.db.insert("invoices", {
        patientId,
        invoiceNumber,
        amount: totalCharges,
        patientResponsibility,
        insuranceResponsibility,
        status: "pending",
        serviceType: "Appointment",
        description: `Claim for appointment on ${new Date(
          appointment.scheduledAt
        ).toLocaleDateString()}`,
        dueDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create claim
    const claimId = await ctx.db.insert("insuranceClaims", {
      patientId,
      providerId,
      payerId: args.payerId,
      invoiceId,
      status: "draft",
      totalCharges,
      datesOfService,
      claimControlNumber,
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Update invoice to link to claim
    if (invoiceId) {
      await ctx.db.patch(invoiceId, {
        claimId,
        updatedAt: now,
      });
    }

    // Create claim line items
    for (const lineItem of args.lineItems) {
      await ctx.db.insert("claimLineItems", {
        claimId,
        procedureCode: lineItem.procedureCode,
        modifiers: lineItem.modifiers || [],
        diagnosisCodes: lineItem.diagnosisCodes,
        units: lineItem.units,
        chargeAmount: lineItem.chargeAmount,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Task 7.3: Log claim creation audit entry
    // Note: Audit logging failures are non-blocking to ensure billing operations
    // continue even if audit system is temporarily unavailable
    if (authResult.userId) {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId: authResult.userId,
          action: "claim_created",
          resource: "insuranceClaims",
          resourceId: claimId,
          details: {
            claimId,
            totalCharges,
            appointmentId: args.appointmentId,
            payerId: args.payerId,
            patientId,
            providerId,
            invoiceId: invoiceId || undefined,
            claimControlNumber,
            lineItemsCount: args.lineItems.length,
          },
          timestamp: now,
        });
      } catch (error) {
        // Don't throw - audit logging failures shouldn't break operations
        console.error("Failed to log claim creation audit event", error);
      }
    }

    // Task 7.3: Log invoice creation audit entry (if invoice was created)
    // Note: Audit logging failures are non-blocking to ensure billing operations
    // continue even if audit system is temporarily unavailable
    if (invoiceId && !args.invoiceId && authResult.userId) {
      try {
        const invoice = await ctx.db.get(invoiceId);
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId: authResult.userId,
          action: "invoice_created",
          resource: "invoices",
          resourceId: invoiceId,
          details: {
            invoiceId,
            amount: invoice?.amount || totalCharges,
            patientResponsibility: invoice?.patientResponsibility || Math.round(totalCharges * DEFAULT_PATIENT_SPLIT),
            insuranceResponsibility: invoice?.insuranceResponsibility || Math.round(totalCharges * DEFAULT_INSURANCE_SPLIT),
            claimId,
            patientId,
            invoiceNumber: invoice?.invoiceNumber,
          },
          timestamp: now,
        });
      } catch (error) {
        // Don't throw - audit logging failures shouldn't break operations
        console.error("Failed to log invoice creation audit event", error);
      }
    }

    return {
      claimId,
      invoiceId: invoiceId!,
    };
  },
});

/**
 * Record Insurance Payment Mutation (Task 2.9)
 * 
 * Records a payment from an insurance company for a claim:
 * - Creates insurance payment record
 * - Updates claim status to "paid" if fully paid
 * - Updates linked invoice status appropriately
 * - Handles partial payments correctly
 * 
 * @param claimId - ID of the insurance claim being paid
 * @param amount - Payment amount in cents
 * @param adjustmentAmount - Adjustment amount in cents (defaults to 0)
 * @param userEmail - Email of authenticated clinic user
 * @param checkNumber - Optional check number if paid by check
 * @param transactionId - Optional external transaction ID
 * @param paidAt - Optional timestamp when payment was received (defaults to now)
 * @returns Object with paymentId
 */
export const recordInsurancePayment = mutation({
  args: {
    claimId: v.id("insuranceClaims"),
    amount: v.number(),
    adjustmentAmount: v.optional(v.number()),
    userEmail: v.string(),
    checkNumber: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get claim to verify it exists and get tenantId
    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    const tenantId = claim.tenantId;

    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to record insurance payment"
      );
    }

    // Validate payment amount
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    // Use provided paidAt or default to now
    const paidAt = args.paidAt ?? now;
    const adjustmentAmount = args.adjustmentAmount ?? 0;

    // Create insurance payment record
    const paymentId = await ctx.db.insert("insurancePayments", {
      claimId: args.claimId,
      amount: args.amount,
      adjustmentAmount,
      checkNumber: args.checkNumber,
      transactionId: args.transactionId,
      paidAt,
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Calculate total payments for this claim
    const totalPaid = await getTotalInsurancePayments(ctx, args.claimId);

    // Get insurance responsibility from linked invoice if it exists
    // Otherwise, use claim's totalCharges as fallback
    let insuranceResponsibility: number;
    if (claim.invoiceId) {
      const invoice = await ctx.db.get(claim.invoiceId);
      if (invoice) {
        insuranceResponsibility = invoice.insuranceResponsibility;
      } else {
        // Invoice not found, use claim totalCharges as fallback
        insuranceResponsibility = claim.totalCharges;
      }
    } else {
      // No invoice linked, use claim totalCharges
      insuranceResponsibility = claim.totalCharges;
    }

    // Get old claim status before update
    const oldClaimStatus = claim.status;

    // Update claim status to "paid" if fully paid
    if (totalPaid >= insuranceResponsibility) {
      await ctx.db.patch(args.claimId, {
        status: "paid",
        updatedAt: now,
      });

      // Task 7.3: Log claim status change if status changed
      // Note: Audit logging failures are non-blocking to ensure billing operations
      // continue even if audit system is temporarily unavailable
      if (authResult.userId && oldClaimStatus !== "paid") {
        try {
          await ctx.runMutation(api.auditLogs.create, {
            tenantId,
            userId: authResult.userId,
            action: "claim_status_changed",
            resource: "insuranceClaims",
            resourceId: args.claimId,
            details: {
              claimId: args.claimId,
              oldStatus: oldClaimStatus,
              newStatus: "paid",
              totalPaid,
              insuranceResponsibility,
            },
            timestamp: now,
          });
        } catch (error) {
          // Don't throw - audit logging failures shouldn't break operations
          console.error("Failed to log claim status change audit event", error);
        }
      }
    }

    // Task 7.3: Log insurance payment recording
    // Note: Audit logging failures are non-blocking to ensure billing operations
    // continue even if audit system is temporarily unavailable
    if (authResult.userId) {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId: authResult.userId,
          action: "insurance_payment_recorded",
          resource: "insurancePayments",
          resourceId: paymentId,
          details: {
            paymentId,
            claimId: args.claimId,
            amount: args.amount,
            adjustmentAmount,
            checkNumber: args.checkNumber,
            transactionId: args.transactionId,
            paidAt,
            totalPaid,
            insuranceResponsibility,
          },
          timestamp: now,
        });
      } catch (error) {
        // Don't throw - audit logging failures shouldn't break operations
        console.error("Failed to log insurance payment audit event", error);
      }
    }

    // Update linked invoice if it exists
    if (claim.invoiceId) {
      // Use helper function to update invoice status (with audit logging)
      await updateInvoiceStatus(ctx, claim.invoiceId, now, authResult.userId, tenantId);
    }

    return {
      paymentId,
    };
  },
});

/**
 * Record Patient Payment Mutation (Task 2.10)
 * 
 * Records a payment from a patient for an invoice:
 * - Creates patient payment record
 * - Updates invoice status to "paid" if fully paid (patient responsibility)
 * - Updates invoice status to "partially_paid" if partially paid
 * - Handles partial payments correctly
 * 
 * @param invoiceId - ID of the invoice being paid
 * @param amount - Payment amount in cents
 * @param paymentMethod - Method of payment (credit_card, debit_card, check, cash, bank_transfer, ach, other)
 * @param userEmail - Email of authenticated patient user
 * @param transactionId - Optional external transaction ID from payment processor
 * @param paidAt - Optional timestamp when payment was received (defaults to now)
 * @returns Object with paymentId
 */
export const recordPatientPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("check"),
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("ach"),
      v.literal("other")
    ),
    userEmail: v.string(),
    transactionId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get invoice to verify it exists and get tenantId/patientId
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const tenantId = invoice.tenantId;
    const patientId = invoice.patientId;

    // Verify patient authorization
    const authResult = await verifyPatientBillingAccess(
      ctx,
      args.userEmail,
      patientId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to record patient payment"
      );
    }

    // Validate payment amount
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    // Use provided paidAt or default to now
    const paidAt = args.paidAt ?? now;

    // Create patient payment record
    const paymentId = await ctx.db.insert("patientPayments", {
      patientId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      transactionId: args.transactionId,
      paidAt,
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Task 7.3: Log patient payment recording
    // Note: Audit logging failures are non-blocking to ensure billing operations
    // continue even if audit system is temporarily unavailable
    if (authResult.userId) {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId: authResult.userId,
          action: "patient_payment_recorded",
          resource: "patientPayments",
          resourceId: paymentId,
          details: {
            paymentId,
            invoiceId: args.invoiceId,
            amount: args.amount,
            paymentMethod: args.paymentMethod,
            transactionId: args.transactionId,
            paidAt,
            patientId,
          },
          timestamp: now,
        });
      } catch (error) {
        // Don't throw - audit logging failures shouldn't break operations
        console.error("Failed to log patient payment audit event", error);
      }
    }

    // Use helper function to update invoice status based on payments (with audit logging)
    await updateInvoiceStatus(ctx, args.invoiceId, now, authResult.userId, tenantId);

    return {
      paymentId,
    };
  },
});

/**
 * Get Insurance Payers Query (Task 8.1)
 * 
 * Returns all insurance payers for a given tenant.
 * Used by seed script and for payer selection in UI.
 * 
 * @param tenantId - Tenant ID to filter payers
 * @returns Array of insurance payers
 */
export const getInsurancePayers = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const payers = await ctx.db
      .query("insurancePayers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return payers.map((payer) => ({
      _id: payer._id,
      payerId: payer.payerId,
      name: payer.name,
      planType: payer.planType,
      contactInfo: payer.contactInfo,
      tenantId: payer.tenantId,
      createdAt: payer.createdAt,
      updatedAt: payer.updatedAt,
    }));
  },
});

/**
 * Create Insurance Payer Mutation (Task 8.1)
 * 
 * Creates a new insurance payer for a tenant.
 * Used by seed script and for admin payer management.
 * 
 * @param payerId - Unique identifier for the payer (e.g., "BCBS-001")
 * @param name - Display name (e.g., "Blue Cross Blue Shield")
 * @param planType - Type of insurance plan
 * @param contactInfo - Contact information for the payer
 * @param tenantId - Tenant ID for isolation
 * @returns ID of the created payer
 */
export const createInsurancePayer = mutation({
  args: {
    payerId: v.string(),
    name: v.string(),
    planType: v.union(
      v.literal("hmo"),
      v.literal("ppo"),
      v.literal("medicare"),
      v.literal("medicaid"),
      v.literal("tricare"),
      v.literal("commercial"),
      v.literal("self_pay")
    ),
    contactInfo: v.object({
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.optional(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
        })
      ),
      website: v.optional(v.string()),
      claimsAddress: v.optional(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
        })
      ),
    }),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if payer with same payerId already exists for this tenant
    const existingPayer = await ctx.db
      .query("insurancePayers")
      .withIndex("by_tenant_payer_id", (q) =>
        q.eq("tenantId", args.tenantId).eq("payerId", args.payerId)
      )
      .first();

    if (existingPayer) {
      throw new Error(
        `Insurance payer with payerId "${args.payerId}" already exists for tenant "${args.tenantId}"`
      );
    }

    // Create the payer
    const payerId = await ctx.db.insert("insurancePayers", {
      payerId: args.payerId,
      name: args.name,
      planType: args.planType,
      contactInfo: args.contactInfo,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    return payerId;
  },
});

/**
 * Update Claim Status for Seeding (Task 8.2)
 * 
 * Admin mutation to update claim status for seeding purposes.
 * Requires admin/clinic user authorization.
 * 
 * @param claimId - ID of the claim to update
 * @param status - New status for the claim
 * @param userEmail - Email of authenticated admin user
 * @param denialReason - Optional denial reason if status is "denied"
 */
export const updateClaimStatusForSeeding = mutation({
  args: {
    claimId: v.id("insuranceClaims"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("denied"),
      v.literal("paid")
    ),
    userEmail: v.string(),
    denialReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get claim to verify it exists and get tenantId
    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    const tenantId = claim.tenantId;

    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to update claim status"
      );
    }

    // Update claim status
    await ctx.db.patch(args.claimId, {
      status: args.status,
      denialReason: args.denialReason,
      updatedAt: now,
    });
  },
});

/**
 * Appeal Denied Claim Mutation
 * 
 * Appeals a denied claim by updating its status to "submitted" for resubmission.
 * Requires clinic user authorization.
 * 
 * @param claimId - ID of the denied claim to appeal
 * @param userEmail - Email of authenticated clinic user
 * @returns Success indicator
 */
export const appealClaim = mutation({
  args: {
    claimId: v.id("insuranceClaims"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get claim to verify it exists and get tenantId
    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Claim not found");
    }

    // Verify claim is denied
    if (claim.status !== "denied") {
      throw new Error("Only denied claims can be appealed");
    }

    const tenantId = claim.tenantId;

    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to appeal claim"
      );
    }

    // Update claim status to "submitted" (appealing resubmits the claim)
    // Clear denial reason since we're appealing
    await ctx.db.patch(args.claimId, {
      status: "submitted",
      denialReason: undefined,
      updatedAt: now,
    });

    // Log appeal action if audit logging is available
    if (authResult.userId) {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId: authResult.userId,
          action: "claim_appealed",
          resource: "insuranceClaims",
          resourceId: args.claimId,
          details: {
            claimId: args.claimId,
            claimControlNumber: claim.claimControlNumber,
            previousStatus: "denied",
            newStatus: "submitted",
          },
          timestamp: now,
        });
      } catch (error) {
        // Don't throw - audit logging failures shouldn't break operations
        console.error("Failed to log claim appeal audit event", error);
      }
    }

    return { success: true };
  },
});

/**
 * Get Claim By ID for Seeding (Task 8.2)
 * 
 * Query to get claim details for seeding purposes.
 * Requires admin/clinic user authorization.
 * 
 * @param claimId - ID of the claim
 * @param tenantId - Tenant ID for verification
 * @param userEmail - Email of authenticated admin user
 * @returns Claim details
 */
export const getClaimByIdForSeeding = query({
  args: {
    claimId: v.id("insuranceClaims"),
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to get claim details"
      );
    }

    const claim = await ctx.db.get(args.claimId);
    
    if (!claim) {
      return null;
    }

    if (claim.tenantId !== args.tenantId) {
      return null;
    }

    return {
      _id: claim._id,
      totalCharges: claim.totalCharges,
      invoiceId: claim.invoiceId,
      status: claim.status,
    };
  },
});

/**
 * Update Invoice Status for Seeding (Task 8.4)
 * 
 * Admin mutation to update invoice status, dueDate, and paidDate for seeding purposes.
 * Requires admin/clinic user authorization.
 * 
 * @param invoiceId - ID of the invoice to update
 * @param status - New status for the invoice
 * @param dueDate - Optional due date (timestamp)
 * @param paidDate - Optional paid date (timestamp)
 * @param userEmail - Email of authenticated admin user
 */
export const updateInvoiceStatusForSeeding = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("denied"),
      v.literal("partially_paid")
    ),
    dueDate: v.optional(v.number()),
    paidDate: v.optional(v.number()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get invoice to verify it exists and get tenantId
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const tenantId = invoice.tenantId;

    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to update invoice status"
      );
    }

    // Build update object
    const updateData: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.dueDate !== undefined) {
      updateData.dueDate = args.dueDate;
    }

    if (args.paidDate !== undefined) {
      updateData.paidDate = args.paidDate;
    }

    // Update invoice
    await ctx.db.patch(args.invoiceId, updateData);
  },
});

/**
 * Get Patient Invoices for Seeding (Task 8.4)
 * 
 * Query to get all invoices for a patient for seeding purposes.
 * Requires admin/clinic user authorization.
 * 
 * @param patientId - ID of the patient
 * @param tenantId - Tenant ID for verification
 * @param userEmail - Email of authenticated admin user
 * @returns Array of invoice IDs and statuses
 */
export const getPatientInvoicesForSeeding = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify clinic user authorization
    const authResult = await verifyClinicBillingAccess(
      ctx,
      args.userEmail,
      args.tenantId
    );

    if (!authResult.authorized) {
      throw new Error(
        authResult.error || "Unauthorized access to get patient invoices"
      );
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_tenant_patient", (q) =>
        q.eq("tenantId", args.tenantId).eq("patientId", args.patientId)
      )
      .collect();

    return invoices.map((invoice) => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      amount: invoice.amount,
      patientResponsibility: invoice.patientResponsibility,
      insuranceResponsibility: invoice.insuranceResponsibility,
      claimId: invoice.claimId,
    }));
  },
});

