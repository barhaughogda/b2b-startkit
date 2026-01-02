import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createHIPAAAuditLogger } from "./auditLogger";

/**
 * Care Team Resolution Service
 * 
 * Resolves care team membership from multiple sources:
 * 1. Explicit care team members (careTeamMembers table)
 * 2. Medical record members (medicalRecordMembers table)
 * 3. Appointment history providers
 * 
 * Care team is used to determine data visibility when sharing scope is "care_team"
 */

export interface CareTeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  careTeamRole?: string; // Role on the care team (e.g., "Primary Provider")
  source: "explicit" | "medical_record" | "appointment";
  addedAt?: number;
}

/**
 * Get the complete care team for a patient
 * Combines explicit members, medical record members, and appointment providers
 */
export const getCareTeamForPatient = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify patient exists and belongs to tenant
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    const careTeamMap = new Map<string, CareTeamMember>();

    // 1. Get explicit care team members
    const explicitMembers = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_active", (q) =>
        q.eq("patientId", args.patientId).eq("isActive", true)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const member of explicitMembers) {
      const user = await ctx.db.get(member.userId);
      if (user && user.tenantId === args.tenantId) {
        careTeamMap.set(user._id, {
          userId: user._id,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          role: user.role,
          careTeamRole: member.role,
          source: "explicit",
          addedAt: member.createdAt,
        });
      }
    }

    // 2. Get medical record members for this patient
    const medicalRecords = await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const record of medicalRecords) {
      const recordMembers = await ctx.db
        .query("medicalRecordMembers")
        .withIndex("by_record", (q) => q.eq("medicalRecordId", record._id))
        .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
        .collect();

      for (const member of recordMembers) {
        // Skip if already in care team from explicit source
        if (careTeamMap.has(member.userId)) continue;

        const user = await ctx.db.get(member.userId);
        if (user && user.tenantId === args.tenantId) {
          careTeamMap.set(user._id, {
            userId: user._id,
            name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            email: user.email,
            role: user.role,
            source: "medical_record",
            addedAt: member.createdAt,
          });
        }
      }
    }

    // 3. Get users from appointment history (via userId field)
    // Performance optimization: Limit to recent appointments (last 2 years) to avoid processing too many
    const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.gte(q.field("createdAt"), twoYearsAgo)
        )
      )
      .collect();

    // Performance optimization: Use Set to track unique user IDs before fetching
    const uniqueUserIds = new Set<Id<"users">>();
    for (const appointment of appointments) {
      if (appointment.userId && !careTeamMap.has(appointment.userId)) {
        uniqueUserIds.add(appointment.userId);
      }
    }

    // Batch fetch users for better performance
    for (const userId of uniqueUserIds) {
      const user = await ctx.db.get(userId);
      if (user && user.tenantId === args.tenantId && user.role !== "patient") {
        // Find the earliest appointment for this user
        const userAppointments = appointments.filter(a => a.userId === userId);
        const earliestAppointment = userAppointments.reduce((earliest, current) =>
          current.createdAt < earliest.createdAt ? current : earliest
        );

        careTeamMap.set(user._id, {
          userId: user._id,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          role: user.role,
          source: "appointment",
          addedAt: earliestAppointment.createdAt,
        });
      }
    }

    // Convert map to array and sort by source priority (explicit first)
    const careTeam = Array.from(careTeamMap.values()).sort((a, b) => {
      const sourcePriority = { explicit: 0, medical_record: 1, appointment: 2 };
      return sourcePriority[a.source] - sourcePriority[b.source];
    });

    return {
      patientId: args.patientId,
      tenantId: args.tenantId,
      members: careTeam,
      totalCount: careTeam.length,
    };
  },
});

/**
 * Check if a user is in a patient's care team
 */
export const isUserInCareTeam = query({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check explicit care team membership
    const explicitMembership = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", args.userId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (explicitMembership) {
      return {
        isMember: true,
        source: "explicit" as const,
        careTeamRole: explicitMembership.role,
      };
    }

    // 2. Check medical record membership
    const medicalRecords = await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const record of medicalRecords) {
      const recordMembership = await ctx.db
        .query("medicalRecordMembers")
        .withIndex("by_record_user", (q) =>
          q.eq("medicalRecordId", record._id).eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
        .first();

      if (recordMembership) {
        return {
          isMember: true,
          source: "medical_record" as const,
          medicalRecordId: record._id,
        };
      }
    }

    // 3. Check appointment history (via userId field)
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (appointment) {
      return {
        isMember: true,
        source: "appointment" as const,
        appointmentId: appointment._id,
      };
    }

    return {
      isMember: false,
      source: null,
    };
  },
});

/**
 * Add an explicit care team member
 */
export const addCareTeamMember = mutation({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"),
    role: v.string(), // e.g., "Primary Provider", "Specialist", "Nurse", "Care Coordinator"
    addedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate patient exists and belongs to tenant
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND: User not found");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: User does not belong to the specified tenant");
    }

    // Don't add patients to care teams
    if (user.role === "patient") {
      throw new Error("INVALID_OPERATION: Cannot add patients to care team");
    }

    // Validate addedBy user exists and belongs to tenant
    const addedByUser = await ctx.db.get(args.addedBy);
    if (!addedByUser || addedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: Adding user not authorized");
    }

    // Check if membership already exists
    const existing = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    const now = Date.now();
    const logger = createHIPAAAuditLogger(ctx);

    if (existing) {
      // Reactivate if inactive, or update role
      await ctx.db.patch(existing._id, {
        role: args.role,
        isActive: true,
        updatedAt: now,
      });

      await logger.logModification(
        args.tenantId,
        args.addedBy,
        "care_team_member_updated",
        "careTeamMembers",
        existing._id,
        {
          patientId: args.patientId,
          userId: args.userId,
          newRole: args.role,
          wasReactivated: !existing.isActive,
        }
      );

      return existing._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("careTeamMembers", {
      patientId: args.patientId,
      userId: args.userId,
      role: args.role,
      addedBy: args.addedBy,
      isActive: true,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log (PHI access grant)
    await logger.logModification(
      args.tenantId,
      args.addedBy,
      "care_team_member_added",
      "patients",
      args.patientId,
      {
        userId: args.userId,
        userEmail: user.email,
        role: args.role,
        patientName: `${patient.firstName} ${patient.lastName}`,
      }
    );

    return membershipId;
  },
});

/**
 * Remove a care team member (soft delete)
 */
export const removeCareTeamMember = mutation({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"),
    removedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the membership
    const membership = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", args.userId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND: Care team membership not found");
    }

    // Validate removedBy user
    const removedByUser = await ctx.db.get(args.removedBy);
    if (!removedByUser || removedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: Removing user not authorized");
    }

    // Get user and patient for audit
    const user = await ctx.db.get(args.userId);
    const patient = await ctx.db.get(args.patientId);

    // Soft delete (set isActive to false)
    const now = Date.now();
    await ctx.db.patch(membership._id, {
      isActive: false,
      updatedAt: now,
    });

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.removedBy,
      "care_team_member_removed",
      "patients",
      args.patientId,
      {
        userId: args.userId,
        userEmail: user?.email,
        role: membership.role,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
      }
    );

    return { success: true };
  },
});

/**
 * Update a care team member's role
 */
export const updateCareTeamMemberRole = mutation({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"),
    role: v.string(),
    updatedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the membership
    const membership = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", args.userId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND: Care team membership not found");
    }

    // Validate updatedBy user
    const updatedByUser = await ctx.db.get(args.updatedBy);
    if (!updatedByUser || updatedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: Updating user not authorized");
    }

    const oldRole = membership.role;
    const now = Date.now();

    // Update role
    await ctx.db.patch(membership._id, {
      role: args.role,
      updatedAt: now,
    });

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.updatedBy,
      "care_team_role_updated",
      "careTeamMembers",
      membership._id,
      {
        patientId: args.patientId,
        userId: args.userId,
        oldRole,
        newRole: args.role,
      }
    );

    return membership._id;
  },
});

// ============================================================================
// PRIMARY PROVIDER MANAGEMENT
// ============================================================================

/**
 * Valid reasons for primary provider changes
 */
export const PRIMARY_PROVIDER_CHANGE_REASONS = [
  "initial_assignment",
  "patient_request",
  "patient_self_selected", // Patient selected during intake/registration
  "provider_leaving",
  "insurance_change",
  "internal_transfer",
  "coverage_assignment",
  "other",
] as const;

export type PrimaryProviderChangeReason = typeof PRIMARY_PROVIDER_CHANGE_REASONS[number];

/**
 * Get the primary provider for a patient
 */
export const getPrimaryProvider = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    // If no primary provider assigned, return null
    if (!patient.primaryProviderId) {
      return {
        patientId: args.patientId,
        primaryProvider: null,
        hasProvider: false,
      };
    }

    // Get provider details
    const provider = await ctx.db.get(patient.primaryProviderId);
    if (!provider) {
      // Primary provider was deleted or doesn't exist
      return {
        patientId: args.patientId,
        primaryProvider: null,
        hasProvider: false,
        error: "PRIMARY_PROVIDER_NOT_FOUND",
      };
    }

    // Verify provider belongs to same tenant
    if (provider.tenantId !== args.tenantId) {
      return {
        patientId: args.patientId,
        primaryProvider: null,
        hasProvider: false,
        error: "TENANT_MISMATCH",
      };
    }

    return {
      patientId: args.patientId,
      primaryProvider: {
        _id: provider._id,
        name: provider.name || `${provider.firstName || ""} ${provider.lastName || ""}`.trim(),
        email: provider.email,
        role: provider.role,
        phone: provider.phone,
      },
      hasProvider: true,
    };
  },
});

/**
 * Set or change the primary provider for a patient
 * Creates audit trail in primaryProviderHistory table
 */
export const setPrimaryProvider = mutation({
  args: {
    patientId: v.id("patients"),
    newProviderId: v.id("users"),
    reason: v.string(), // One of PRIMARY_PROVIDER_CHANGE_REASONS
    notes: v.optional(v.string()),
    changedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    // Validate new provider
    const newProvider = await ctx.db.get(args.newProviderId);
    if (!newProvider) {
      throw new Error("PROVIDER_NOT_FOUND: New provider not found");
    }
    if (newProvider.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Provider does not belong to the specified tenant");
    }
    if (newProvider.role === "patient") {
      throw new Error("INVALID_PROVIDER: Cannot assign a patient as primary provider");
    }

    // Validate changedBy user
    const changedByUser = await ctx.db.get(args.changedBy);
    if (!changedByUser || changedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: User not authorized to make this change");
    }

    // Validate reason
    if (!PRIMARY_PROVIDER_CHANGE_REASONS.includes(args.reason as PrimaryProviderChangeReason)) {
      throw new Error(`INVALID_REASON: Reason must be one of: ${PRIMARY_PROVIDER_CHANGE_REASONS.join(", ")}`);
    }

    const now = Date.now();
    const previousProviderId = patient.primaryProviderId;

    // Don't update if same provider
    if (previousProviderId === args.newProviderId) {
      return {
        success: true,
        changed: false,
        message: "Provider is already the primary provider",
        patientId: args.patientId,
        providerId: args.newProviderId,
      };
    }

    // Create history record
    await ctx.db.insert("primaryProviderHistory", {
      patientId: args.patientId,
      previousProviderId: previousProviderId || undefined,
      newProviderId: args.newProviderId,
      reason: args.reason,
      notes: args.notes,
      changedBy: args.changedBy,
      tenantId: args.tenantId,
      createdAt: now,
    });

    // Update patient with new primary provider
    await ctx.db.patch(args.patientId, {
      primaryProviderId: args.newProviderId,
      updatedAt: now,
    });

    // Also add the new provider to the care team if not already a member
    const existingMembership = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", args.newProviderId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!existingMembership) {
      // Add as care team member with "Primary Provider" role
      await ctx.db.insert("careTeamMembers", {
        patientId: args.patientId,
        userId: args.newProviderId,
        role: "Primary Provider",
        addedBy: args.changedBy,
        isActive: true,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });
    } else if (!existingMembership.isActive) {
      // Reactivate if inactive
      await ctx.db.patch(existingMembership._id, {
        role: "Primary Provider",
        isActive: true,
        updatedAt: now,
      });
    } else if (existingMembership.role !== "Primary Provider") {
      // Update role to Primary Provider
      await ctx.db.patch(existingMembership._id, {
        role: "Primary Provider",
        updatedAt: now,
      });
    }

    // If there was a previous provider, update their care team role
    if (previousProviderId) {
      const previousMembership = await ctx.db
        .query("careTeamMembers")
        .withIndex("by_patient_user", (q) =>
          q.eq("patientId", args.patientId).eq("userId", previousProviderId)
        )
        .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
        .first();

      if (previousMembership && previousMembership.role === "Primary Provider") {
        // Demote to regular care team member
        await ctx.db.patch(previousMembership._id, {
          role: "Former Primary Provider",
          updatedAt: now,
        });
      }
    }

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.changedBy,
      "primary_provider_changed",
      "patients",
      args.patientId,
      {
        previousProviderId,
        newProviderId: args.newProviderId,
        newProviderEmail: newProvider.email,
        reason: args.reason,
        notes: args.notes,
        patientName: `${patient.firstName} ${patient.lastName}`,
      }
    );

    return {
      success: true,
      changed: true,
      patientId: args.patientId,
      previousProviderId,
      newProviderId: args.newProviderId,
    };
  },
});

/**
 * Remove primary provider from a patient (unassign)
 */
export const removePrimaryProvider = mutation({
  args: {
    patientId: v.id("patients"),
    reason: v.string(),
    notes: v.optional(v.string()),
    changedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    // Check if there's a primary provider to remove
    if (!patient.primaryProviderId) {
      return {
        success: true,
        changed: false,
        message: "No primary provider to remove",
      };
    }

    // Validate changedBy user
    const changedByUser = await ctx.db.get(args.changedBy);
    if (!changedByUser || changedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: User not authorized to make this change");
    }

    const now = Date.now();
    const previousProviderId = patient.primaryProviderId;

    // Create history record (newProviderId will be a placeholder since we're removing)
    // We'll use the changedBy as a marker that this was a removal
    await ctx.db.insert("primaryProviderHistory", {
      patientId: args.patientId,
      previousProviderId: previousProviderId,
      newProviderId: args.changedBy, // Use changedBy as marker for removal action
      reason: `removed_${args.reason}`,
      notes: args.notes ? `[REMOVAL] ${args.notes}` : "[REMOVAL] Primary provider removed",
      changedBy: args.changedBy,
      tenantId: args.tenantId,
      createdAt: now,
    });

    // Remove primary provider from patient
    await ctx.db.patch(args.patientId, {
      primaryProviderId: undefined,
      updatedAt: now,
    });

    // Update previous provider's care team role
    const previousMembership = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_patient_user", (q) =>
        q.eq("patientId", args.patientId).eq("userId", previousProviderId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (previousMembership && previousMembership.role === "Primary Provider") {
      await ctx.db.patch(previousMembership._id, {
        role: "Former Primary Provider",
        updatedAt: now,
      });
    }

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.changedBy,
      "primary_provider_removed",
      "patients",
      args.patientId,
      {
        previousProviderId,
        reason: args.reason,
        notes: args.notes,
        patientName: `${patient.firstName} ${patient.lastName}`,
      }
    );

    return {
      success: true,
      changed: true,
      previousProviderId,
    };
  },
});

/**
 * Get primary provider change history for a patient
 */
export const getPrimaryProviderHistory = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("PATIENT_NOT_FOUND: Patient not found");
    }
    if (patient.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Patient does not belong to the specified tenant");
    }

    // Get history records
    const limit = args.limit || 50;
    const historyRecords = await ctx.db
      .query("primaryProviderHistory")
      .withIndex("by_patient_created", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .order("desc")
      .take(limit);

    // Enrich with user details
    const enrichedHistory = await Promise.all(
      historyRecords.map(async (record) => {
        const [previousProvider, newProvider, changedByUser] = await Promise.all([
          record.previousProviderId ? ctx.db.get(record.previousProviderId) : null,
          ctx.db.get(record.newProviderId),
          ctx.db.get(record.changedBy),
        ]);

        return {
          _id: record._id,
          createdAt: record.createdAt,
          reason: record.reason,
          notes: record.notes,
          previousProvider: previousProvider
            ? {
                _id: previousProvider._id,
                name: previousProvider.name || `${previousProvider.firstName || ""} ${previousProvider.lastName || ""}`.trim(),
                email: previousProvider.email,
              }
            : null,
          newProvider: newProvider
            ? {
                _id: newProvider._id,
                name: newProvider.name || `${newProvider.firstName || ""} ${newProvider.lastName || ""}`.trim(),
                email: newProvider.email,
              }
            : null,
          changedBy: changedByUser
            ? {
                _id: changedByUser._id,
                name: changedByUser.name || `${changedByUser.firstName || ""} ${changedByUser.lastName || ""}`.trim(),
                email: changedByUser.email,
              }
            : null,
        };
      })
    );

    return {
      patientId: args.patientId,
      history: enrichedHistory,
      totalCount: enrichedHistory.length,
    };
  },
});

/**
 * Get all patients where a user is the primary provider
 */
export const getPatientsByPrimaryProvider = query({
  args: {
    providerId: v.id("users"),
    tenantId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate provider
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("PROVIDER_NOT_FOUND: Provider not found");
    }
    if (provider.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Provider does not belong to the specified tenant");
    }

    // Get patients where this user is the primary provider
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_tenant_primary_provider", (q) =>
        q.eq("tenantId", args.tenantId).eq("primaryProviderId", args.providerId)
      )
      .collect();

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedPatients = patients.slice(offset, offset + limit);

    return {
      providerId: args.providerId,
      patients: paginatedPatients.map((p) => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
      })),
      totalCount: patients.length,
      hasMore: offset + limit < patients.length,
    };
  },
});

// ============================================================================
// CARE TEAM QUERIES
// ============================================================================

/**
 * Get all patients a user is on the care team for
 */
export const getPatientsForCareTeamMember = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const patientIds = new Set<string>();
    const patientDetails: Array<{
      patientId: string;
      source: "explicit" | "medical_record" | "appointment";
      careTeamRole?: string;
    }> = [];

    // 1. Get explicit care team memberships
    const explicitMemberships = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const membership of explicitMemberships) {
      if (!patientIds.has(membership.patientId)) {
        patientIds.add(membership.patientId);
        patientDetails.push({
          patientId: membership.patientId,
          source: "explicit",
          careTeamRole: membership.role,
        });
      }
    }

    // 2. Get patients from medical record memberships
    const recordMemberships = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const membership of recordMemberships) {
      const record = await ctx.db.get(membership.medicalRecordId);
      if (record && !patientIds.has(record.patientId)) {
        patientIds.add(record.patientId);
        patientDetails.push({
          patientId: record.patientId,
          source: "medical_record",
        });
      }
    }

    // 3. Get patients from appointments (via userId field)
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const appointment of appointments) {
      if (!patientIds.has(appointment.patientId)) {
        patientIds.add(appointment.patientId);
        patientDetails.push({
          patientId: appointment.patientId,
          source: "appointment",
        });
      }
    }

    // Enrich with patient details
    const enrichedPatients = await Promise.all(
      patientDetails.map(async (detail) => {
        const patient = await ctx.db.get(detail.patientId as Id<"patients">);
        return {
          ...detail,
          patient: patient
            ? {
                _id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email,
              }
            : null,
        };
      })
    );

    return {
      userId: args.userId,
      tenantId: args.tenantId,
      patients: enrichedPatients.filter((p) => p.patient !== null),
      totalCount: enrichedPatients.filter((p) => p.patient !== null).length,
    };
  },
});

