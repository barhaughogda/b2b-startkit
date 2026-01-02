import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createHIPAAAuditLogger } from "./auditLogger";
import { validatePatientShareUsers } from "./utils/shareValidation";

// Maximum number of patient shares per user
const MAX_SHARES_PER_USER = 100;

/**
 * Check rate limit for patient shares
 */
async function checkShareRateLimit(
  ctx: any,
  ownerUserId: Id<"users">,
  tenantId: string
): Promise<void> {
  const existingShares = await ctx.db
    .query("patientShares")
    .withIndex("by_owner", (q: any) => q.eq("ownerUserId", ownerUserId))
    .filter((q: any) => q.eq(q.field("tenantId"), tenantId))
    .collect();

  if (existingShares.length >= MAX_SHARES_PER_USER) {
    throw new Error(
      `RATE_LIMIT_EXCEEDED: Maximum patient shares limit reached (${MAX_SHARES_PER_USER}). Please revoke some shares before adding new ones.`
    );
  }
}

/**
 * Share patient access with another user
 */
export const sharePatient = mutation({
  args: {
    ownerUserId: v.id("users"),
    patientId: v.id("patients"),
    sharedWithUserId: v.id("users"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate users and tenant isolation
    const validationResult = await validatePatientShareUsers(
      ctx,
      args.ownerUserId,
      args.sharedWithUserId,
      args.patientId,
      args.tenantId
    );
    const { owner, sharedWith, resource: patient } = validationResult;

    // Check rate limit
    await checkShareRateLimit(ctx, args.ownerUserId, args.tenantId);

    // Check if share already exists
    const existingShare = await ctx.db
      .query("patientShares")
      .withIndex("by_patient_shared_with", (q) =>
        q.eq("patientId", args.patientId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    const logger = createHIPAAAuditLogger(ctx);
    const now = Date.now();

    if (existingShare) {
      // Update existing share
      const oldPermission = existingShare.permission;
      await ctx.db.patch(existingShare._id, {
        permission: args.permission,
        updatedAt: now,
      });

      // Audit log: permission updated
      await logger.logModification(
        args.tenantId,
        args.ownerUserId,
        "patient_share_permission_updated",
        "patientShares",
        existingShare._id,
        {
          ownerUserId: args.ownerUserId,
          patientId: args.patientId,
          sharedWithUserId: args.sharedWithUserId,
          oldPermission,
          newPermission: args.permission,
        }
      );

      return existingShare._id;
    }

    // Create new share
    const shareId = await ctx.db.insert("patientShares", {
      ownerUserId: args.ownerUserId,
      patientId: args.patientId,
      sharedWithUserId: args.sharedWithUserId,
      permission: args.permission,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log: patient shared (PHI access grant)
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "patient_access_granted",
      "patients",
      args.patientId,
      {
        ownerUserId: args.ownerUserId,
        sharedWithUserId: args.sharedWithUserId,
        permission: args.permission,
        ownerEmail: owner.email,
        sharedWithEmail: sharedWith.email,
        patientName: `${patient.firstName} ${patient.lastName}`,
      }
    );

    return shareId;
  },
});

/**
 * Revoke patient share access
 */
export const revokePatientShare = mutation({
  args: {
    ownerUserId: v.id("users"),
    patientId: v.id("patients"),
    sharedWithUserId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate owner exists and belongs to tenant
    const owner = await ctx.db.get(args.ownerUserId);
    if (!owner) {
      throw new Error("USER_NOT_FOUND: Owner user not found");
    }
    if (owner.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Owner does not belong to the specified tenant");
    }

    // Find the share
    const share = await ctx.db
      .query("patientShares")
      .withIndex("by_patient_shared_with", (q) =>
        q.eq("patientId", args.patientId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!share) {
      throw new Error("SHARE_NOT_FOUND: Patient share not found");
    }

    // Verify the requester is the owner of the share
    if (share.ownerUserId !== args.ownerUserId) {
      throw new Error("UNAUTHORIZED: Only the owner can revoke patient access");
    }

    // Get details for audit log
    const sharedWith = await ctx.db.get(args.sharedWithUserId);
    const patient = await ctx.db.get(args.patientId);

    // Delete the share
    await ctx.db.delete(share._id);

    // Audit log: patient share revoked
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "patient_access_revoked",
      "patients",
      args.patientId,
      {
        ownerUserId: args.ownerUserId,
        sharedWithUserId: args.sharedWithUserId,
        permission: share.permission,
        ownerEmail: owner.email,
        sharedWithEmail: sharedWith?.email,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
      }
    );

    return { success: true };
  },
});

/**
 * Update patient share permission
 */
export const updatePatientSharePermission = mutation({
  args: {
    ownerUserId: v.id("users"),
    patientId: v.id("patients"),
    sharedWithUserId: v.id("users"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate owner exists and belongs to tenant
    const owner = await ctx.db.get(args.ownerUserId);
    if (!owner) {
      throw new Error("USER_NOT_FOUND: Owner user not found");
    }
    if (owner.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Owner does not belong to the specified tenant");
    }

    // Find the share
    const share = await ctx.db
      .query("patientShares")
      .withIndex("by_patient_shared_with", (q) =>
        q.eq("patientId", args.patientId).eq("sharedWithUserId", args.sharedWithUserId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!share) {
      throw new Error("SHARE_NOT_FOUND: Patient share not found");
    }

    // Verify the requester is the owner of the share
    if (share.ownerUserId !== args.ownerUserId) {
      throw new Error("UNAUTHORIZED: Only the owner can update patient access");
    }

    // Don't update if permission is the same
    if (share.permission === args.permission) {
      return share._id;
    }

    // Get details for audit log
    const sharedWith = await ctx.db.get(args.sharedWithUserId);
    const patient = await ctx.db.get(args.patientId);

    // Update permission
    const oldPermission = share.permission;
    const now = Date.now();
    await ctx.db.patch(share._id, {
      permission: args.permission,
      updatedAt: now,
    });

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logModification(
      args.tenantId,
      args.ownerUserId,
      "patient_share_permission_updated",
      "patientShares",
      share._id,
      {
        patientId: args.patientId,
        sharedWithUserId: args.sharedWithUserId,
        oldPermission,
        newPermission: args.permission,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
        sharedWithEmail: sharedWith?.email,
      }
    );

    return share._id;
  },
});

/**
 * Get patients shared with the current user
 */
export const getSharedPatients = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("patientShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", args.userId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with patient and owner details
    const sharedPatients = await Promise.all(
      shares.map(async (share) => {
        const patient = await ctx.db.get(share.patientId);
        const owner = await ctx.db.get(share.ownerUserId);
        return {
          ...share,
          patient: patient
            ? {
                _id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email,
              }
            : null,
          owner: owner
            ? {
                _id: owner._id,
                name: owner.name,
                email: owner.email,
              }
            : null,
        };
      })
    );

    return sharedPatients;
  },
});

/**
 * Get users who have access to a specific patient
 */
export const getPatientShares = query({
  args: {
    ownerUserId: v.id("users"),
    patientId: v.id("patients"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("patientShares")
      .withIndex("by_owner_patient", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("patientId", args.patientId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with shared with user details
    const patientShares = await Promise.all(
      shares.map(async (share) => {
        const sharedWith = await ctx.db.get(share.sharedWithUserId);
        return {
          ...share,
          sharedWith: sharedWith
            ? {
                _id: sharedWith._id,
                name: sharedWith.name,
                email: sharedWith.email,
                role: sharedWith.role,
              }
            : null,
        };
      })
    );

    return patientShares;
  },
});

/**
 * Check if a user has access to a patient
 */
export const checkPatientAccess = query({
  args: {
    patientId: v.id("patients"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for explicit share
    const share = await ctx.db
      .query("patientShares")
      .withIndex("by_patient_shared_with", (q) =>
        q.eq("patientId", args.patientId).eq("sharedWithUserId", args.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (share) {
      return {
        hasAccess: true,
        permission: share.permission,
        source: "explicit_share" as const,
      };
    }

    // Check if user is the owner (has patients in their care)
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
        permission: "edit" as const,
        source: "owner" as const,
      };
    }

    return {
      hasAccess: false,
      permission: null,
      source: null,
    };
  },
});

/**
 * Get all shares for a specific patient (admin/audit view)
 */
export const getAllPatientShares = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("patientShares")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    // Enrich with user details
    const enrichedShares = await Promise.all(
      shares.map(async (share) => {
        const owner = await ctx.db.get(share.ownerUserId);
        const sharedWith = await ctx.db.get(share.sharedWithUserId);
        return {
          ...share,
          owner: owner
            ? {
                _id: owner._id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
              }
            : null,
          sharedWith: sharedWith
            ? {
                _id: sharedWith._id,
                name: sharedWith.name,
                email: sharedWith.email,
                role: sharedWith.role,
              }
            : null,
        };
      })
    );

    return enrichedShares;
  },
});

