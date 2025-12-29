import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createHIPAAAuditLogger } from "./auditLogger";
import { validateMessageAssignmentUsers } from "./utils/shareValidation";

/**
 * Assignment status validator
 */
const assignmentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("declined")
);

/**
 * Assign a message to another user for response
 */
export const assignMessage = mutation({
  args: {
    messageId: v.id("messages"),
    assignedBy: v.id("users"),
    assignedTo: v.id("users"),
    notes: v.optional(v.string()),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate users and tenant isolation
    const validationResult = await validateMessageAssignmentUsers(
      ctx,
      args.assignedBy,
      args.assignedTo,
      args.messageId,
      args.tenantId
    );
    const { owner: assigner, sharedWith: assignee, resource: message } = validationResult;

    // Check if there's already a pending assignment for this message
    const existingAssignment = await ctx.db
      .query("messageAssignments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "in_progress")
          )
        )
      )
      .first();

    if (existingAssignment) {
      throw new Error(
        "ASSIGNMENT_EXISTS: This message already has a pending or in-progress assignment. Complete or decline that assignment first."
      );
    }

    const logger = createHIPAAAuditLogger(ctx);
    const now = Date.now();

    // Create assignment
    const assignmentId = await ctx.db.insert("messageAssignments", {
      messageId: args.messageId,
      assignedBy: args.assignedBy,
      assignedTo: args.assignedTo,
      status: "pending",
      notes: args.notes,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await logger.logModification(
      args.tenantId,
      args.assignedBy,
      "message_assigned",
      "messageAssignments",
      assignmentId,
      {
        messageId: args.messageId,
        assignedBy: args.assignedBy,
        assignedTo: args.assignedTo,
        assignerEmail: assigner.email,
        assigneeEmail: assignee.email,
        notes: args.notes,
      }
    );

    return assignmentId;
  },
});

/**
 * Update assignment status
 */
export const updateAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("messageAssignments"),
    userId: v.id("users"), // User making the update (must be assignee or assigner)
    status: assignmentStatusValidator,
    declinedReason: v.optional(v.string()),
    responseMessageId: v.optional(v.id("messages")), // Link to response message if completed
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the assignment
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("ASSIGNMENT_NOT_FOUND: Message assignment not found");
    }
    if (assignment.tenantId !== args.tenantId) {
      throw new Error("TENANT_MISMATCH: Assignment does not belong to the specified tenant");
    }

    // Verify the user is either the assignee or assigner
    if (assignment.assignedTo !== args.userId && assignment.assignedBy !== args.userId) {
      throw new Error("UNAUTHORIZED: Only the assignee or assigner can update this assignment");
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["in_progress", "declined"],
      in_progress: ["completed", "declined"],
      completed: [], // Cannot change completed status
      declined: [], // Cannot change declined status
    };

    const allowedNextStatuses = validTransitions[assignment.status] || [];
    if (!allowedNextStatuses.includes(args.status)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition from '${assignment.status}' to '${args.status}'`
      );
    }

    // Build update object
    const now = Date.now();
    const updates: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "completed") {
      updates.respondedAt = now;
      if (args.responseMessageId) {
        updates.responseMessageId = args.responseMessageId;
      }
    }

    if (args.status === "declined" && args.declinedReason) {
      updates.declinedReason = args.declinedReason;
    }

    // Update assignment
    await ctx.db.patch(args.assignmentId, updates);

    // Audit log
    const logger = createHIPAAAuditLogger(ctx);
    const user = await ctx.db.get(args.userId);
    await logger.logModification(
      args.tenantId,
      args.userId,
      "message_assignment_status_updated",
      "messageAssignments",
      args.assignmentId,
      {
        messageId: assignment.messageId,
        oldStatus: assignment.status,
        newStatus: args.status,
        updatedByEmail: user?.email,
        declinedReason: args.declinedReason,
        responseMessageId: args.responseMessageId,
      }
    );

    return args.assignmentId;
  },
});

/**
 * Get assignments for a user (messages assigned to them)
 */
export const getMyAssignments = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    status: v.optional(assignmentStatusValidator),
  },
  handler: async (ctx, args) => {
    // Use compound index only when status is provided, otherwise use single-field index
    const status = args.status;
    let query = status
      ? ctx.db
          .query("messageAssignments")
          .withIndex("by_assigned_to_status", (q) =>
            q.eq("assignedTo", args.userId).eq("status", status)
          )
      : ctx.db
          .query("messageAssignments")
          .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.userId));
    
    query = query.filter((q) => q.eq(q.field("tenantId"), args.tenantId));

    const assignments = await query.collect();

    // Enrich with message and user details
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const message = await ctx.db.get(assignment.messageId);
        const assigner = await ctx.db.get(assignment.assignedBy);
        const responseMessage = assignment.responseMessageId
          ? await ctx.db.get(assignment.responseMessageId)
          : null;

        return {
          ...assignment,
          message: message
            ? {
                _id: message._id,
                subject: message.subject,
                preview: message.content?.substring(0, 100),
                fromUserId: message.fromUserId,
                toUserId: message.toUserId,
                createdAt: message.createdAt,
              }
            : null,
          assigner: assigner
            ? {
                _id: assigner._id,
                name: assigner.name,
                email: assigner.email,
              }
            : null,
          responseMessage: responseMessage
            ? {
                _id: responseMessage._id,
                subject: responseMessage.subject,
                createdAt: responseMessage.createdAt,
              }
            : null,
        };
      })
    );

    return enrichedAssignments;
  },
});

/**
 * Get assignments made by a user (messages they assigned to others)
 */
export const getAssignmentsMadeByMe = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    status: v.optional(assignmentStatusValidator),
  },
  handler: async (ctx, args) => {
    // Use compound index only when status is provided, otherwise use single-field index
    const status = args.status;
    let query = status
      ? ctx.db
          .query("messageAssignments")
          .withIndex("by_assigned_by_status", (q) =>
            q.eq("assignedBy", args.userId).eq("status", status)
          )
      : ctx.db
          .query("messageAssignments")
          .withIndex("by_assigned_by", (q) => q.eq("assignedBy", args.userId));
    
    query = query.filter((q) => q.eq(q.field("tenantId"), args.tenantId));

    const assignments = await query.collect();

    // Enrich with message and user details
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const message = await ctx.db.get(assignment.messageId);
        const assignee = await ctx.db.get(assignment.assignedTo);
        const responseMessage = assignment.responseMessageId
          ? await ctx.db.get(assignment.responseMessageId)
          : null;

        return {
          ...assignment,
          message: message
            ? {
                _id: message._id,
                subject: message.subject,
                preview: message.content?.substring(0, 100),
                fromUserId: message.fromUserId,
                toUserId: message.toUserId,
                createdAt: message.createdAt,
              }
            : null,
          assignee: assignee
            ? {
                _id: assignee._id,
                name: assignee.name,
                email: assignee.email,
              }
            : null,
          responseMessage: responseMessage
            ? {
                _id: responseMessage._id,
                subject: responseMessage.subject,
                createdAt: responseMessage.createdAt,
              }
            : null,
        };
      })
    );

    return enrichedAssignments;
  },
});

/**
 * Get assignment history for a specific message (audit trail)
 */
export const getMessageAssignmentHistory = query({
  args: {
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("messageAssignments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .order("desc")
      .collect();

    // Enrich with user details
    const enrichedHistory = await Promise.all(
      assignments.map(async (assignment) => {
        const assigner = await ctx.db.get(assignment.assignedBy);
        const assignee = await ctx.db.get(assignment.assignedTo);
        const responseMessage = assignment.responseMessageId
          ? await ctx.db.get(assignment.responseMessageId)
          : null;

        return {
          ...assignment,
          assigner: assigner
            ? {
                _id: assigner._id,
                name: assigner.name,
                email: assigner.email,
              }
            : null,
          assignee: assignee
            ? {
                _id: assignee._id,
                name: assignee.name,
                email: assignee.email,
              }
            : null,
          responseMessage: responseMessage
            ? {
                _id: responseMessage._id,
                subject: responseMessage.subject,
                createdAt: responseMessage.createdAt,
              }
            : null,
        };
      })
    );

    return enrichedHistory;
  },
});

/**
 * Check if a message has active assignments
 */
export const hasActiveAssignment = query({
  args: {
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const activeAssignment = await ctx.db
      .query("messageAssignments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "in_progress")
          )
        )
      )
      .first();

    if (activeAssignment) {
      const assignee = await ctx.db.get(activeAssignment.assignedTo);
      return {
        hasActive: true,
        assignment: {
          ...activeAssignment,
          assignee: assignee
            ? {
                _id: assignee._id,
                name: assignee.name,
                email: assignee.email,
              }
            : null,
        },
      };
    }

    return { hasActive: false, assignment: null };
  },
});

