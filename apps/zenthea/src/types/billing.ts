// Billing domain types and interfaces for Zenthea RCM system
// These types define the core billing concepts used across Clinic, Provider, and Patient views

/**
 * Insurance Payer (Insurance Company)
 * The organization responsible for processing and paying insurance claims
 */
export interface InsurancePayer {
  payerId: string; // Unique identifier for the payer
  name: string; // Display name (e.g., "Blue Cross Blue Shield", "Aetna")
  planType: PayerPlanType; // Type of insurance plan
  contactInfo: PayerContactInfo; // Contact information for claim submission
  tenantId: string; // Tenant isolation
}

/**
 * Types of insurance plans
 */
export type PayerPlanType =
  | "hmo" // Health Maintenance Organization
  | "ppo" // Preferred Provider Organization
  | "medicare" // Medicare
  | "medicaid" // Medicaid
  | "tricare" // TRICARE (military)
  | "commercial" // Commercial insurance
  | "self_pay"; // Self-pay (no insurance)

/**
 * Contact information for insurance payer
 */
export interface PayerContactInfo {
  phone?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  website?: string;
  claimsAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Insurance Claim Status
 * The lifecycle state of an insurance claim
 */
export type ClaimStatus =
  | "draft" // Claim created but not yet submitted
  | "submitted" // Claim sent to insurance, awaiting processing
  | "accepted" // Insurance accepted claim for processing
  | "denied" // Insurance denied the claim
  | "paid"; // Insurance paid the claim (may be partial)

/**
 * Insurance Claim
 * A formal request submitted to an insurance company for payment
 */
export interface InsuranceClaim {
  claimId: string; // Unique identifier
  patientId: string; // Reference to patient
  providerId: string; // Reference to provider
  payerId: string; // Reference to insurance payer
  invoiceId?: string; // Optional reference to invoice (for patient responsibility)
  status: ClaimStatus;
  totalCharges: number; // Total charges in cents
  datesOfService: string[]; // Array of ISO date strings
  claimControlNumber: string; // Unique claim identifier for tracking
  denialReason?: DenialReason; // Present if status is "denied"
  tenantId: string; // Tenant isolation
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

/**
 * Denial Reason
 * Explanation for why an insurance claim was denied
 */
export interface DenialReason {
  code: string; // Standard denial code (e.g., CO-50)
  description: string; // Human-readable explanation
  category?: DenialCategory; // Category of denial
}

/**
 * Categories of claim denials
 */
export type DenialCategory =
  | "missing_information" // Required information missing
  | "not_covered" // Service not covered by plan
  | "duplicate" // Duplicate claim
  | "timely_filing" // Filed too late
  | "prior_authorization" // Prior authorization required
  | "medical_necessity" // Medical necessity not met
  | "other"; // Other reason

/**
 * Claim Line Item
 * A single service or procedure on a claim
 */
export interface ClaimLineItem {
  lineItemId: string; // Unique identifier
  claimId: string; // Reference to parent claim
  procedureCode: string; // CPT or HCPCS code
  modifiers?: string[]; // Array of modifier codes
  diagnosisCodes: string[]; // Array of ICD-10 diagnosis codes
  units: number; // Quantity of service
  chargeAmount: number; // Charge amount in cents
  tenantId: string; // Tenant isolation
  createdAt: number; // Timestamp
}

/**
 * Invoice Status
 * The current state of a patient invoice
 */
export type InvoiceStatus =
  | "pending" // Invoice created, awaiting payment
  | "paid" // Invoice fully paid
  | "overdue" // Invoice past due date
  | "cancelled" // Invoice cancelled
  | "draft" // New: claim not yet submitted
  | "submitted" // New: claim submitted to insurance
  | "denied" // New: claim denied by insurance
  | "partially_paid"; // New: partial payment received

/**
 * Invoice
 * A bill sent to a patient for services rendered
 */
export interface Invoice {
  invoiceId: string; // Unique identifier
  invoiceNumber: string; // Human-readable invoice number
  patientId: string; // Reference to patient
  appointmentId?: string; // Optional reference to appointment
  claimId?: string; // Optional reference to insurance claim
  amount: number; // Total amount in cents
  patientResponsibility: number; // Patient's portion in cents
  insuranceResponsibility: number; // Insurance portion in cents
  status: InvoiceStatus;
  serviceType: string; // Type of service (e.g., "Appointment", "Lab Services")
  description: string; // Description of services
  dueDate: number; // Timestamp
  paidDate?: number; // Timestamp when fully paid
  paymentMethod?: string; // Payment method if paid
  tenantId: string; // Tenant isolation
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

/**
 * Invoice Line Item
 * A single service or charge on an invoice
 */
export interface InvoiceLineItem {
  lineItemId: string; // Unique identifier
  invoiceId: string; // Reference to parent invoice
  description: string; // Description of service
  quantity: number; // Quantity
  unitPrice: number; // Price per unit in cents
  totalAmount: number; // Total amount in cents
  procedureCode?: string; // Optional CPT/HCPCS code
  tenantId: string; // Tenant isolation
}

/**
 * Patient Payment
 * Payment received from a patient toward their invoice
 */
export interface PatientPayment {
  paymentId: string; // Unique identifier
  patientId: string; // Reference to patient
  invoiceId: string; // Reference to invoice being paid
  amount: number; // Payment amount in cents
  paymentMethod: PaymentMethod;
  transactionId?: string; // External transaction ID (e.g., from payment gateway)
  paidAt: number; // Timestamp
  tenantId: string; // Tenant isolation
  createdAt: number; // Timestamp
}

/**
 * Insurance Payment
 * Payment received from an insurance company for a claim
 */
export interface InsurancePayment {
  paymentId: string; // Unique identifier
  claimId: string; // Reference to claim being paid
  amount: number; // Payment amount in cents
  adjustmentAmount: number; // Adjustment amount in cents (can be negative)
  checkNumber?: string; // Check number if paid by check
  transactionId?: string; // External transaction ID
  paidAt: number; // Timestamp
  tenantId: string; // Tenant isolation
  createdAt: number; // Timestamp
}

/**
 * Payment Method
 * Method used to make a payment
 */
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "check"
  | "cash"
  | "eft" // Electronic Funds Transfer
  | "ach" // Automated Clearing House
  | "other";

/**
 * Adjustment
 * A modification to the billed amount
 */
export interface Adjustment {
  adjustmentId: string; // Unique identifier
  claimId?: string; // Reference to claim (if adjustment to claim)
  invoiceId?: string; // Reference to invoice (if adjustment to invoice)
  amount: number; // Adjustment amount in cents (can be negative)
  reasonCode: string; // Standard adjustment reason code
  description: string; // Human-readable description
  adjustmentType: AdjustmentType;
  appliedAt: number; // Timestamp
  tenantId: string; // Tenant isolation
}

/**
 * Types of adjustments
 */
export type AdjustmentType =
  | "contractual" // Contractual discount per insurance agreement
  | "write_off" // Amount written off as uncollectible
  | "correction" // Correction to original billing error
  | "prompt_pay" // Prompt payment discount
  | "other";

/**
 * RCM Metrics (Revenue Cycle Management)
 * Key performance indicators for billing operations
 */
export interface RCMMetrics {
  totalAR: number; // Total Accounts Receivable in dollars (backend converts from cents)
  daysInAR: number; // Average days in Accounts Receivable
  cleanClaimRate: number; // Percentage (0-100)
  denialRate: number; // Percentage (0-100)
  netCollectionRate: number; // Percentage (0-100)
  totalBilled: number; // Total billed amount in cents
  totalCollected: number; // Total collected amount in cents
  periodStart: number; // Timestamp
  periodEnd: number; // Timestamp
}

/**
 * Provider RCM Metrics
 * Provider-specific billing metrics
 */
export interface ProviderRCMMetrics {
  providerId: string;
  myProduction: number; // Total billed by this provider in cents
  myCollections: number; // Total collected for this provider in cents
  averageDaysToPayment: number; // Average days from service to payment
  claimCount: number; // Number of claims
  paidClaimCount: number; // Number of paid claims
  deniedClaimCount: number; // Number of denied claims
  periodStart: number; // Timestamp
  periodEnd: number; // Timestamp
}

/**
 * Patient Billing Summary
 * Summary of patient's billing information
 */
export interface PatientBillingSummary {
  patientId: string;
  outstandingBalance: number; // Total outstanding balance in cents
  upcomingCharges: number; // Charges due in next 30 days in cents
  totalPaid: number; // Total paid in last 3 months in cents
  pendingCount: number; // Number of pending/overdue invoices
  invoiceCount: number; // Total number of invoices
}

/**
 * Claim Creation Input
 * Data required to create a new insurance claim
 */
export interface CreateClaimInput {
  patientId: string;
  providerId: string;
  payerId: string;
  datesOfService: string[]; // ISO date strings
  lineItems: CreateClaimLineItemInput[];
  invoiceId?: string; // Optional: link to existing invoice
}

/**
 * Claim Line Item Creation Input
 * Data required to create a claim line item
 */
export interface CreateClaimLineItemInput {
  procedureCode: string; // CPT or HCPCS code
  modifiers?: string[];
  diagnosisCodes: string[];
  units: number;
  chargeAmount: number; // In cents
}

/**
 * Payment Recording Input
 * Data required to record a payment
 */
export interface RecordPaymentInput {
  amount: number; // In cents
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paidAt?: number; // Timestamp (defaults to now)
}

/**
 * Patient Payment Recording Input
 * Data required to record a patient payment
 */
export interface RecordPatientPaymentInput extends RecordPaymentInput {
  patientId: string;
  invoiceId: string;
}

/**
 * Insurance Payment Recording Input
 * Data required to record an insurance payment
 */
export interface RecordInsurancePaymentInput {
  claimId: string;
  amount: number; // In cents
  adjustmentAmount?: number; // In cents (defaults to 0)
  checkNumber?: string;
  transactionId?: string;
  paidAt?: number; // Timestamp (defaults to now)
}

/**
 * Claim Filter Options
 * Filters for querying claims
 */
export interface ClaimFilterOptions {
  status?: ClaimStatus | ClaimStatus[];
  payerId?: string | string[];
  providerId?: string | string[];
  patientId?: string;
  dateFrom?: number; // Timestamp
  dateTo?: number; // Timestamp
  tenantId: string; // Required for tenant isolation
}

/**
 * Invoice Filter Options
 * Filters for querying invoices
 */
export interface InvoiceFilterOptions {
  status?: InvoiceStatus | InvoiceStatus[];
  patientId?: string;
  dateFrom?: number; // Timestamp
  dateTo?: number; // Timestamp
  tenantId: string; // Required for tenant isolation
}

/**
 * Pagination Options
 * Options for paginated queries
 */
export interface PaginationOptions {
  limit?: number; // Number of items per page (default: 20)
  offset?: number; // Number of items to skip (default: 0)
  sortBy?: string; // Field to sort by
  sortOrder?: "asc" | "desc"; // Sort direction
}

/**
 * Paginated Response
 * Response with pagination metadata
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number; // Total number of items
  limit: number; // Items per page
  offset: number; // Current offset
  hasMore: boolean; // Whether there are more items
}

/**
 * Helper type for status badge variants (for UI components)
 */
export type StatusBadgeVariant = "default" | "success" | "warning" | "error" | "info";

/**
 * Status Display Mapping
 * 
 * @deprecated Use `getStatusLabel()` from '@/lib/billing/statusMapping' instead.
 * This constant will be removed in a future version.
 * 
 * Migration guide:
 * - Replace `CLAIM_STATUS_LABELS[status]` with `getStatusLabel(status)`
 * - The new utility provides consistent status display across all billing views
 */
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  accepted: "Accepted",
  denied: "Denied",
  paid: "Paid",
};

/**
 * @deprecated Use `getStatusLabel()` from '@/lib/billing/statusMapping' instead.
 * This constant will be removed in a future version.
 * 
 * Migration guide:
 * - Replace `INVOICE_STATUS_LABELS[status]` with `getStatusLabel(status)`
 * - The new utility provides consistent status display across all billing views
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  draft: "Draft",
  submitted: "Submitted",
  denied: "Denied",
  partially_paid: "Partially Paid",
};

/**
 * Get status badge variant for claim status
 * 
 * @deprecated Use `getStatusBadgeVariant()` from '@/lib/billing/statusMapping' instead.
 * This function will be removed in a future version.
 * 
 * Migration guide:
 * - Replace `getClaimStatusBadgeVariant(status)` with `getStatusBadgeVariant(status)`
 * - The new utility provides consistent badge variants across all billing views
 */
export function getClaimStatusBadgeVariant(status: ClaimStatus): StatusBadgeVariant {
  switch (status) {
    case "paid":
      return "success";
    case "denied":
      return "error";
    case "submitted":
    case "accepted":
      return "info";
    case "draft":
      return "default";
    default:
      return "default";
  }
}

/**
 * Get status badge variant for invoice status
 * 
 * @deprecated Use `getStatusBadgeVariant()` from '@/lib/billing/statusMapping' instead.
 * This function will be removed in a future version.
 * 
 * Migration guide:
 * - Replace `getInvoiceStatusBadgeVariant(status)` with `getStatusBadgeVariant(status)`
 * - The new utility provides consistent badge variants across all billing views
 */
export function getInvoiceStatusBadgeVariant(status: InvoiceStatus): StatusBadgeVariant {
  switch (status) {
    case "paid":
      return "success";
    case "overdue":
    case "denied":
      return "error";
    case "pending":
    case "partially_paid":
      return "warning";
    case "submitted":
      return "info";
    case "draft":
    case "cancelled":
      return "default";
    default:
      return "default";
  }
}

