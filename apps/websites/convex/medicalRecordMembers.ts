import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createHIPAAAuditLogger } from "./auditLogger";

/**
 * Medical Record Members API
 * 
 * Manages access to specific medical records (cards).
 * This replaces the mock careTeam data on card components.
 */

// Maximum members per medical record
const MAX_MEMBERS_PER_RECORD = 20;

/**
 * Validate member assignment
 */
async function validateMemberAssignment(
  ctx: any,
  medicalRecordId: Id<"medicalRecords">,
  userId: Id<"users">,
  addedBy: Id<"users">,
  tenantId: string
): Promise<{ record: any; user: any; addedByUser: any }> {
  // Validate medical record
  const record = await ctx.db.get(medicalRecordId);
  if (!record) {
    throw new Error("RECORD_NOT_FOUND: Medical record not found");
  }
  if (record.tenantId !== tenantId) {
    throw new Error("TENANT_MISMATCH: Medical record does not belong to the specified tenant");
  }

  // Validate user
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND: User not found");
  }
  if (user.tenantId !== tenantId) {
    throw new Error("TENANT_MISMATCH: User does not belong to the specified tenant");
  }

  // Don't add patients as members
  if (user.role === "patient") {
    throw new Error("INVALID_OPERATION: Cannot add patients as medical record members");
  }

  // Validate addedBy user
  const addedByUser = await ctx.db.get(addedBy);
  if (!addedByUser) {
    throw new Error("USER_NOT_FOUND: Adding user not found");
  }
  if (addedByUser.tenantId !== tenantId) {
    throw new Error("TENANT_MISMATCH: Adding user does not belong to the specified tenant");
  }

  return { record, user, addedByUser };
}

/**
 * Add a member to a medical record
 */
export const addMember = mutation({
  args: {
    medicalRecordId: v.id("medicalRecords"),
    userId: v.id("users"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    addedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate assignment
    const { record, user, addedByUser } = await validateMemberAssignment(
      ctx,
      args.medicalRecordId,
      args.userId,
      args.addedBy,
      args.tenantId
    );

    // Check rate limit
    const existingMembers = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record", (q) => q.eq("medicalRecordId", args.medicalRecordId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    if (existingMembers.length >= MAX_MEMBERS_PER_RECORD) {
      throw new Error(
        `RATE_LIMIT_EXCEEDED: Maximum members per record reached (${MAX_MEMBERS_PER_RECORD})`
      );
    }

    // Check if membership already exists
    const existing = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record_user", (q) =>
        q.eq("medicalRecordId", args.medicalRecordId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    const now = Date.now();
    const logger = createHIPAAAuditLogger(ctx);

    if (existing) {
      // Update existing membership
      const oldPermission = existing.permission;
      await ctx.db.patch(existing._id, {
        permission: args.permission,
        updatedAt: now,
      });

      await logger.logModification(
        args.tenantId,
        args.addedBy,
        "medical_record_member_updated",
        "medicalRecordMembers",
        existing._id,
        {
          medicalRecordId: args.medicalRecordId,
          userId: args.userId,
          oldPermission,
          newPermission: args.permission,
        }
      );

      return existing._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("medicalRecordMembers", {
      medicalRecordId: args.medicalRecordId,
      userId: args.userId,
      permission: args.permission,
      addedBy: args.addedBy,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Get patient for audit - query the patients table directly for proper typing
    const patientDoc = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("_id"), record.patientId))
      .first();

    // Audit log (PHI access grant)
    await logger.logModification(
      args.tenantId,
      args.addedBy,
      "medical_record_access_granted",
      "medicalRecords",
      args.medicalRecordId,
      {
        userId: args.userId,
        userEmail: user.email,
        permission: args.permission,
        recordType: record.recordType,
        patientName: patientDoc ? `${patientDoc.firstName} ${patientDoc.lastName}` : "Unknown",
        addedByEmail: addedByUser.email,
      }
    );

    return membershipId;
  },
});

/**
 * Remove a member from a medical record
 */
export const removeMember = mutation({
  args: {
    medicalRecordId: v.id("medicalRecords"),
    userId: v.id("users"),
    removedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the membership
    const membership = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record_user", (q) =>
        q.eq("medicalRecordId", args.medicalRecordId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND: Medical record membership not found");
    }

    // Validate removedBy user
    const removedByUser = await ctx.db.get(args.removedBy);
    if (!removedByUser || removedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: Removing user not authorized");
    }

    // Get details for audit
    const user = await ctx.db.get(args.userId);
    const record = await ctx.db.get(args.medicalRecordId);
    const patient = record ? await ctx.db.get(record.patientId) : null;

    // Delete the membership
    await ctx.db.delete(membership._id);

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.removedBy,
      "medical_record_access_revoked",
      "medicalRecords",
      args.medicalRecordId,
      {
        userId: args.userId,
        userEmail: user?.email,
        permission: membership.permission,
        recordType: record?.recordType,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
        removedByEmail: removedByUser.email,
      }
    );

    return { success: true };
  },
});

/**
 * Update a member's permission level
 */
export const updateMemberPermission = mutation({
  args: {
    medicalRecordId: v.id("medicalRecords"),
    userId: v.id("users"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    updatedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the membership
    const membership = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record_user", (q) =>
        q.eq("medicalRecordId", args.medicalRecordId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND: Medical record membership not found");
    }

    // Validate updatedBy user
    const updatedByUser = await ctx.db.get(args.updatedBy);
    if (!updatedByUser || updatedByUser.tenantId !== args.tenantId) {
      throw new Error("UNAUTHORIZED: Updating user not authorized");
    }

    // Don't update if permission is the same
    if (membership.permission === args.permission) {
      return membership._id;
    }

    const oldPermission = membership.permission;
    const now = Date.now();

    // Update permission
    await ctx.db.patch(membership._id, {
      permission: args.permission,
      updatedAt: now,
    });

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.updatedBy,
      "medical_record_permission_updated",
      "medicalRecordMembers",
      membership._id,
      {
        medicalRecordId: args.medicalRecordId,
        userId: args.userId,
        oldPermission,
        newPermission: args.permission,
      }
    );

    return membership._id;
  },
});

/**
 * Get all members for a medical record
 */
export const getMembers = query({
  args: {
    medicalRecordId: v.id("medicalRecords"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_record", (q) => q.eq("medicalRecordId", args.medicalRecordId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with user details
    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        const addedBy = await ctx.db.get(membership.addedBy);
        return {
          ...membership,
          user: user
            ? {
                _id: user._id,
                name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                email: user.email,
                role: user.role,
              }
            : null,
          addedBy: addedBy
            ? {
                _id: addedBy._id,
                name: addedBy.name || `${addedBy.firstName || ""} ${addedBy.lastName || ""}`.trim(),
                email: addedBy.email,
              }
            : null,
        };
      })
    );

    return members;
  },
});

/**
 * Get all medical records a user has been added to
 */
export const getRecordsForUser = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("medicalRecordMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with record and patient details
    const records = await Promise.all(
      memberships.map(async (membership) => {
        const record = await ctx.db.get(membership.medicalRecordId);
        const patient = record ? await ctx.db.get(record.patientId) : null;
        return {
          ...membership,
          record: record
            ? {
                _id: record._id,
                recordType: record.recordType,
                title: record.title,
                createdAt: record.createdAt,
              }
            : null,
          patient: patient
            ? {
                _id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
              }
            : null,
        };
      })
    );

    return records.filter((r) => r.record !== null);
  },
});

/**
 * Check if a user has access to a medical record
 */
export const checkAccess = query({
  args: {
    medicalRecordId: v.id("medicalRecords"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
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
      };
    }

    return {
      hasAccess: false,
      permission: null,
    };
  },
});

