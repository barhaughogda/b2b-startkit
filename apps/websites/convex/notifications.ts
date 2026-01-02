import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get all notifications for a user
 */
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const includeRead = args.includeRead !== false;

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .order("desc");

    if (!includeRead) {
      // Use by_user_unread index but filter by tenantId to maintain tenant isolation
      query = ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", args.userId).eq("isRead", false)
        )
        .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
        .order("desc");
    }

    const notifications = await query.take(limit);
    return notifications;
  },
});

/**
 * Get unread notification count for a user
 */
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();

    return {
      count: unreadNotifications.length,
      hasUnread: unreadNotifications.length > 0,
    };
  },
});

/**
 * Get unread appointment notification count (for calendar badge)
 */
export const getUnreadAppointmentCount = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const appointmentTypes = [
      "appointment_invite",
      "appointment_update",
      "appointment_cancelled",
      "appointment_reminder",
    ];

    const unreadAppointments = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            ...appointmentTypes.map((type) => q.eq(q.field("type"), type))
          )
        )
      )
      .collect();

    return {
      count: unreadAppointments.length,
      hasUnread: unreadAppointments.length > 0,
    };
  },
});

/**
 * Create a notification
 */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("appointment_invite"),
      v.literal("appointment_update"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_reminder"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("message_received"),
      v.literal("task_assigned"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    tenantId: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      metadata: args.metadata,
      isRead: false,
      tenantId: args.tenantId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return { notificationId };
  },
});

/**
 * Create notifications for multiple users at once
 */
export const createNotificationsForUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
    type: v.union(
      v.literal("appointment_invite"),
      v.literal("appointment_update"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_reminder"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("message_received"),
      v.literal("task_assigned"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    tenantId: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notificationIds: Id<"notifications">[] = [];

    for (const userId of args.userIds) {
      const notificationId = await ctx.db.insert("notifications", {
        userId,
        type: args.type,
        title: args.title,
        message: args.message,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        metadata: args.metadata,
        isRead: false,
        tenantId: args.tenantId,
        createdAt: now,
        expiresAt: args.expiresAt,
      });
      notificationIds.push(notificationId);
    }

    return { notificationIds, count: notificationIds.length };
  },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark multiple notifications as read
 */
export const markMultipleAsRead = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let markedCount = 0;

    for (const notificationId of args.notificationIds) {
      const notification = await ctx.db.get(notificationId);
      if (notification && !notification.isRead) {
        await ctx.db.patch(notificationId, {
          isRead: true,
          readAt: now,
        });
        markedCount++;
      }
    }

    return { markedCount };
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    type: v.optional(
      v.union(
        v.literal("appointment_invite"),
        v.literal("appointment_update"),
        v.literal("appointment_cancelled"),
        v.literal("appointment_reminder"),
        v.literal("member_added"),
        v.literal("member_removed"),
        v.literal("message_received"),
        v.literal("task_assigned"),
        v.literal("system")
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId));

    const notifications = await query.collect();
    const now = Date.now();
    let markedCount = 0;

    for (const notification of notifications) {
      // Filter by type if specified
      if (args.type && notification.type !== args.type) continue;

      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
      markedCount++;
    }

    return { markedCount };
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify notification belongs to the specified tenant
    if (notification.tenantId !== args.tenantId) {
      throw new Error("Notification does not belong to this tenant");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

/**
 * Delete all read notifications older than a certain date
 */
export const cleanupOldNotifications = mutation({
  args: {
    tenantId: v.string(),
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isRead"), true),
          q.lt(q.field("createdAt"), cutoffDate)
        )
      )
      .collect();

    let deletedCount = 0;
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Helper function to create appointment-related notifications
 * This is called internally when appointments are created/updated
 */
export const notifyAppointmentMembers = mutation({
  args: {
    appointmentId: v.id("appointments"),
    type: v.union(
      v.literal("appointment_invite"),
      v.literal("appointment_update"),
      v.literal("appointment_cancelled")
    ),
    excludeUserId: v.optional(v.id("users")), // Don't notify the person who made the change
    tenantId: v.string(),
    title: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get all members of the appointment
    const members = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", args.appointmentId)
      )
      .collect();

    // Get the appointment owner
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Build list of users to notify (members + owner, excluding the actor)
    const userIdsToNotify = new Set<Id<"users">>();

    // Add appointment owner
    if (appointment.userId && appointment.userId !== args.excludeUserId) {
      userIdsToNotify.add(appointment.userId);
    }

    // Add all members
    for (const member of members) {
      if (member.userId !== args.excludeUserId) {
        userIdsToNotify.add(member.userId);
      }
    }

    // Create notifications
    const now = Date.now();
    const notificationIds: Id<"notifications">[] = [];

    for (const userId of userIdsToNotify) {
      const notificationId = await ctx.db.insert("notifications", {
        userId,
        type: args.type,
        title: args.title,
        message: args.message,
        resourceType: "appointment",
        resourceId: args.appointmentId,
        metadata: args.metadata,
        isRead: false,
        tenantId: args.tenantId,
        createdAt: now,
      });
      notificationIds.push(notificationId);
    }

    return {
      notificationIds,
      notifiedCount: notificationIds.length,
    };
  },
});

