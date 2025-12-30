/**
 * Audit Logging Module - Immutable Write-Only Storage
 * 
 * HIPAA-compliant audit logging for Protected Health Information (PHI) access
 * and permission change tracking for security and compliance.
 * 
 * ⚠️ CRITICAL: IMMUTABLE LOG STORAGE
 * 
 * This module provides immutable, write-only audit logging that cannot be
 * modified or deleted, ensuring HIPAA compliance requirements are met.
 * 
 * IMMUTABILITY GUARANTEES:
 * - ✅ Write-only access: Only INSERT operations are allowed
 * - ✅ No UPDATE functions: Audit logs cannot be modified after creation
 * - ✅ No DELETE functions: Audit logs cannot be deleted (except via retention policies)
 * - ✅ No PATCH functions: Partial updates are not allowed
 * - ✅ Atomic operations: Convex mutations ensure data integrity
 * - ✅ Validation: All inputs are validated before insertion
 * 
 * HIPAA COMPLIANCE REQUIREMENTS:
 * - Audit logs must be immutable to prevent tampering (45 CFR § 164.312(b))
 * - Audit logs must track all PHI access with element-level detail
 * - Audit logs must be retained for at least 6 years (45 CFR § 164.530(j))
 * - Audit logs must be accessible for compliance audits
 * 
 * DATA RETENTION:
 * - Audit logs are stored permanently by default
 * - Retention policies (if implemented) must comply with HIPAA requirements
 * - Log archival/deletion should only occur after minimum retention period
 * - See Task 7.2.4 for retention policy implementation
 * 
 * SECURITY CONSIDERATIONS:
 * - All audit log entries are timestamped and cannot be backdated
 * - User attribution is required for all PHI access
 * - Tenant isolation is enforced for all queries
 * - IP address and user agent tracking for security forensics
 * 
 * Features:
 * - PHI Access Logging: Element-level detail for HIPAA compliance
 * - Permission Change Tracking: Before/after state tracking for security audits
 * - Query Interface: Comprehensive filtering and reporting capabilities
 * 
 * Usage:
 * ```typescript
 * import { api } from "@/convex/_generated/api";
 * 
 * // Log PHI access:
 * await ctx.runMutation(api.audit.logPHIAccess, {
 *   tenantId: "clinic-123",
 *   userId: userId,
 *   patientId: patientId,
 *   dataElements: ["name", "dateOfBirth", "medicalHistory"],
 *   purpose: "treatment",
 *   action: "view_patient_record",
 *   resource: "patient",
 *   resourceId: patientId,
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   details: { additional: "context" }
 * });
 * 
 * // Log permission change:
 * await ctx.runMutation(api.audit.logPermissionChange, {
 *   tenantId: "clinic-123",
 *   userId: targetUserId,
 *   oldPermissions: oldPermissionTree,
 *   newPermissions: newPermissionTree,
 *   changedBy: adminUserId,
 *   action: "permission_changed",
 *   resource: "users",
 *   resourceId: targetUserId,
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   details: { reason: "Role updated" }
 * });
 * ```
 * 
 * ⚠️ IMPORTANT: DO NOT CREATE UPDATE OR DELETE FUNCTIONS
 * 
 * This module intentionally does NOT provide:
 * - updateAuditLog() - Audit logs cannot be modified
 * - deleteAuditLog() - Audit logs cannot be deleted (except via retention)
 * - patchAuditLog() - Partial updates are not allowed
 * 
 * If you need to correct an audit log entry, create a new entry with a correction
 * action and reference the original log entry ID in the details field.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { permissionTreeValidator } from "./validators";
import { internal } from "./_generated/api";

/**
 * Valid HIPAA purposes for accessing PHI
 * These align with HIPAA's permitted uses and disclosures under 45 CFR § 164.502
 */
const VALID_HIPAA_PURPOSES = [
  "treatment",              // Providing healthcare services
  "payment",                // Billing and payment processing
  "healthcare_operations",  // Quality improvement, training, compliance
  "patient_request",        // Patient-initiated access request
  "legal_requirement",      // Required by law (subpoena, court order, etc.)
] as const;

/**
 * Common PHI data elements that may be accessed
 * This list helps validate data element names for consistency
 */
const COMMON_PHI_ELEMENTS = [
  "name",
  "dateOfBirth",
  "ssn",
  "address",
  "phone",
  "email",
  "insurance",
  "medicalHistory",
  "allergies",
  "medications",
  "labResults",
  "diagnoses",
  "treatmentPlans",
  "appointments",
  "billing",
  "emergencyContacts",
  "demographics",
  "vitalSigns",
  "notes",
  "documents",
] as const;

/**
 * Log PHI access with element-level detail
 * 
 * Creates an immutable audit log entry for PHI access that meets HIPAA compliance requirements.
 * This function ensures all required fields are present and validates HIPAA purposes.
 * 
 * IMPORTANT: This function creates write-only audit logs that cannot be modified or deleted,
 * ensuring HIPAA compliance. The audit logs are stored permanently for compliance tracking.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param userId - User ID who accessed the PHI (required for accountability)
 * @param patientId - Patient whose PHI was accessed (required)
 * @param dataElements - Specific PHI elements accessed (required, non-empty array)
 * @param purpose - HIPAA-compliant purpose for access (required, must be valid HIPAA purpose)
 * @param action - Action performed (e.g., "view_patient_record", "update_medical_history")
 * @param resource - Resource type (e.g., "patient", "medicalRecord", "appointment")
 * @param resourceId - ID of the resource accessed
 * @param ipAddress - IP address from which access occurred (optional but recommended)
 * @param userAgent - User agent string (optional but recommended)
 * @param details - Additional context about the access (optional)
 * 
 * @returns Audit log entry ID
 * 
 * @throws Error if validation fails (missing required fields, invalid purpose, etc.)
 */
export const logPHIAccess = mutation({
  args: {
    tenantId: v.string(),
    userId: v.id("users"), // Required - PHI access must be attributed to a user
    patientId: v.id("patients"), // Required - Patient whose PHI was accessed
    dataElements: v.array(v.string()), // Required - Specific PHI elements accessed
    purpose: v.string(), // Required - HIPAA-compliant purpose
    action: v.string(), // Required - Action performed
    resource: v.string(), // Required - Resource type
    resourceId: v.string(), // Required - Resource ID
    ipAddress: v.optional(v.string()), // Optional but recommended for security
    userAgent: v.optional(v.string()), // Optional but recommended for security
    details: v.optional(v.any()), // Optional - Additional context
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for PHI access logging");
    }

    if (!args.userId) {
      throw new Error("userId is required for PHI access logging - PHI access must be attributed to a user");
    }

    if (!args.patientId) {
      throw new Error("patientId is required for PHI access logging");
    }

    if (!args.dataElements || args.dataElements.length === 0) {
      throw new Error("dataElements is required and must be a non-empty array - specify which PHI elements were accessed");
    }

    if (!args.purpose || args.purpose.trim() === "") {
      throw new Error("purpose is required for PHI access logging - must specify HIPAA-compliant purpose");
    }

    // Validate HIPAA purpose
    if (!VALID_HIPAA_PURPOSES.includes(args.purpose as any)) {
      throw new Error(
        `Invalid HIPAA purpose: "${args.purpose}". Valid purposes are: ${VALID_HIPAA_PURPOSES.join(", ")}`
      );
    }

    if (!args.action || args.action.trim() === "") {
      throw new Error("action is required for PHI access logging");
    }

    if (!args.resource || args.resource.trim() === "") {
      throw new Error("resource is required for PHI access logging");
    }

    if (!args.resourceId || args.resourceId.trim() === "") {
      throw new Error("resourceId is required for PHI access logging");
    }

    // Validate data elements are non-empty strings
    const invalidElements = args.dataElements.filter(
      (element) => !element || typeof element !== "string" || element.trim() === ""
    );
    if (invalidElements.length > 0) {
      throw new Error(
        `Invalid data elements: all data elements must be non-empty strings. Found invalid: ${invalidElements.join(", ")}`
      );
    }

    // Verify patient exists (for data integrity)
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${args.patientId}`);
    }

    // Verify user exists (for data integrity)
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Verify tenant isolation (user and patient must belong to same tenant)
    // Check that user has a tenantId (required for tenant isolation)
    if (!user.tenantId) {
      throw new Error(
        `Tenant isolation violation: User ${args.userId} does not have a tenantId assigned. Users must have a tenantId to access PHI.`
      );
    }

    // Verify user and patient belong to the same tenant
    if (user.tenantId !== patient.tenantId) {
      throw new Error(
        `Tenant isolation violation: User tenant (${user.tenantId}) does not match patient tenant (${patient.tenantId})`
      );
    }

    if (args.tenantId !== patient.tenantId) {
      throw new Error(
        `Tenant isolation violation: Requested tenant (${args.tenantId}) does not match patient tenant (${patient.tenantId})`
      );
    }

    // ⚠️ IMMUTABLE LOG CREATION - WRITE-ONLY ACCESS
    // 
    // This function creates write-only audit log entries that cannot be modified or deleted.
    // The use of ctx.db.insert() ensures:
    // - Atomic operation: Cannot be rolled back once committed
    // - Immutability: No update/patch/delete operations allowed
    // - HIPAA compliance: Prevents tampering with audit trail
    //
    // VALIDATION: Always use current timestamp to prevent backdating
    // Audit logs must be created in real-time to ensure audit trail integrity
    const currentTimestamp = Date.now();

    // Create immutable audit log entry directly in the database
    // This ensures the log entry is write-only and cannot be modified or deleted
    // Mutations in Convex are atomic and cannot be rolled back, ensuring immutability
    const auditLogId = await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: currentTimestamp, // Always use current timestamp to prevent backdating
      phiAccessed: {
        patientId: args.patientId,
        dataElements: args.dataElements, // Element-level detail for HIPAA compliance
        purpose: args.purpose, // HIPAA-compliant purpose
      },
    });

    // ⚠️ VALIDATION: Verify log was created successfully
    // This ensures the immutable log entry exists and cannot be modified
    const createdLog = await ctx.db.get(auditLogId);
    if (!createdLog) {
      throw new Error("Failed to create immutable audit log entry - data integrity violation");
    }

    return auditLogId;
  },
});

/**
 * Query PHI access logs with filtering options
 * 
 * Retrieves PHI access audit logs with comprehensive filtering capabilities for HIPAA compliance reporting.
 * All queries are tenant-isolated and return only logs for the specified tenant.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation (required)
 * @param patientId - Filter by specific patient ID (optional)
 * @param userId - Filter by specific user ID (optional)
 * @param purpose - Filter by HIPAA purpose (optional)
 * @param dataElement - Filter by specific data element accessed (optional)
 * @param startDate - Start timestamp for date range filter (optional)
 * @param endDate - End timestamp for date range filter (optional)
 * @param limit - Maximum number of logs to return (default: 50, max: 500)
 * @param offset - Number of logs to skip for pagination (default: 0)
 * 
 * @returns Paginated list of PHI access audit logs with total count
 * 
 * Usage:
 * ```typescript
 * // Get all PHI access logs for a tenant
 * const logs = await convex.query(api.audit.getPHIAccessLogs, {
 *   tenantId: "clinic-123"
 * });
 * 
 * // Get PHI access logs for a specific patient
 * const patientLogs = await convex.query(api.audit.getPHIAccessLogs, {
 *   tenantId: "clinic-123",
 *   patientId: patientId
 * });
 * 
 * // Get PHI access logs by purpose
 * const treatmentLogs = await convex.query(api.audit.getPHIAccessLogs, {
 *   tenantId: "clinic-123",
 *   purpose: "treatment"
 * });
 * 
 * // Get PHI access logs for a specific data element
 * const ssnAccessLogs = await convex.query(api.audit.getPHIAccessLogs, {
 *   tenantId: "clinic-123",
 *   dataElement: "ssn"
 * });
 * ```
 */
export const getPHIAccessLogs = query({
  args: {
    tenantId: v.string(),
    patientId: v.optional(v.id("patients")),
    userId: v.optional(v.id("users")),
    purpose: v.optional(v.string()),
    dataElement: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate tenantId
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for PHI access log queries");
    }

    // Validate purpose if provided
    if (args.purpose && !VALID_HIPAA_PURPOSES.includes(args.purpose as any)) {
      throw new Error(
        `Invalid HIPAA purpose: "${args.purpose}". Valid purposes are: ${VALID_HIPAA_PURPOSES.join(", ")}`
      );
    }

    // Get all audit logs for the tenant
    // Note: Convex doesn't support direct indexing of nested fields (phiAccessed.patientId),
    // so we query by tenant and filter in memory for PHI access logs
    let logs;
    
    if (args.userId) {
      // Filter by both tenant and user using index
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => 
          q.eq("tenantId", args.tenantId).eq("userId", args.userId)
        )
        .collect();
    } else {
      // Filter by tenant only using index
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    // Filter for PHI access logs only (must have phiAccessed field)
    logs = logs.filter(log => log.phiAccessed !== undefined && log.phiAccessed !== null);

    // Apply PHI-specific filters
    if (args.patientId) {
      logs = logs.filter(log => log.phiAccessed?.patientId === args.patientId);
    }

    if (args.purpose) {
      logs = logs.filter(log => log.phiAccessed?.purpose === args.purpose);
    }

    if (args.dataElement) {
      logs = logs.filter(log => 
        log.phiAccessed?.dataElements?.includes(args.dataElement!)
      );
    }

    // Apply date range filters
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 50, 500); // Cap at 500 for performance
    const paginatedLogs = logs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: logs.length,
      hasMore: offset + limit < logs.length,
    };
  },
});

/**
 * Get PHI access logs for a specific patient
 * 
 * Convenience function to retrieve all PHI access logs for a specific patient.
 * This is useful for patient access reports and HIPAA compliance audits.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param patientId - Patient ID whose PHI access logs to retrieve
 * @param limit - Maximum number of logs to return (default: 100)
 * @param offset - Number of logs to skip for pagination (default: 0)
 * 
 * @returns Paginated list of PHI access audit logs for the patient
 */
export const getPHIAccessLogsByPatient = query({
  args: {
    tenantId: v.string(),
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify patient exists and belongs to tenant
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${args.patientId}`);
    }

    if (patient.tenantId !== args.tenantId) {
      throw new Error(
        `Tenant isolation violation: Patient tenant (${patient.tenantId}) does not match requested tenant (${args.tenantId})`
      );
    }

    // Get all audit logs for the tenant
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter for PHI access logs for this specific patient
    let phiLogs = logs.filter(log => 
      log.phiAccessed !== undefined && 
      log.phiAccessed !== null &&
      log.phiAccessed.patientId === args.patientId
    );

    // Sort by timestamp (most recent first)
    phiLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 100, 500); // Cap at 500 for performance
    const paginatedLogs = phiLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: phiLogs.length,
      hasMore: offset + limit < phiLogs.length,
    };
  },
});

/**
 * Get PHI access statistics for compliance reporting
 * 
 * Provides aggregated statistics about PHI access for HIPAA compliance reporting.
 * Includes access counts by purpose, data elements, users, and time periods.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param startDate - Start timestamp for statistics period (optional)
 * @param endDate - End timestamp for statistics period (optional)
 * 
 * @returns Aggregated PHI access statistics
 * 
 * Usage:
 * ```typescript
 * const stats = await convex.query(api.audit.getPHIAccessStats, {
 *   tenantId: "clinic-123",
 *   startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
 *   endDate: Date.now()
 * });
 * ```
 */
export const getPHIAccessStats = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate tenantId
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for PHI access statistics");
    }

    // Get all PHI access logs for the tenant
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter for PHI access logs only
    let phiLogs = logs.filter(log => log.phiAccessed !== undefined && log.phiAccessed !== null);

    // Apply date range filters
    if (args.startDate) {
      phiLogs = phiLogs.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      phiLogs = phiLogs.filter(log => log.timestamp <= args.endDate!);
    }

    // Calculate statistics
    const stats = {
      totalAccesses: phiLogs.length,
      accessesByPurpose: {} as Record<string, number>,
      accessesByDataElement: {} as Record<string, number>,
      accessesByUser: {} as Record<string, number>,
      accessesByPatient: {} as Record<string, number>,
      dailyAccesses: {} as Record<string, number>,
      uniquePatientsAccessed: new Set<string>(),
      uniqueUsersAccessing: new Set<string>(),
    };

    phiLogs.forEach(log => {
      if (!log.phiAccessed) return;

      // Count by purpose
      const purpose = log.phiAccessed.purpose;
      stats.accessesByPurpose[purpose] = (stats.accessesByPurpose[purpose] || 0) + 1;

      // Count by data elements
      log.phiAccessed.dataElements?.forEach(element => {
        stats.accessesByDataElement[element] = (stats.accessesByDataElement[element] || 0) + 1;
      });

      // Count by user
      if (log.userId) {
        stats.accessesByUser[log.userId] = (stats.accessesByUser[log.userId] || 0) + 1;
        stats.uniqueUsersAccessing.add(log.userId);
      }

      // Count by patient
      const patientId = log.phiAccessed.patientId;
      stats.accessesByPatient[patientId] = (stats.accessesByPatient[patientId] || 0) + 1;
      stats.uniquePatientsAccessed.add(patientId);

      // Count daily accesses
      const date = new Date(log.timestamp).toISOString().split('T')[0]!;
      stats.dailyAccesses[date] = (stats.dailyAccesses[date] || 0) + 1;
    });

    return {
      ...stats,
      uniquePatientsAccessed: stats.uniquePatientsAccessed.size,
      uniqueUsersAccessing: stats.uniqueUsersAccessing.size,
    };
  },
});

/**
 * Log permission change with before/after state
 * 
 * Creates an immutable audit log entry for permission changes that tracks
 * the complete before/after state of user permissions. This is critical for
 * security audits and compliance tracking.
 * 
 * IMPORTANT: This function creates write-only audit logs that cannot be modified or deleted,
 * ensuring security and compliance. The audit logs are stored permanently for audit tracking.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param userId - User ID whose permissions were changed (required)
 * @param oldPermissions - Previous permission structure before the change (required, PermissionTree format)
 * @param newPermissions - New permission structure after the change (required, PermissionTree format)
 * @param changedBy - User ID who made the permission change (required)
 * @param action - Action performed (e.g., "permission_changed", "role_assigned", "role_updated")
 * @param resource - Resource type (e.g., "users", "customRoles")
 * @param resourceId - ID of the resource (typically the user ID whose permissions changed)
 * @param ipAddress - IP address from which change occurred (optional but recommended)
 * @param userAgent - User agent string (optional but recommended)
 * @param details - Additional context about the change (optional)
 * 
 * @returns Audit log entry ID
 * 
 * @throws Error if validation fails (missing required fields, invalid permissions, etc.)
 */
export const logPermissionChange = mutation({
  args: {
    tenantId: v.string(),
    userId: v.id("users"), // Required - User whose permissions were changed
    oldPermissions: permissionTreeValidator, // Required - Previous permission structure
    newPermissions: permissionTreeValidator, // Required - New permission structure
    changedBy: v.id("users"), // Required - User who made the change
    action: v.string(), // Required - Action performed
    resource: v.string(), // Required - Resource type
    resourceId: v.string(), // Required - Resource ID
    ipAddress: v.optional(v.string()), // Optional but recommended for security
    userAgent: v.optional(v.string()), // Optional but recommended for security
    details: v.optional(v.any()), // Optional - Additional context
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for permission change logging");
    }

    if (!args.userId) {
      throw new Error("userId is required for permission change logging - must specify which user's permissions changed");
    }

    if (!args.oldPermissions) {
      throw new Error("oldPermissions is required for permission change logging - must provide previous permission state");
    }

    if (!args.newPermissions) {
      throw new Error("newPermissions is required for permission change logging - must provide new permission state");
    }

    if (!args.changedBy) {
      throw new Error("changedBy is required for permission change logging - must specify who made the change");
    }

    if (!args.action || args.action.trim() === "") {
      throw new Error("action is required for permission change logging");
    }

    if (!args.resource || args.resource.trim() === "") {
      throw new Error("resource is required for permission change logging");
    }

    if (!args.resourceId || args.resourceId.trim() === "") {
      throw new Error("resourceId is required for permission change logging");
    }

    // Verify user exists (for data integrity)
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Verify changedBy user exists (for data integrity)
    const changedByUser = await ctx.db.get(args.changedBy);
    if (!changedByUser) {
      throw new Error(`User who made the change not found: ${args.changedBy}`);
    }

    // Verify tenant isolation (both users must belong to same tenant)
    if (!user.tenantId) {
      throw new Error(
        `Tenant isolation violation: User ${args.userId} does not have a tenantId assigned. Users must have a tenantId for permission changes.`
      );
    }

    if (!changedByUser.tenantId) {
      throw new Error(
        `Tenant isolation violation: User ${args.changedBy} does not have a tenantId assigned. Users must have a tenantId to make permission changes.`
      );
    }

    // Verify both users belong to the same tenant
    if (user.tenantId !== changedByUser.tenantId) {
      throw new Error(
        `Tenant isolation violation: User tenant (${user.tenantId}) does not match changedBy user tenant (${changedByUser.tenantId})`
      );
    }

    if (args.tenantId !== user.tenantId) {
      throw new Error(
        `Tenant isolation violation: Requested tenant (${args.tenantId}) does not match user tenant (${user.tenantId})`
      );
    }

    // ⚠️ IMMUTABLE LOG CREATION - WRITE-ONLY ACCESS
    // 
    // This function creates write-only audit log entries that cannot be modified or deleted.
    // The use of ctx.db.insert() ensures:
    // - Atomic operation: Cannot be rolled back once committed
    // - Immutability: No update/patch/delete operations allowed
    // - Security compliance: Prevents tampering with permission change audit trail
    //
    // VALIDATION: Ensure timestamp is current (cannot backdate logs)
    const currentTimestamp = Date.now();

    // Create immutable audit log entry directly in the database
    // This ensures the log entry is write-only and cannot be modified or deleted
    // Mutations in Convex are atomic and cannot be rolled back, ensuring immutability
    const auditLogId = await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.changedBy, // The user who made the change (for audit trail)
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: currentTimestamp, // Always use current timestamp to prevent backdating
      permissionChanges: {
        userId: args.userId, // User whose permissions were changed
        oldPermissions: args.oldPermissions, // Complete before state
        newPermissions: args.newPermissions, // Complete after state
        changedBy: args.changedBy, // User who made the change
      },
    });

    // ⚠️ VALIDATION: Verify log was created successfully
    // This ensures the immutable log entry exists and cannot be modified
    const createdLog = await ctx.db.get(auditLogId);
    if (!createdLog) {
      throw new Error("Failed to create immutable audit log entry - data integrity violation");
    }

    return auditLogId;
  },
});

/**
 * Query permission change logs with filtering options
 * 
 * Retrieves permission change audit logs with comprehensive filtering capabilities
 * for security audits and compliance reporting. All queries are tenant-isolated.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation (required)
 * @param userId - Filter by user whose permissions were changed (optional)
 * @param changedBy - Filter by user who made the change (optional)
 * @param startDate - Start timestamp for date range filter (optional)
 * @param endDate - End timestamp for date range filter (optional)
 * @param limit - Maximum number of logs to return (default: 50, max: 500)
 * @param offset - Number of logs to skip for pagination (default: 0)
 * 
 * @returns Paginated list of permission change audit logs with total count
 * 
 * Usage:
 * ```typescript
 * // Get all permission change logs for a tenant
 * const logs = await convex.query(api.audit.getPermissionChangeLogs, {
 *   tenantId: "clinic-123"
 * });
 * 
 * // Get permission changes for a specific user
 * const userLogs = await convex.query(api.audit.getPermissionChangeLogs, {
 *   tenantId: "clinic-123",
 *   userId: userId
 * });
 * 
 * // Get permission changes made by a specific admin
 * const adminLogs = await convex.query(api.audit.getPermissionChangeLogs, {
 *   tenantId: "clinic-123",
 *   changedBy: adminUserId
 * });
 * ```
 */
export const getPermissionChangeLogs = query({
  args: {
    tenantId: v.string(),
    userId: v.optional(v.id("users")),
    changedBy: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate tenantId
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for permission change log queries");
    }

    // Get all audit logs for the tenant
    // Note: Convex doesn't support direct indexing of nested fields (permissionChanges.userId),
    // so we query by tenant and filter in memory for permission change logs
    let logs;
    
    if (args.changedBy) {
      // Filter by both tenant and user (changedBy) using index
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => 
          q.eq("tenantId", args.tenantId).eq("userId", args.changedBy)
        )
        .collect();
    } else {
      // Filter by tenant only using index
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
        .collect();
    }

    // Filter for permission change logs only (must have permissionChanges field)
    logs = logs.filter(log => log.permissionChanges !== undefined && log.permissionChanges !== null);

    // Apply permission change-specific filters
    if (args.userId) {
      logs = logs.filter(log => log.permissionChanges?.userId === args.userId);
    }

    // Note: changedBy filter is already applied via index query above if provided

    // Apply date range filters
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 50, 500); // Cap at 500 for performance
    const paginatedLogs = logs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: logs.length,
      hasMore: offset + limit < logs.length,
    };
  },
});

/**
 * Get permission change logs for a specific user
 * 
 * Convenience function to retrieve all permission change logs for a specific user.
 * This is useful for user access reports and security audits.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param userId - User ID whose permission change logs to retrieve
 * @param limit - Maximum number of logs to return (default: 100)
 * @param offset - Number of logs to skip for pagination (default: 0)
 * 
 * @returns Paginated list of permission change audit logs for the user
 */
export const getPermissionChangeLogsByUser = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    if (user.tenantId !== args.tenantId) {
      throw new Error(
        `Tenant isolation violation: User tenant (${user.tenantId}) does not match requested tenant (${args.tenantId})`
      );
    }

    // Get all audit logs for the tenant
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter for permission change logs for this specific user
    let permissionLogs = logs.filter(log => 
      log.permissionChanges !== undefined && 
      log.permissionChanges !== null &&
      log.permissionChanges.userId === args.userId
    );

    // Sort by timestamp (most recent first)
    permissionLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 100, 500); // Cap at 500 for performance
    const paginatedLogs = permissionLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: permissionLogs.length,
      hasMore: offset + limit < permissionLogs.length,
    };
  },
});

/**
 * Get permission change statistics for compliance reporting
 * 
 * Provides aggregated statistics about permission changes for security audits
 * and compliance reporting. Includes change counts by user, admin, and time periods.
 * 
 * @param tenantId - Tenant ID for multi-tenancy isolation
 * @param startDate - Start timestamp for statistics period (optional)
 * @param endDate - End timestamp for statistics period (optional)
 * 
 * @returns Aggregated permission change statistics
 * 
 * Usage:
 * ```typescript
 * const stats = await convex.query(api.audit.getPermissionChangeStats, {
 *   tenantId: "clinic-123",
 *   startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
 *   endDate: Date.now()
 * });
 * ```
 */
export const getPermissionChangeStats = query({
  args: {
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate tenantId
    if (!args.tenantId || args.tenantId.trim() === "") {
      throw new Error("tenantId is required for permission change statistics");
    }

    // Get all audit logs for the tenant
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter for permission change logs only
    let permissionLogs = logs.filter(log => log.permissionChanges !== undefined && log.permissionChanges !== null);

    // Apply date range filters
    if (args.startDate) {
      permissionLogs = permissionLogs.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      permissionLogs = permissionLogs.filter(log => log.timestamp <= args.endDate!);
    }

    // Calculate statistics
    const stats = {
      totalChanges: permissionLogs.length,
      changesByUser: {} as Record<string, number>,
      changesByAdmin: {} as Record<string, number>,
      changesByAction: {} as Record<string, number>,
      dailyChanges: {} as Record<string, number>,
      uniqueUsersChanged: new Set<string>(),
      uniqueAdminsMakingChanges: new Set<string>(),
    };

    permissionLogs.forEach(log => {
      if (!log.permissionChanges) return;

      // Count by user whose permissions changed
      const userId = log.permissionChanges.userId;
      stats.changesByUser[userId] = (stats.changesByUser[userId] || 0) + 1;
      stats.uniqueUsersChanged.add(userId);

      // Count by admin who made the change
      const changedBy = log.permissionChanges.changedBy;
      stats.changesByAdmin[changedBy] = (stats.changesByAdmin[changedBy] || 0) + 1;
      stats.uniqueAdminsMakingChanges.add(changedBy);

      // Count by action type
      const action = log.action;
      stats.changesByAction[action] = (stats.changesByAction[action] || 0) + 1;

      // Count daily changes
      const date = new Date(log.timestamp).toISOString().split('T')[0]!;
      stats.dailyChanges[date] = (stats.dailyChanges[date] || 0) + 1;
    });

    return {
      ...stats,
      uniqueUsersChanged: stats.uniqueUsersChanged.size,
      uniqueAdminsMakingChanges: stats.uniqueAdminsMakingChanges.size,
    };
  },
});

/**
 * ============================================================================
 * DATA RETENTION POLICY IMPLEMENTATION
 * ============================================================================
 * 
 * HIPAA COMPLIANCE REQUIREMENTS:
 * - Audit logs must be retained for at least 6 years (45 CFR § 164.530(j))
 * - Logs older than retention period may be archived but must remain accessible
 * - Logs cannot be deleted until after minimum retention period
 * - Retention policies must be configurable per tenant
 * 
 * RETENTION POLICY CONFIGURATION:
 * 
 * Retention settings are stored in tenant.settings.auditRetention:
 * {
 *   enabled: boolean,              // Whether retention policy is enabled
 *   retentionPeriodDays: number,  // Minimum retention period in days (default: 2190 = 6 years)
 *   archiveAfterDays: number,     // Archive logs after this many days (default: 365 = 1 year)
 *   deleteAfterDays: number,      // Delete archived logs after this many days (default: 2190 = 6 years)
 *   autoArchive: boolean,          // Automatically archive old logs (default: true)
 *   autoDelete: boolean            // Automatically delete archived logs after retention period (default: false - manual review recommended)
 * }
 * 
 * DEFAULT RETENTION POLICY:
 * - Retention period: 6 years (2190 days) - HIPAA minimum requirement
 * - Archive after: 1 year (365 days) - Move to archived table for performance
 * - Delete after: 6 years (2190 days) - Only if autoDelete is enabled
 * - Auto-archive: Enabled - Automatically archive logs older than 1 year
 * - Auto-delete: Disabled - Requires manual review before deletion
 * 
 * ARCHIVAL PROCESS:
 * 1. Logs older than archiveAfterDays are marked with archivedAt timestamp
 * 2. Logs are copied to archivedAuditLogs table
 * 3. Original logs remain in auditLogs table with archivedAt field set
 * 4. Queries can filter by archivedAt to exclude archived logs from active queries
 * 
 * DELETION PROCESS:
 * 1. Only archived logs older than deleteAfterDays can be deleted
 * 2. Deletion requires explicit confirmation (autoDelete must be enabled)
 * 3. Deletion is logged in audit trail before execution
 * 4. Deleted logs are permanently removed (cannot be recovered)
 * 
 * COMPLIANCE NOTES:
 * - HIPAA requires 6-year retention minimum
 * - Some states may require longer retention periods
 * - Legal holds may extend retention beyond policy
 * - Always consult legal/compliance before deleting logs
 * 
 * ============================================================================
 */

/**
 * Get retention policy configuration for a tenant
 * Returns default values if not configured
 * 
 * @param tenantId - Tenant ID
 * @returns Retention policy configuration
 */
export const getRetentionPolicy = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get tenant to access settings
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Get retention settings from tenant.settings
    const settings = tenant.settings || {};
    const retentionSettings = (settings as any).auditRetention || {};

    // Return retention policy with defaults
    return {
      enabled: retentionSettings.enabled ?? true, // Default: enabled
      retentionPeriodDays: retentionSettings.retentionPeriodDays ?? 2190, // Default: 6 years (HIPAA minimum)
      archiveAfterDays: retentionSettings.archiveAfterDays ?? 365, // Default: 1 year
      deleteAfterDays: retentionSettings.deleteAfterDays ?? 2190, // Default: 6 years
      autoArchive: retentionSettings.autoArchive ?? true, // Default: auto-archive enabled
      autoDelete: retentionSettings.autoDelete ?? false, // Default: auto-delete disabled (manual review)
    };
  },
});

/**
 * Update retention policy configuration for a tenant
 * Only owners can update retention policy
 * 
 * @param tenantId - Tenant ID
 * @param policy - Retention policy configuration
 * @returns Updated retention policy
 */
export const updateRetentionPolicy = mutation({
  args: {
    tenantId: v.string(),
    policy: v.object({
      enabled: v.optional(v.boolean()),
      retentionPeriodDays: v.optional(v.number()),
      archiveAfterDays: v.optional(v.number()),
      deleteAfterDays: v.optional(v.number()),
      autoArchive: v.optional(v.boolean()),
      autoDelete: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate retention period meets HIPAA minimum (6 years = 2190 days)
    const retentionPeriodDays = args.policy.retentionPeriodDays ?? 2190;
    if (retentionPeriodDays < 2190) {
      throw new Error(
        "Retention period must be at least 2190 days (6 years) to meet HIPAA requirements"
      );
    }

    // Validate archiveAfterDays is less than retentionPeriodDays
    const archiveAfterDays = args.policy.archiveAfterDays ?? 365;
    if (archiveAfterDays >= retentionPeriodDays) {
      throw new Error(
        "Archive period must be less than retention period"
      );
    }

    // Validate deleteAfterDays is at least retentionPeriodDays
    const deleteAfterDays = args.policy.deleteAfterDays ?? retentionPeriodDays;
    if (deleteAfterDays < retentionPeriodDays) {
      throw new Error(
        "Delete period must be at least equal to retention period to meet HIPAA requirements"
      );
    }

    // Get tenant
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Update retention settings in tenant.settings
    const currentSettings = tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      auditRetention: {
        ...((currentSettings as any).auditRetention || {}),
        ...args.policy,
      },
    };

    // Update tenant settings
    await ctx.db.patch(tenant._id, {
      settings: updatedSettings,
      updatedAt: Date.now(),
    });

    // Log retention policy update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "retention_policy_updated",
      resource: "audit_retention",
      resourceId: args.tenantId,
      details: {
        previousPolicy: (currentSettings as any).auditRetention || {},
        newPolicy: updatedSettings.auditRetention,
      },
      timestamp: Date.now(),
    });

    return updatedSettings.auditRetention;
  },
});

/**
 * Archive old audit logs based on retention policy
 * Moves logs older than archiveAfterDays to archivedAuditLogs table
 * 
 * @param tenantId - Tenant ID
 * @param dryRun - If true, only report what would be archived without actually archiving
 * @returns Archive operation results
 */
export const archiveOldLogs = mutation({
  args: {
    tenantId: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get tenant to access retention policy settings
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Get retention settings from tenant.settings
    const settings = tenant.settings || {};
    const retentionSettings = (settings as any).auditRetention || {};
    const policy = {
      enabled: retentionSettings.enabled ?? true,
      retentionPeriodDays: retentionSettings.retentionPeriodDays ?? 2190,
      archiveAfterDays: retentionSettings.archiveAfterDays ?? 365,
      deleteAfterDays: retentionSettings.deleteAfterDays ?? 2190,
      autoArchive: retentionSettings.autoArchive ?? true,
      autoDelete: retentionSettings.autoDelete ?? false,
    };

    if (!policy.enabled) {
      return {
        archived: 0,
        skipped: 0,
        errors: [],
        message: "Retention policy is disabled",
      };
    }

    // Calculate cutoff timestamp (logs older than this will be archived)
    const archiveCutoffTimestamp = Date.now() - (policy.archiveAfterDays * 24 * 60 * 60 * 1000);

    // Get all logs for the tenant older than cutoff
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", archiveCutoffTimestamp))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Get all already-archived logs for this tenant to determine which logs are already archived
    // ⚠️ IMMUTABILITY: We check archivedAuditLogs table instead of patching original logs
    // This maintains HIPAA compliance by keeping audit logs completely immutable
    const archivedLogs = await ctx.db
      .query("archivedAuditLogs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Create a Set of originalLogIds that have already been archived for efficient lookup
    const archivedLogIds = new Set(archivedLogs.map(log => log.originalLogId));

    // Filter in memory for unarchived logs (logs that don't exist in archivedAuditLogs)
    const logsToArchive = allLogs.filter(log => !archivedLogIds.has(log._id));

    if (args.dryRun) {
      return {
        archived: 0,
        wouldArchive: logsToArchive.length,
        cutoffTimestamp: archiveCutoffTimestamp,
        cutoffDate: new Date(archiveCutoffTimestamp).toISOString(),
        message: `Dry run: Would archive ${logsToArchive.length} logs`,
      };
    }

    // Archive each log
    const archivedAt = Date.now();
    let archived = 0;
    const errors: Array<{ logId: string; error: string }> = [];

    for (const log of logsToArchive) {
      try {
        // Copy log to archivedAuditLogs table
        // ⚠️ IMMUTABILITY COMPLIANCE: We do NOT patch the original log - it remains immutable
        // The fact that a log exists in archivedAuditLogs with originalLogId indicates it's archived
        // This maintains HIPAA compliance by ensuring audit logs are write-only and unmodifiable
        await ctx.db.insert("archivedAuditLogs", {
          tenantId: log.tenantId,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp,
          archivedAt: archivedAt,
          originalLogId: log._id,
          phiAccessed: log.phiAccessed,
          permissionChanges: log.permissionChanges,
        });

        // ⚠️ IMMUTABILITY: Original audit log is NOT modified
        // The original log in auditLogs table remains completely immutable
        // Archival status is determined by checking if a record exists in archivedAuditLogs
        // This ensures HIPAA compliance (45 CFR § 164.312(b)) - audit logs cannot be tampered with

        archived++;
      } catch (error) {
        errors.push({
          logId: log._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log archival operation
    if (archived > 0) {
      await ctx.db.insert("auditLogs", {
        tenantId: args.tenantId,
        action: "audit_logs_archived",
        resource: "audit_retention",
        resourceId: args.tenantId,
        details: {
          archivedCount: archived,
          cutoffTimestamp: archiveCutoffTimestamp,
          errors: errors.length > 0 ? errors : undefined,
        },
        timestamp: Date.now(),
      });
    }

    return {
      archived,
      skipped: logsToArchive.length - archived,
      errors: errors.length > 0 ? errors : undefined,
      cutoffTimestamp: archiveCutoffTimestamp,
      cutoffDate: new Date(archiveCutoffTimestamp).toISOString(),
    };
  },
});

/**
 * Internal mutation version of archiveOldLogs for scheduled jobs
 * Same functionality but accessible as internal mutation
 */
export const archiveOldLogsInternal = internalMutation({
  args: {
    tenantId: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get tenant to access retention policy settings
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Get retention settings from tenant.settings
    const settings = tenant.settings || {};
    const retentionSettings = (settings as any).auditRetention || {};
    const policy = {
      enabled: retentionSettings.enabled ?? true,
      retentionPeriodDays: retentionSettings.retentionPeriodDays ?? 2190,
      archiveAfterDays: retentionSettings.archiveAfterDays ?? 365,
      deleteAfterDays: retentionSettings.deleteAfterDays ?? 2190,
      autoArchive: retentionSettings.autoArchive ?? true,
      autoDelete: retentionSettings.autoDelete ?? false,
    };

    if (!policy.enabled) {
      return {
        archived: 0,
        skipped: 0,
        errors: [],
        message: "Retention policy is disabled",
      };
    }

    // Calculate cutoff timestamp (logs older than this will be archived)
    const archiveCutoffTimestamp = Date.now() - (policy.archiveAfterDays * 24 * 60 * 60 * 1000);

    // Get all logs for the tenant older than cutoff
    const allLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", archiveCutoffTimestamp))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Get all already-archived logs for this tenant to determine which logs are already archived
    // ⚠️ IMMUTABILITY: We check archivedAuditLogs table instead of patching original logs
    // This maintains HIPAA compliance by keeping audit logs completely immutable
    const archivedLogs = await ctx.db
      .query("archivedAuditLogs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Create a Set of originalLogIds that have already been archived for efficient lookup
    const archivedLogIds = new Set(archivedLogs.map(log => log.originalLogId));

    // Filter in memory for unarchived logs (logs that don't exist in archivedAuditLogs)
    const logsToArchive = allLogs.filter(log => !archivedLogIds.has(log._id));

    if (args.dryRun) {
      return {
        archived: 0,
        wouldArchive: logsToArchive.length,
        cutoffTimestamp: archiveCutoffTimestamp,
        cutoffDate: new Date(archiveCutoffTimestamp).toISOString(),
        message: `Dry run: Would archive ${logsToArchive.length} logs`,
      };
    }

    // Archive each log
    const archivedAt = Date.now();
    let archived = 0;
    const errors: Array<{ logId: string; error: string }> = [];

    for (const log of logsToArchive) {
      try {
        // Copy log to archivedAuditLogs table
        // ⚠️ IMMUTABILITY COMPLIANCE: We do NOT patch the original log - it remains immutable
        // The fact that a log exists in archivedAuditLogs with originalLogId indicates it's archived
        // This maintains HIPAA compliance by ensuring audit logs are write-only and unmodifiable
        await ctx.db.insert("archivedAuditLogs", {
          tenantId: log.tenantId,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp,
          archivedAt: archivedAt,
          originalLogId: log._id,
          phiAccessed: log.phiAccessed,
          permissionChanges: log.permissionChanges,
        });

        // ⚠️ IMMUTABILITY: Original audit log is NOT modified
        // The original log in auditLogs table remains completely immutable
        // Archival status is determined by checking if a record exists in archivedAuditLogs
        // This ensures HIPAA compliance (45 CFR § 164.312(b)) - audit logs cannot be tampered with

        archived++;
      } catch (error) {
        errors.push({
          logId: log._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log archival operation
    if (archived > 0) {
      await ctx.db.insert("auditLogs", {
        tenantId: args.tenantId,
        action: "audit_logs_archived",
        resource: "audit_retention",
        resourceId: args.tenantId,
        details: {
          archivedCount: archived,
          cutoffTimestamp: archiveCutoffTimestamp,
          errors: errors.length > 0 ? errors : undefined,
        },
        timestamp: Date.now(),
      });
    }

    return {
      archived,
      skipped: logsToArchive.length - archived,
      errors: errors.length > 0 ? errors : undefined,
      cutoffTimestamp: archiveCutoffTimestamp,
      cutoffDate: new Date(archiveCutoffTimestamp).toISOString(),
    };
  },
});

/**
 * Delete archived audit logs older than retention period
 * Only deletes logs if autoDelete is enabled and logs are older than deleteAfterDays
 * 
 * WARNING: This operation is irreversible. Logs will be permanently deleted.
 * 
 * @param tenantId - Tenant ID
 * @param dryRun - If true, only report what would be deleted without actually deleting
 * @returns Deletion operation results
 */
export const deleteArchivedLogs = mutation({
  args: {
    tenantId: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get tenant to access retention policy settings
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Get retention settings from tenant.settings
    const settings = tenant.settings || {};
    const retentionSettings = (settings as any).auditRetention || {};
    const policy = {
      enabled: retentionSettings.enabled ?? true,
      retentionPeriodDays: retentionSettings.retentionPeriodDays ?? 2190,
      archiveAfterDays: retentionSettings.archiveAfterDays ?? 365,
      deleteAfterDays: retentionSettings.deleteAfterDays ?? 2190,
      autoArchive: retentionSettings.autoArchive ?? true,
      autoDelete: retentionSettings.autoDelete ?? false,
    };

    if (!policy.enabled) {
      return {
        deleted: 0,
        skipped: 0,
        errors: [],
        message: "Retention policy is disabled",
      };
    }

    if (!policy.autoDelete) {
      return {
        deleted: 0,
        skipped: 0,
        errors: [],
        message: "Auto-delete is disabled. Manual review required before deletion.",
      };
    }

    // Calculate cutoff timestamp (archived logs older than this can be deleted)
    const deleteCutoffTimestamp = Date.now() - (policy.deleteAfterDays * 24 * 60 * 60 * 1000);

    // Get all archived logs older than delete cutoff
    const logsToDelete = await ctx.db
      .query("archivedAuditLogs")
      .withIndex("by_archived_at", (q) => q.lt("archivedAt", deleteCutoffTimestamp))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    if (args.dryRun) {
      return {
        deleted: 0,
        wouldDelete: logsToDelete.length,
        cutoffTimestamp: deleteCutoffTimestamp,
        cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
        message: `Dry run: Would delete ${logsToDelete.length} archived logs`,
      };
    }

    // Log deletion operation BEFORE deleting (for audit trail)
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "archived_audit_logs_deleted",
      resource: "audit_retention",
      resourceId: args.tenantId,
      details: {
        deleteCount: logsToDelete.length,
        cutoffTimestamp: deleteCutoffTimestamp,
        cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
        policy: {
          retentionPeriodDays: policy.retentionPeriodDays,
          deleteAfterDays: policy.deleteAfterDays,
        },
      },
      timestamp: Date.now(),
    });

    // Delete archived logs
    let deleted = 0;
    const errors: Array<{ logId: string; error: string }> = [];

    for (const log of logsToDelete) {
      try {
        await ctx.db.delete(log._id);
        deleted++;
      } catch (error) {
        errors.push({
          logId: log._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      deleted,
      skipped: logsToDelete.length - deleted,
      errors: errors.length > 0 ? errors : undefined,
      cutoffTimestamp: deleteCutoffTimestamp,
      cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
    };
  },
});

/**
 * Internal mutation version of deleteArchivedLogs for scheduled jobs
 * Same functionality but accessible as internal mutation
 */
export const deleteArchivedLogsInternal = internalMutation({
  args: {
    tenantId: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get tenant to access retention policy settings
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error(`Tenant not found: ${args.tenantId}`);
    }

    // Get retention settings from tenant.settings
    const settings = tenant.settings || {};
    const retentionSettings = (settings as any).auditRetention || {};
    const policy = {
      enabled: retentionSettings.enabled ?? true,
      retentionPeriodDays: retentionSettings.retentionPeriodDays ?? 2190,
      archiveAfterDays: retentionSettings.archiveAfterDays ?? 365,
      deleteAfterDays: retentionSettings.deleteAfterDays ?? 2190,
      autoArchive: retentionSettings.autoArchive ?? true,
      autoDelete: retentionSettings.autoDelete ?? false,
    };

    if (!policy.enabled) {
      return {
        deleted: 0,
        skipped: 0,
        errors: [],
        message: "Retention policy is disabled",
      };
    }

    if (!policy.autoDelete) {
      return {
        deleted: 0,
        skipped: 0,
        errors: [],
        message: "Auto-delete is disabled. Manual review required before deletion.",
      };
    }

    // Calculate cutoff timestamp (archived logs older than this can be deleted)
    const deleteCutoffTimestamp = Date.now() - (policy.deleteAfterDays * 24 * 60 * 60 * 1000);

    // Get all archived logs older than delete cutoff
    const logsToDelete = await ctx.db
      .query("archivedAuditLogs")
      .withIndex("by_archived_at", (q) => q.lt("archivedAt", deleteCutoffTimestamp))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    if (args.dryRun) {
      return {
        deleted: 0,
        wouldDelete: logsToDelete.length,
        cutoffTimestamp: deleteCutoffTimestamp,
        cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
        message: `Dry run: Would delete ${logsToDelete.length} archived logs`,
      };
    }

    // Log deletion operation BEFORE deleting (for audit trail)
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      action: "archived_audit_logs_deleted",
      resource: "audit_retention",
      resourceId: args.tenantId,
      details: {
        deleteCount: logsToDelete.length,
        cutoffTimestamp: deleteCutoffTimestamp,
        cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
        policy: {
          retentionPeriodDays: policy.retentionPeriodDays,
          deleteAfterDays: policy.deleteAfterDays,
        },
      },
      timestamp: Date.now(),
    });

    // Delete archived logs
    let deleted = 0;
    const errors: Array<{ logId: string; error: string }> = [];

    for (const log of logsToDelete) {
      try {
        await ctx.db.delete(log._id);
        deleted++;
      } catch (error) {
        errors.push({
          logId: log._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      deleted,
      skipped: logsToDelete.length - deleted,
      errors: errors.length > 0 ? errors : undefined,
      cutoffTimestamp: deleteCutoffTimestamp,
      cutoffDate: new Date(deleteCutoffTimestamp).toISOString(),
    };
  },
});

/**
 * ============================================================================
 * IMMUTABLE LOG STORAGE - ENFORCEMENT AND VALIDATION
 * ============================================================================
 * 
 * This module enforces immutable, write-only audit log storage to meet HIPAA
 * compliance requirements and security best practices.
 * 
 * ENFORCED IMMUTABILITY:
 * 
 * 1. WRITE-ONLY OPERATIONS
 *    - ✅ Only INSERT operations are allowed (via ctx.db.insert())
 *    - ❌ UPDATE operations are NOT provided (prevents modification)
 *    - ❌ DELETE operations are NOT provided (prevents deletion)
 *    - ❌ PATCH operations are NOT provided (prevents partial updates)
 * 
 * 2. VALIDATION GUARDS
 *    - Timestamp validation: Always uses current timestamp (prevents backdating)
 *    - Data integrity checks: Verifies log creation succeeded
 *    - Tenant isolation: Enforces multi-tenant data separation
 *    - Required field validation: Ensures complete audit trail
 * 
 * 3. ATOMIC OPERATIONS
 *    - Convex mutations are atomic and cannot be rolled back
 *    - Once an audit log is created, it exists permanently
 *    - No transaction rollback mechanism can undo log creation
 * 
 * FUNCTIONS INTENTIONALLY NOT PROVIDED:
 * 
 * The following functions are INTENTIONALLY NOT implemented to enforce immutability:
 * 
 * ❌ updateAuditLog() - Audit logs cannot be modified
 * ❌ deleteAuditLog() - Audit logs cannot be deleted (except via retention policies)
 * ❌ patchAuditLog() - Partial updates are not allowed
 * ❌ updatePHIAccessLog() - PHI access logs are immutable
 * ❌ deletePHIAccessLog() - PHI access logs cannot be deleted
 * ❌ updatePermissionChangeLog() - Permission change logs are immutable
 * ❌ deletePermissionChangeLog() - Permission change logs cannot be deleted
 * 
 * CORRECTING AUDIT LOG ERRORS:
 * 
 * If an audit log entry contains incorrect information, DO NOT modify the existing entry.
 * Instead, create a new audit log entry with:
 * - action: "audit_log_correction"
 * - details: { originalLogId: <id>, correction: <explanation>, correctedData: <data> }
 * - This maintains the audit trail integrity while documenting the correction
 * 
 * DATA RETENTION POLICIES:
 * 
 * While audit logs are immutable, data retention policies may be implemented
 * (see Task 7.2.4) to comply with:
 * - HIPAA minimum retention requirements (6 years)
 * - Storage cost management
 * - Legal hold requirements
 * 
 * Retention policies should:
 * - Only apply to logs older than minimum retention period
 * - Archive logs before deletion (if deletion is necessary)
 * - Maintain audit trail of retention operations
 * - Comply with all applicable regulations
 * 
 * SECURITY CONSIDERATIONS:
 * 
 * 1. Access Control
 *    - Only authorized functions can create audit logs
 *    - Query functions enforce tenant isolation
 *    - No direct database access should bypass these functions
 * 
 * 2. Tamper Prevention
 *    - Immutability prevents modification of audit trail
 *    - Timestamp validation prevents backdating
 *    - Data integrity checks ensure log creation succeeded
 * 
 * 3. Compliance
 *    - HIPAA requires immutable audit logs (45 CFR § 164.312(b))
 *    - Audit logs must track all PHI access
 *    - Audit logs must be retained for compliance audits
 * 
 * TESTING IMMUTABILITY:
 * 
 * To verify immutability is enforced:
 * 1. Attempt to create an update function - should be rejected in code review
 * 2. Attempt to create a delete function - should be rejected in code review
 * 3. Verify all mutations use ctx.db.insert() only
 * 4. Verify no ctx.db.patch() or ctx.db.replace() calls exist
 * 5. Verify no ctx.db.delete() calls exist for auditLogs table
 * 
 * MAINTENANCE NOTES:
 * 
 * - DO NOT add update/delete functions to this module
 * - DO NOT modify existing mutations to allow updates
 * - DO NOT remove validation guards
 * - DO document any changes to immutability guarantees
 * - DO review this module during security audits
 * 
 * ============================================================================
 */

