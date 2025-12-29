import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Data Access Checking Service
 * 
 * Combines sharing settings with care team membership to determine
 * if a user can access specific data. This implements the user-centric
 * sharing model where data visibility is controlled by user settings,
 * not role permissions.
 * 
 * Access checking flow:
 * 1. Is user the owner? → Full access
 * 2. Is there an explicit share? → Use that permission
 * 3. Check owner's sharing settings:
 *    - "company" → All company staff can view
 *    - "care_team" → Check if user is in care team
 *    - "private" → No access
 */

type Permission = "view" | "edit" | null;
type AccessSource = "owner" | "explicit_share" | "care_team" | "company" | null;

interface AccessCheckResult {
  hasAccess: boolean;
  permission: Permission;
  source: AccessSource;
  reason?: string;
}

/**
 * Check if a user can access a specific patient's data
 */
export const canAccessPatient = query({
  args: {
    userId: v.id("users"),
    patientId: v.id("patients"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<AccessCheckResult> => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { hasAccess: false, permission: null, source: null, reason: "User not found" };
    }
    if (user.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // Validate patient exists and belongs to tenant
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      return { hasAccess: false, permission: null, source: null, reason: "Patient not found" };
    }
    if (patient.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // 1. Check if user has explicit patient share
    const explicitShare = await ctx.db
      .query("patientShares")
      .withIndex("by_patient_shared_with", (q) =>
        q.eq("patientId", args.patientId).eq("sharedWithUserId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (explicitShare) {
      return {
        hasAccess: true,
        permission: explicitShare.permission,
        source: "explicit_share",
      };
    }

    // 2. Check if user is the owner (has patient shares they created)
    const ownedShare = await ctx.db
      .query("patientShares")
      .withIndex("by_owner_patient", (q) =>
        q.eq("ownerUserId", args.userId).eq("patientId", args.patientId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (ownedShare) {
      return {
        hasAccess: true,
        permission: "edit",
        source: "owner",
      };
    }

    // 3. Check sharing settings from the PRIMARY OWNER only
    // The primary owner is the one who created the first share (oldest createdAt)
    // This ensures we only check the actual owner's settings, not all users who have shared
    const allShares = await ctx.db
      .query("patientShares")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    if (allShares.length > 0) {
      // Find the primary owner: the one with the oldest share (first to create a share)
      const primaryOwnerShare = allShares.reduce((oldest, current) =>
        current.createdAt < oldest.createdAt ? current : oldest
      );
      const primaryOwnerId = primaryOwnerShare.ownerUserId;

      // Check only the primary owner's sharing settings
      const ownerSettings = await ctx.db
        .query("userSharingSettings")
        .withIndex("by_user_tenant", (q) =>
          q.eq("userId", primaryOwnerId).eq("tenantId", args.tenantId)
        )
        .first();

      const defaultSharing = ownerSettings?.patientsDefaultSharing || "private";

      // Check company sharing
      if (defaultSharing === "company") {
        return {
          hasAccess: true,
          permission: "view",
          source: "company",
        };
      }

      // Check care team sharing
      if (defaultSharing === "care_team") {
        // Check if user is in care team
        const isCareTeam = await checkCareTeamMembership(ctx, args.patientId, args.userId, args.tenantId);
        if (isCareTeam) {
          return {
            hasAccess: true,
            permission: "view",
            source: "care_team",
          };
        }
      }
    }

    // 4. Final check: Is user in care team for this patient (regardless of sharing settings)?
    // This handles the case where a user is added to a medical record but no one has shared the patient
    const isCareTeam = await checkCareTeamMembership(ctx, args.patientId, args.userId, args.tenantId);
    if (isCareTeam) {
      // Care team members always have at least view access
      return {
        hasAccess: true,
        permission: "view",
        source: "care_team",
        reason: "User is in care team",
      };
    }

    return {
      hasAccess: false,
      permission: null,
      source: null,
      reason: "No access granted",
    };
  },
});

/**
 * Check if a user can access a specific medical record
 */
export const canAccessMedicalRecord = query({
  args: {
    userId: v.id("users"),
    medicalRecordId: v.id("medicalRecords"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<AccessCheckResult> => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { hasAccess: false, permission: null, source: null, reason: "User not found" };
    }
    if (user.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // Validate medical record exists and belongs to tenant
    const record = await ctx.db.get(args.medicalRecordId);
    if (!record) {
      return { hasAccess: false, permission: null, source: null, reason: "Record not found" };
    }
    if (record.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // 1. Check if user is explicitly added as a member of this record
    const membership = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record_user", (q) =>
        q.eq("medicalRecordId", args.medicalRecordId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (membership) {
      return {
        hasAccess: true,
        permission: membership.permission,
        source: "explicit_share",
      };
    }

    // 3. Check patient-level access (which inherits to records)
    const patientAccess = await checkPatientAccess(ctx, args.userId, record.patientId, args.tenantId);
    if (patientAccess.hasAccess) {
      return {
        hasAccess: true,
        permission: patientAccess.permission,
        source: patientAccess.source,
        reason: "Inherited from patient access",
      };
    }

    return {
      hasAccess: false,
      permission: null,
      source: null,
      reason: "No access to this record",
    };
  },
});

/**
 * Check if a user can access a specific message
 */
export const canAccessMessage = query({
  args: {
    userId: v.id("users"),
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<AccessCheckResult> => {
    // Validate user exists and belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { hasAccess: false, permission: null, source: null, reason: "User not found" };
    }
    if (user.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // Validate message exists and belongs to tenant
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return { hasAccess: false, permission: null, source: null, reason: "Message not found" };
    }
    if (message.tenantId !== args.tenantId) {
      return { hasAccess: false, permission: null, source: null, reason: "Tenant mismatch" };
    }

    // 1. Check if user is the sender or recipient
    if (message.fromUserId === args.userId || message.toUserId === args.userId) {
      return {
        hasAccess: true,
        permission: "edit",
        source: "owner",
      };
    }

    // 2. Check if user has a message assignment (delegated to respond)
    const assignment = await ctx.db
      .query("messageAssignments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("assignedTo"), args.userId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "in_progress")
          )
        )
      )
      .first();

    if (assignment) {
      return {
        hasAccess: true,
        permission: "edit", // Assignee can respond
        source: "explicit_share",
        reason: "Assigned to respond",
      };
    }

    // 3. Check sharing settings from the recipient
    // Skip if toUserId is not set (legacy messages)
    if (!message.toUserId) {
      return {
        hasAccess: false,
        permission: null,
        source: null,
        reason: "No access to this message",
      };
    }

    // TypeScript guard: toUserId is guaranteed to exist after the check above
    const toUserId = message.toUserId!;
    
    const recipientSettings = await ctx.db
      .query("userSharingSettings")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", toUserId).eq("tenantId", args.tenantId)
      )
      .first();

    const defaultSharing = recipientSettings?.messagesDefaultSharing || "private";

    // Messages are private by default per user requirements
    if (defaultSharing === "company") {
      return {
        hasAccess: true,
        permission: "view",
        source: "company",
      };
    }

    // Note: Messages don't have a direct patientId, so care_team sharing for messages
    // only applies if the recipient has set their sharing to care_team and the user
    // is checking access. In practice, messages are either private or shared company-wide.

    return {
      hasAccess: false,
      permission: null,
      source: null,
      reason: "No access to this message",
    };
  },
});

/**
 * Helper: Check care team membership
 */
async function checkCareTeamMembership(
  ctx: any,
  patientId: Id<"patients">,
  userId: Id<"users">,
  tenantId: string
): Promise<boolean> {
  // 1. Check explicit care team
  const explicitMembership = await ctx.db
    .query("careTeamMembers")
    .withIndex("by_patient_user", (q: any) =>
      q.eq("patientId", patientId).eq("userId", userId)
    )
    .filter((q: any) =>
      q.and(
        q.eq(q.field("tenantId"), tenantId),
        q.eq(q.field("isActive"), true)
      )
    )
    .first();

  if (explicitMembership) return true;

  // 2. Check medical record membership
  const records = await ctx.db
    .query("medicalRecords")
    .withIndex("by_patient", (q: any) => q.eq("patientId", patientId))
    .filter((q: any) => q.eq(q.field("tenantId"), tenantId))
    .collect();

  for (const record of records) {
    const recordMembership = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record_user", (q: any) =>
        q.eq("medicalRecordId", record._id).eq("userId", userId)
      )
      .filter((q: any) => q.eq(q.field("tenantId"), tenantId))
      .first();

    if (recordMembership) return true;
  }

  // 3. Check appointment history (via userId field)
  const appointment = await ctx.db
    .query("appointments")
    .withIndex("by_patient", (q: any) => q.eq("patientId", patientId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("tenantId"), tenantId),
        q.eq(q.field("userId"), userId)
      )
    )
    .first();

  return !!appointment;
}

/**
 * Helper: Check patient access (internal use)
 */
async function checkPatientAccess(
  ctx: any,
  userId: Id<"users">,
  patientId: Id<"patients">,
  tenantId: string
): Promise<AccessCheckResult> {
  // Check explicit share
  const explicitShare = await ctx.db
    .query("patientShares")
    .withIndex("by_patient_shared_with", (q: any) =>
      q.eq("patientId", patientId).eq("sharedWithUserId", userId)
    )
    .filter((q: any) => q.eq(q.field("tenantId"), tenantId))
    .first();

  if (explicitShare) {
    return {
      hasAccess: true,
      permission: explicitShare.permission,
      source: "explicit_share",
    };
  }

  // Check care team membership
  const isCareTeam = await checkCareTeamMembership(ctx, patientId, userId, tenantId);
  if (isCareTeam) {
    return {
      hasAccess: true,
      permission: "view",
      source: "care_team",
    };
  }

  return {
    hasAccess: false,
    permission: null,
    source: null,
  };
}

/**
 * Batch check: Get accessible patients for a user
 */
export const getAccessiblePatients = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const accessiblePatients: Array<{
      patientId: string;
      permission: Permission;
      source: AccessSource;
    }> = [];

    // 1. Get patients from explicit shares
    const explicitShares = await ctx.db
      .query("patientShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const share of explicitShares) {
      accessiblePatients.push({
        patientId: share.patientId,
        permission: share.permission,
        source: "explicit_share",
      });
    }

    // 2. Get patients from care team membership
    // Explicit care team
    const careTeamMemberships = await ctx.db
      .query("careTeamMembers")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const membership of careTeamMemberships) {
      if (!accessiblePatients.find((p) => p.patientId === membership.patientId)) {
        accessiblePatients.push({
          patientId: membership.patientId,
          permission: "view",
          source: "care_team",
        });
      }
    }

    // 3. Get patients from medical record memberships
    const recordMemberships = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const membership of recordMemberships) {
      const record = await ctx.db.get(membership.medicalRecordId);
      if (record && !accessiblePatients.find((p) => p.patientId === record.patientId)) {
        accessiblePatients.push({
          patientId: record.patientId,
          permission: membership.permission,
          source: "care_team",
        });
      }
    }

    // 4. Get patients from appointments (via userId field)
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    for (const appointment of appointments) {
      if (!accessiblePatients.find((p) => p.patientId === appointment.patientId)) {
        accessiblePatients.push({
          patientId: appointment.patientId,
          permission: "view",
          source: "care_team",
        });
      }
    }

    // Apply limit if specified
    const limited = args.limit
      ? accessiblePatients.slice(0, args.limit)
      : accessiblePatients;

    // Enrich with patient details
    const enriched = await Promise.all(
      limited.map(async (access) => {
        const patient = await ctx.db.get(access.patientId as Id<"patients">);
        return {
          ...access,
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
      patients: enriched.filter((p) => p.patient !== null),
      totalCount: accessiblePatients.length,
    };
  },
});

