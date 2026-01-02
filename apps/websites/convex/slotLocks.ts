/**
 * Slot Locks - Optimistic locking for appointment slots
 * 
 * Prevents double-booking race conditions by temporarily locking slots
 * during the booking process. Locks automatically expire after a timeout.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Default lock duration in milliseconds (5 minutes)
const DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1000;

/**
 * Acquire a lock on a time slot
 * Returns the lock ID if successful, throws an error if slot is already locked
 */
export const acquireLock = mutation({
  args: {
    userId: v.id("users"), // Provider whose slot to lock
    clinicId: v.optional(v.id("clinics")),
    slotStart: v.number(), // UTC timestamp
    slotEnd: v.number(), // UTC timestamp
    patientId: v.optional(v.id("patients")), // Optional patient holding the lock
    sessionId: v.string(), // Browser session ID for tracking
    tenantId: v.string(),
    durationMs: v.optional(v.number()), // Custom lock duration
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lockDuration = args.durationMs || DEFAULT_LOCK_DURATION_MS;
    const expiresAt = now + lockDuration;
    
    // Check for existing locks on this slot
    const existingLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_user_slot", (q) => 
        q.eq("userId", args.userId).eq("slotStart", args.slotStart)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.gt(q.field("expiresAt"), now) // Only non-expired locks
        )
      )
      .collect();
    
    // Check if any existing lock overlaps with requested slot
    const hasOverlappingLock = existingLocks.some(lock => {
      // Lock overlaps if: lock.start < slot.end AND lock.end > slot.start
      return lock.slotStart < args.slotEnd && lock.slotEnd > args.slotStart;
    });
    
    if (hasOverlappingLock) {
      // Check if it's the same session trying to extend their lock
      const sameSessionLock = existingLocks.find(lock => 
        lock.sessionId === args.sessionId &&
        lock.slotStart < args.slotEnd && 
        lock.slotEnd > args.slotStart
      );
      
      if (sameSessionLock) {
        // Extend the existing lock
        await ctx.db.patch(sameSessionLock._id, {
          expiresAt,
        });
        return { lockId: sameSessionLock._id, extended: true };
      }
      
      throw new Error("This time slot is temporarily held by another user. Please try a different time or wait a few minutes.");
    }
    
    // Create new lock
    const lockId = await ctx.db.insert("slotLocks", {
      userId: args.userId,
      clinicId: args.clinicId,
      slotStart: args.slotStart,
      slotEnd: args.slotEnd,
      lockedBy: args.patientId,
      sessionId: args.sessionId,
      expiresAt,
      tenantId: args.tenantId,
      createdAt: now,
    });
    
    return { lockId, extended: false };
  },
});

/**
 * Release a lock (called when booking is complete or cancelled)
 */
export const releaseLock = mutation({
  args: {
    lockId: v.id("slotLocks"),
    sessionId: v.string(), // Must match to release
  },
  handler: async (ctx, args) => {
    const lock = await ctx.db.get(args.lockId);
    
    if (!lock) {
      // Lock doesn't exist (might have expired), that's fine
      return { released: false, reason: "not_found" };
    }
    
    // Verify ownership
    if (lock.sessionId !== args.sessionId) {
      throw new Error("Cannot release a lock you don't own");
    }
    
    await ctx.db.delete(args.lockId);
    return { released: true };
  },
});

/**
 * Release all locks for a session (called on page unload or session end)
 */
export const releaseSessionLocks = mutation({
  args: {
    sessionId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const locks = await ctx.db
      .query("slotLocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
    
    let released = 0;
    for (const lock of locks) {
      await ctx.db.delete(lock._id);
      released++;
    }
    
    return { released };
  },
});

/**
 * Check if a slot is locked
 */
export const checkSlotLock = query({
  args: {
    userId: v.id("users"),
    slotStart: v.number(),
    slotEnd: v.number(),
    tenantId: v.string(),
    sessionId: v.optional(v.string()), // Exclude own locks if provided
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const locks = await ctx.db
      .query("slotLocks")
      .withIndex("by_user_slot", (q) => 
        q.eq("userId", args.userId).eq("slotStart", args.slotStart)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    // Find overlapping locks (excluding own session if provided)
    const overlappingLocks = locks.filter(lock => {
      if (args.sessionId && lock.sessionId === args.sessionId) {
        return false; // Exclude own locks
      }
      return lock.slotStart < args.slotEnd && lock.slotEnd > args.slotStart;
    });
    
    return {
      isLocked: overlappingLocks.length > 0,
      lockCount: overlappingLocks.length,
      expiresAt: overlappingLocks.length > 0 
        ? Math.max(...overlappingLocks.map(l => l.expiresAt))
        : null,
    };
  },
});

/**
 * Get all active locks for a provider's slots (for availability display)
 */
export const getProviderSlotLocks = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    tenantId: v.string(),
    sessionId: v.optional(v.string()), // Exclude own locks
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all locks for this provider in the date range
    const allLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("slotStart"), args.startDate),
          q.lte(q.field("slotStart"), args.endDate),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    // Filter out own session's locks if sessionId provided
    const locks = args.sessionId 
      ? allLocks.filter(lock => lock.sessionId !== args.sessionId)
      : allLocks;
    
    return locks.map(lock => ({
      slotStart: lock.slotStart,
      slotEnd: lock.slotEnd,
      expiresAt: lock.expiresAt,
    }));
  },
});

/**
 * Internal mutation to clean up expired locks
 * Should be called periodically by a cron job
 */
export const cleanupExpiredLocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all expired locks
    const expiredLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    
    let deleted = 0;
    for (const lock of expiredLocks) {
      await ctx.db.delete(lock._id);
      deleted++;
    }
    
    console.log(`[slotLocks] Cleaned up ${deleted} expired locks`);
    return { deleted };
  },
});

/**
 * Extend an existing lock (heartbeat to keep it alive)
 */
export const extendLock = mutation({
  args: {
    lockId: v.id("slotLocks"),
    sessionId: v.string(),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lock = await ctx.db.get(args.lockId);
    
    if (!lock) {
      throw new Error("Lock not found");
    }
    
    if (lock.sessionId !== args.sessionId) {
      throw new Error("Cannot extend a lock you don't own");
    }
    
    const now = Date.now();
    
    // Check if lock has already expired
    if (lock.expiresAt < now) {
      throw new Error("Lock has expired");
    }
    
    const lockDuration = args.durationMs || DEFAULT_LOCK_DURATION_MS;
    const newExpiry = now + lockDuration;
    
    await ctx.db.patch(args.lockId, {
      expiresAt: newExpiry,
    });
    
    return { extended: true, expiresAt: newExpiry };
  },
});
