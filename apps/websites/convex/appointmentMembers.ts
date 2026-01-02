import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get all members for a specific appointment
 */
export const getAppointmentMembers = query({
  args: {
    appointmentId: v.id("appointments"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify appointment exists and belongs to the tenant
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    if (appointment.tenantId !== args.tenantId) {
      throw new Error("Appointment does not belong to this tenant");
    }

    const members = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .collect();

    // Filter members by tenant to ensure tenant isolation
    const tenantMembers = members.filter((member) => member.tenantId === args.tenantId);

    // Enrich with user data
    const enrichedMembers = await Promise.all(
      tenantMembers.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                // Safe image field access - image is optional in user schema
                image: 'image' in user && typeof user.image === 'string' ? user.image : undefined,
              }
            : null,
        };
      })
    );

    return enrichedMembers;
  },
});

/**
 * Check if a user is a member of an appointment
 */
export const isAppointmentMember = query({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment_user", (q) =>
        q.eq("appointmentId", args.appointmentId).eq("userId", args.userId)
      )
      .first();

    return {
      isMember: !!member,
      member: member || null,
    };
  },
});

/**
 * Add a member to an appointment
 */
export const addAppointmentMember = mutation({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    role: v.union(
      v.literal("organizer"),
      v.literal("attendee"),
      v.literal("optional")
    ),
    addedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if member already exists
    const existing = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment_user", (q) =>
        q.eq("appointmentId", args.appointmentId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a member of this appointment");
    }

    // Verify appointment exists
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Verify tenant match
    if (appointment.tenantId !== args.tenantId) {
      throw new Error("Appointment does not belong to this tenant");
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("appointmentMembers", {
      appointmentId: args.appointmentId,
      userId: args.userId,
      role: args.role,
      status: "pending",
      addedBy: args.addedBy,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Get patient info for notification
    const patient = await ctx.db.get(appointment.patientId);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "a patient";

    // Get the user who added the member
    const addedByUser = await ctx.db.get(args.addedBy);
    const addedByName = addedByUser
      ? `${addedByUser.firstName || ''} ${addedByUser.lastName || ''}`.trim() || addedByUser.name || "Someone"
      : "Someone";

    // Format appointment time
    const appointmentDate = new Date(appointment.scheduledAt);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Create notification for the invited user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "appointment_invite",
      title: "Appointment Invitation",
      message: `${addedByName} invited you to an appointment with ${patientName} on ${formattedDate} at ${formattedTime}`,
      resourceType: "appointment",
      resourceId: args.appointmentId,
      metadata: {
        appointmentId: args.appointmentId,
        patientName,
        scheduledAt: appointment.scheduledAt,
        role: args.role,
        addedBy: args.addedBy,
      },
      isRead: false,
      tenantId: args.tenantId,
      createdAt: now,
    });

    return { memberId };
  },
});

/**
 * Remove a member from an appointment
 */
export const removeAppointmentMember = mutation({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment_user", (q) =>
        q.eq("appointmentId", args.appointmentId).eq("userId", args.userId)
      )
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    if (member.tenantId !== args.tenantId) {
      throw new Error("Member does not belong to this tenant");
    }

    await ctx.db.delete(member._id);
    return { success: true };
  },
});

/**
 * Update a member's role in an appointment
 */
export const updateAppointmentMemberRole = mutation({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    role: v.union(
      v.literal("organizer"),
      v.literal("attendee"),
      v.literal("optional")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment_user", (q) =>
        q.eq("appointmentId", args.appointmentId).eq("userId", args.userId)
      )
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    if (member.tenantId !== args.tenantId) {
      throw new Error("Member does not belong to this tenant");
    }

    await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a member's response status (accept/decline/tentative)
 */
export const updateAppointmentMemberStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("tentative")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment_user", (q) =>
        q.eq("appointmentId", args.appointmentId).eq("userId", args.userId)
      )
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    if (member.tenantId !== args.tenantId) {
      throw new Error("Member does not belong to this tenant");
    }

    await ctx.db.patch(member._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get all appointments where a user is a member (for calendar display)
 */
export const getUserAppointmentsAsMember = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all appointment memberships for this user
    const memberships = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();

    // Get the appointments for each membership
    const appointments = await Promise.all(
      memberships.map(async (membership) => {
        const appointment = await ctx.db.get(membership.appointmentId);
        if (!appointment) return null;

        // Filter by date range if provided
        if (args.startDate && appointment.scheduledAt < args.startDate) return null;
        if (args.endDate && appointment.scheduledAt > args.endDate) return null;

        // Get patient info
        const patient = await ctx.db.get(appointment.patientId);

        // Get location info
        let location = null;
        if (appointment.locationId) {
          location = await ctx.db.get(appointment.locationId);
        }

        return {
          ...appointment,
          membership: {
            role: membership.role,
            status: membership.status,
          },
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : "Unknown Patient",
          locationName: location?.name || null,
        };
      })
    );

    // Filter out nulls and return
    return appointments.filter((apt): apt is NonNullable<typeof apt> => apt !== null);
  },
});

/**
 * Add multiple members to an appointment at once
 */
export const addMultipleAppointmentMembers = mutation({
  args: {
    appointmentId: v.id("appointments"),
    members: v.array(
      v.object({
        userId: v.id("users"),
        role: v.union(
          v.literal("organizer"),
          v.literal("attendee"),
          v.literal("optional")
        ),
      })
    ),
    addedBy: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify appointment exists
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Verify tenant match
    if (appointment.tenantId !== args.tenantId) {
      throw new Error("Appointment does not belong to this tenant");
    }

    const now = Date.now();
    const results: { userId: Id<"users">; memberId?: Id<"appointmentMembers">; error?: string }[] = [];

    for (const member of args.members) {
      // Check if member already exists
      const existing = await ctx.db
        .query("appointmentMembers")
        .withIndex("by_appointment_user", (q) =>
          q.eq("appointmentId", args.appointmentId).eq("userId", member.userId)
        )
        .first();

      if (existing) {
        results.push({ userId: member.userId, error: "Already a member" });
        continue;
      }

      const memberId = await ctx.db.insert("appointmentMembers", {
        appointmentId: args.appointmentId,
        userId: member.userId,
        role: member.role,
        status: "pending",
        addedBy: args.addedBy,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ userId: member.userId, memberId });
    }

    return { results };
  },
});

/**
 * Remove all members from an appointment
 */
export const clearAppointmentMembers = mutation({
  args: {
    appointmentId: v.id("appointments"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("appointmentMembers")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .collect();

    let deletedCount = 0;
    for (const member of members) {
      if (member.tenantId === args.tenantId) {
        await ctx.db.delete(member._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});

