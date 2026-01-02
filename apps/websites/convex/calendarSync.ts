import { mutation, query, internalQuery, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { encryptPHISync, decryptPHISync } from "./encryption";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { createHIPAAAuditLogger } from "./auditLogger";

/**
 * Calendar Sync API
 * 
 * Manages external calendar synchronization (Google, Microsoft, Apple)
 * Handles OAuth tokens, sync status, and sync operations
 * 
 * Security:
 * - All tokens are encrypted at rest using encryption utilities
 * - Tenant isolation enforced on all operations
 * - Users can only access their own sync settings
 * 
 * Migration Note:
 * - User-based functions (getSyncStatusByUser, etc.) are preferred
 * - Provider-based functions are kept for backward compatibility
 */

// Get calendar sync status for a provider
export const getSyncStatus = query({
  args: {
    providerId: v.id("providers"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify provider belongs to tenant
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("_id"), args.providerId))
      .first();

    if (!provider) {
      throw new Error("Provider not found or access denied");
    }

    // Get sync records for this provider
    const syncRecords = await ctx.db
      .query("calendarSync")
      .withIndex("by_provider_tenant", (q) =>
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .collect();

    // Return sync status without decrypted tokens (for security)
    return syncRecords.map((record) => ({
      _id: record._id,
      providerId: record.providerId,
      syncType: record.syncType,
      calendarId: record.calendarId,
      lastSyncAt: record.lastSyncAt,
      syncDirection: record.syncDirection,
      tenantId: record.tenantId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // Don't return tokens in query - use separate mutation if needed
      isConnected: !!record.accessToken,
    }));
  },
});

// Get sync status for a specific sync type
export const getSyncStatusByType = query({
  args: {
    providerId: v.id("providers"),
    syncType: v.union(
      v.literal("google"),
      v.literal("microsoft"),
      v.literal("apple")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify provider belongs to tenant
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("_id"), args.providerId))
      .first();

    if (!provider) {
      throw new Error("Provider not found or access denied");
    }

    // Get sync record for this provider and sync type
    const syncRecord = await ctx.db
      .query("calendarSync")
      .withIndex("by_provider_tenant", (q) =>
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("syncType"), args.syncType))
      .first();

    if (!syncRecord) {
      return null;
    }

    // Return sync status without decrypted tokens
    return {
      _id: syncRecord._id,
      providerId: syncRecord.providerId || undefined,
      syncType: syncRecord.syncType,
      calendarId: syncRecord.calendarId,
      lastSyncAt: syncRecord.lastSyncAt,
      syncDirection: syncRecord.syncDirection,
      tenantId: syncRecord.tenantId,
      createdAt: syncRecord.createdAt,
      updatedAt: syncRecord.updatedAt,
      isConnected: !!syncRecord.accessToken,
    };
  },
});

// Initialize Google Calendar sync (store OAuth tokens after OAuth flow)
export const initGoogleCalendarSync = mutation({
  args: {
    providerId: v.id("providers"),
    accessToken: v.string(), // OAuth access token (will be encrypted)
    refreshToken: v.optional(v.string()), // OAuth refresh token (will be encrypted)
    calendarId: v.optional(v.string()), // Google Calendar ID (usually "primary")
    syncDirection: v.union(
      v.literal("bidirectional"),
      v.literal("outbound-only")
    ),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who initiated the sync (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.accessToken?.trim()) {
      throw new Error("Access token is required");
    }
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify provider belongs to tenant
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("_id"), args.providerId))
      .first();

    if (!provider) {
      throw new Error("Provider not found or access denied");
    }

    // Check if sync already exists for this provider and sync type
    const existingSync = await ctx.db
      .query("calendarSync")
      .withIndex("by_provider_tenant", (q) =>
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("syncType"), "google"))
      .first();

    const now = Date.now();
    const encryptedAccessToken = encryptPHISync(args.accessToken);
    const encryptedRefreshToken = args.refreshToken
      ? encryptPHISync(args.refreshToken)
      : undefined;

    let syncId: Id<"calendarSync">;
    
    if (existingSync) {
      // Update existing sync
      await ctx.db.patch(existingSync._id, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        calendarId: args.calendarId || "primary",
        syncDirection: args.syncDirection,
        updatedAt: now,
      });
      syncId = existingSync._id;
    } else {
      // Create new sync record
      syncId = await ctx.db.insert("calendarSync", {
        providerId: args.providerId,
        syncType: "google",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        calendarId: args.calendarId || "primary",
        syncDirection: args.syncDirection,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log audit event
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logCalendarSync({
      tenantId: args.tenantId,
      userId: args.userId,
      providerId: args.providerId,
      action: existingSync ? "calendar_sync_connected" : "calendar_sync_connected", // Both are connections
      syncType: "google",
      details: {
        syncDirection: args.syncDirection,
        calendarId: args.calendarId || "primary",
        isUpdate: existingSync,
      },
    });

    return syncId;
  },
});

// Update sync settings (sync direction, calendar ID)
export const updateSyncSettings = mutation({
  args: {
    syncId: v.id("calendarSync"),
    syncDirection: v.optional(
      v.union(v.literal("bidirectional"), v.literal("outbound-only"))
    ),
    calendarId: v.optional(v.string()),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who updated the settings (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get sync record
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Update sync settings
    const updates: {
      syncDirection?: typeof args.syncDirection;
      calendarId?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.syncDirection !== undefined) {
      updates.syncDirection = args.syncDirection;
    }

    if (args.calendarId !== undefined) {
      updates.calendarId = args.calendarId;
    }

    await ctx.db.patch(args.syncId, updates);

    // Log audit event
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logCalendarSync({
      tenantId: args.tenantId,
      userId: args.userId,
      providerId: syncRecord.providerId || undefined,
      action: "calendar_sync_connected", // Settings update is still a sync connection event
      syncType: syncRecord.syncType,
      details: {
        changes: updates,
        settingsUpdated: true,
      },
    });

    return { success: true };
  },
});

// Update last sync timestamp
export const updateLastSyncAt = mutation({
  args: {
    syncId: v.id("calendarSync"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get sync record
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Update last sync timestamp
    await ctx.db.patch(args.syncId, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Refresh access token (for OAuth token refresh)
export const refreshAccessToken = mutation({
  args: {
    syncId: v.id("calendarSync"),
    accessToken: v.string(), // New access token (will be encrypted)
    refreshToken: v.optional(v.string()), // New refresh token (will be encrypted)
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    if (!args.accessToken?.trim()) {
      throw new Error("Access token is required");
    }

    // Get sync record
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Encrypt and update tokens
    const encryptedAccessToken = encryptPHISync(args.accessToken);
    const encryptedRefreshToken = args.refreshToken
      ? encryptPHISync(args.refreshToken)
      : syncRecord.refreshToken; // Keep existing if not provided

    await ctx.db.patch(args.syncId, {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Disconnect calendar sync
export const disconnectCalendar = mutation({
  args: {
    syncId: v.id("calendarSync"),
    tenantId: v.string(),
    userId: v.optional(v.id("users")), // User who disconnected the sync (for audit logging)
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get sync record
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Log audit event before deletion
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logCalendarSync({
      tenantId: args.tenantId,
      userId: args.userId,
      providerId: syncRecord.providerId || undefined,
      action: "calendar_sync_disconnected",
      syncType: syncRecord.syncType,
      details: {
        calendarId: syncRecord.calendarId,
      },
    });

    // Delete sync record (removes all tokens)
    await ctx.db.delete(args.syncId);

    return { success: true };
  },
});

// Get decrypted access token (for sync operations - use with caution)
// This should only be called from server-side sync operations
export const getDecryptedAccessToken = query({
  args: {
    syncId: v.id("calendarSync"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get sync record
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Decrypt and return access token
    // WARNING: This exposes the token - only use in secure server contexts
    try {
      return {
        accessToken: decryptPHISync(syncRecord.accessToken),
        refreshToken: syncRecord.refreshToken
          ? decryptPHISync(syncRecord.refreshToken)
          : undefined,
        syncType: syncRecord.syncType,
        calendarId: syncRecord.calendarId,
      };
    } catch (error) {
      throw new Error(
        `Failed to decrypt token: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Get sync by provider (for API routes) - DEPRECATED: Use getSyncByUser instead
export const getSyncByProvider = query({
  args: {
    providerId: v.id("providers"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Get sync records for this provider
    const syncRecords = await ctx.db
      .query("calendarSync")
      .withIndex("by_provider_tenant", (q) =>
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => 
        q.and(
          q.neq(q.field("accessToken"), ""),
          q.eq(q.field("syncDirection"), "bidirectional")
        )
      )
      .collect();

    return syncRecords;
  },
});

// ============================================================================
// USER-BASED CALENDAR SYNC FUNCTIONS (preferred)
// ============================================================================

// Get calendar sync status for a user
export const getSyncStatusByUser = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify user belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found or access denied");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get sync records for this user
    const syncRecords = await ctx.db
      .query("calendarSync")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();

    // Return sync status without decrypted tokens (for security)
    return syncRecords.map((record) => ({
      _id: record._id,
      userId: record.userId,
      syncType: record.syncType,
      calendarId: record.calendarId,
      lastSyncAt: record.lastSyncAt,
      syncDirection: record.syncDirection,
      tenantId: record.tenantId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // Don't return tokens in query - use separate mutation if needed
      isConnected: !!record.accessToken,
    }));
  },
});

// Get sync status for a specific sync type (user-based)
export const getSyncStatusByTypeByUser = query({
  args: {
    userId: v.id("users"),
    syncType: v.union(
      v.literal("google"),
      v.literal("microsoft"),
      v.literal("apple")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify user belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found or access denied");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get sync record for this user and sync type
    const syncRecord = await ctx.db
      .query("calendarSync")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("syncType"), args.syncType))
      .first();

    if (!syncRecord) {
      return null;
    }

    // Return sync status without decrypted tokens
    return {
      _id: syncRecord._id,
      userId: syncRecord.userId,
      syncType: syncRecord.syncType,
      calendarId: syncRecord.calendarId,
      lastSyncAt: syncRecord.lastSyncAt,
      syncDirection: syncRecord.syncDirection,
      tenantId: syncRecord.tenantId,
      createdAt: syncRecord.createdAt,
      updatedAt: syncRecord.updatedAt,
      isConnected: !!syncRecord.accessToken,
    };
  },
});

// Initialize Google Calendar sync for a user (store OAuth tokens after OAuth flow)
export const initGoogleCalendarSyncByUser = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(), // OAuth access token (will be encrypted)
    refreshToken: v.optional(v.string()), // OAuth refresh token (will be encrypted)
    calendarId: v.optional(v.string()), // Google Calendar ID (usually "primary")
    syncDirection: v.union(
      v.literal("bidirectional"),
      v.literal("outbound-only")
    ),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.accessToken?.trim()) {
      throw new Error("Access token is required");
    }
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify user belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found or access denied");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Check if sync already exists for this user and sync type
    const existingSync = await ctx.db
      .query("calendarSync")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("syncType"), "google"))
      .first();

    const now = Date.now();
    const encryptedAccessToken = encryptPHISync(args.accessToken);
    const encryptedRefreshToken = args.refreshToken
      ? encryptPHISync(args.refreshToken)
      : undefined;

    let syncId: Id<"calendarSync">;
    
    if (existingSync) {
      // Update existing sync
      await ctx.db.patch(existingSync._id, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        calendarId: args.calendarId || "primary",
        syncDirection: args.syncDirection,
        updatedAt: now,
      });
      syncId = existingSync._id;
    } else {
      // Create new sync record
      syncId = await ctx.db.insert("calendarSync", {
        userId: args.userId,
        syncType: "google",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        calendarId: args.calendarId || "primary",
        syncDirection: args.syncDirection,
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log audit event
    const logger = createHIPAAAuditLogger(ctx);
    await logger.logCalendarSync({
      tenantId: args.tenantId,
      userId: args.userId,
      providerId: undefined, // User-based sync - no providerId
      action: existingSync ? "calendar_sync_connected" : "calendar_sync_connected",
      syncType: "google",
      details: {
        syncDirection: args.syncDirection,
        calendarId: args.calendarId || "primary",
        isUpdate: existingSync,
      },
    });

    return syncId;
  },
});

// Get sync by user (for API routes)
export const getSyncByUser = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant isolation
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Verify user belongs to tenant
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found or access denied");
    }
    if (user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to the specified tenant");
    }

    // Get sync records for this user
    const syncRecords = await ctx.db
      .query("calendarSync")
      .withIndex("by_user_tenant", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .filter((q) => 
        q.and(
          q.neq(q.field("accessToken"), ""),
          q.eq(q.field("syncDirection"), "bidirectional")
        )
      )
      .collect();

    return syncRecords;
  },
});

// Internal query: Get all active calendar syncs (for scheduled sync job)
export const getAllActiveSyncs = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all sync records with access tokens (active syncs)
    const syncs = await ctx.db
      .query("calendarSync")
      .filter((q) => q.neq(q.field("accessToken"), ""))
      .collect();

    return syncs.map((sync) => ({
      _id: sync._id,
      providerId: sync.providerId,
      syncType: sync.syncType,
      tenantId: sync.tenantId,
      calendarId: sync.calendarId,
      syncDirection: sync.syncDirection,
    }));
  },
});

// Internal action: Check external calendar conflicts
// Calls the Next.js API route to check for conflicts with external calendar events
export const checkExternalCalendarConflicts = internalAction({
  args: {
    providerId: v.id("providers"),
    tenantId: v.string(),
    scheduledAt: v.number(),
    duration: v.number(), // in minutes
  },
  handler: async (ctx, args) => {
    // Get active bidirectional syncs for this provider
    const syncs = await ctx.runQuery(internal.calendarSync.getSyncRecordForConflictCheck, {
      providerId: args.providerId,
      tenantId: args.tenantId,
    });

    if (!syncs || syncs.length === 0) {
      // No bidirectional syncs - no external conflicts possible
      return { hasConflicts: false, conflicts: [] };
    }

    // Check conflicts for each sync (usually just one Google Calendar sync)
    const allConflicts: Array<{
      id: string;
      summary: string;
      start: string;
      end: string;
      location?: string;
    }> = [];

    for (const sync of syncs) {
      try {
        // Call Next.js API route to check conflicts
        const syncApiUrl = process.env.NEXT_PUBLIC_SYNC_API_URL || 
          process.env.NEXTAUTH_URL || 
          "http://localhost:3000";

        const response = await fetch(`${syncApiUrl}/api/calendar/check-conflicts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sync-Secret": process.env.CALENDAR_SYNC_SECRET || "",
          },
          body: JSON.stringify({
            providerId: args.providerId,
            tenantId: args.tenantId,
            scheduledAt: args.scheduledAt,
            duration: args.duration,
            accessToken: sync.accessToken,
            refreshToken: sync.refreshToken,
            calendarId: sync.calendarId,
          }),
        });

        if (!response.ok) {
          console.warn(`Failed to check external calendar conflicts: ${response.statusText}`);
          continue;
        }

        const result = await response.json();
        if (result.hasConflicts && result.conflicts) {
          allConflicts.push(...result.conflicts);
        }
      } catch (error) {
        console.error(`Error checking external calendar conflicts for sync ${sync._id}:`, error);
        // Continue checking other syncs even if one fails
      }
    }

    return {
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
    };
  },
});

// Internal query: Get sync record for conflict checking (with decrypted tokens)
export const getSyncRecordForConflictCheck = internalQuery({
  args: {
    providerId: v.id("providers"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get bidirectional syncs only (we only check conflicts for bidirectional syncs)
    const syncRecords = await ctx.db
      .query("calendarSync")
      .withIndex("by_provider_tenant", (q) =>
        q.eq("providerId", args.providerId).eq("tenantId", args.tenantId)
      )
      .filter((q) => 
        q.and(
          q.neq(q.field("accessToken"), ""),
          q.eq(q.field("syncDirection"), "bidirectional")
        )
      )
      .collect();

    // Decrypt tokens for API call
    return syncRecords.map((sync) => ({
      _id: sync._id,
      providerId: sync.providerId,
      syncType: sync.syncType,
      tenantId: sync.tenantId,
      calendarId: sync.calendarId,
      syncDirection: sync.syncDirection,
      accessToken: decryptPHISync(sync.accessToken),
      refreshToken: sync.refreshToken ? decryptPHISync(sync.refreshToken) : undefined,
    }));
  },
});

// Internal action: Sync a provider's calendar
// Calls the Next.js API route to perform the actual sync
export const syncProviderCalendar = internalAction({
  args: {
    syncId: v.id("calendarSync"),
    providerId: v.id("providers"),
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; syncedCount?: number; errorCount?: number }> => {
    // Get sync record with decrypted tokens
    const syncRecord: any = await ctx.runQuery(internal.calendarSync.getSyncRecordForSync, {
      syncId: args.syncId,
    });

    if (!syncRecord) {
      throw new Error("Sync record not found");
    }

    // Verify tenant isolation
    if (syncRecord.tenantId !== args.tenantId) {
      throw new Error("Access denied: tenant mismatch");
    }

    // Call Next.js API route to perform sync
    const syncApiUrl = process.env.NEXT_PUBLIC_SYNC_API_URL || 
      process.env.NEXTAUTH_URL || 
      "http://localhost:3000";

    const response: Response = await fetch(`${syncApiUrl}/api/calendar/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use a secret key for authentication between Convex and Next.js
        "X-Sync-Secret": process.env.CALENDAR_SYNC_SECRET || "",
      },
      body: JSON.stringify({
        syncId: args.syncId,
        providerId: args.providerId,
        tenantId: args.tenantId,
        accessToken: syncRecord.accessToken,
        refreshToken: syncRecord.refreshToken,
        calendarId: syncRecord.calendarId,
        syncType: syncRecord.syncType,
        syncDirection: syncRecord.syncDirection,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      
      // Log sync failure
      try {
        const logger = createHIPAAAuditLogger(ctx);
        await logger.logCalendarSync({
          tenantId: args.tenantId,
          userId: undefined, // Internal action, no user context
          providerId: args.providerId,
          action: "calendar_sync_failed",
          syncType: syncRecord.syncType,
          details: {
            errorMessage: error,
          },
        });
      } catch (auditError) {
        console.error("Failed to log sync failure audit event:", auditError);
        // Don't fail the sync if audit logging fails
      }
      
      throw new Error(`Sync failed: ${error}`);
    }

    const result: any = await response.json();

    // Update last sync timestamp
    await ctx.runAction(internal.calendarSync.updateLastSyncAtInternal, {
      syncId: args.syncId,
    });

    // Log successful sync
    try {
      const logger = createHIPAAAuditLogger(ctx);
      await logger.logCalendarSync({
        tenantId: args.tenantId,
        userId: undefined, // Internal action, no user context
        providerId: args.providerId,
        action: "calendar_sync_success",
        syncType: syncRecord.syncType,
        details: {
          syncedCount: result.syncedCount || 0,
          errorCount: result.errorCount || 0,
        },
      });
    } catch (error) {
      console.error("Failed to log sync success audit event:", error);
      // Don't fail the sync if audit logging fails
    }

    return result;
  },
});

// Internal query: Get sync record for sync operation (with decrypted tokens)
export const getSyncRecordForSync = internalQuery({
  args: {
    syncId: v.id("calendarSync"),
  },
  handler: async (ctx, args) => {
    const syncRecord = await ctx.db.get(args.syncId);

    if (!syncRecord) {
      return null;
    }

    // Decrypt tokens for sync operation
    try {
      return {
        _id: syncRecord._id,
        providerId: syncRecord.providerId || undefined,
        syncType: syncRecord.syncType,
        tenantId: syncRecord.tenantId,
        calendarId: syncRecord.calendarId,
        syncDirection: syncRecord.syncDirection,
        accessToken: decryptPHISync(syncRecord.accessToken),
        refreshToken: syncRecord.refreshToken
          ? decryptPHISync(syncRecord.refreshToken)
          : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to decrypt token: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Internal mutation: Update last sync timestamp (called after successful sync)
export const updateLastSyncAtInternal = internalAction({
  args: {
    syncId: v.id("calendarSync"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.calendarSync.updateLastSyncAtMutation, {
      syncId: args.syncId,
    });
  },
});

// Internal mutation helper: Update last sync timestamp
export const updateLastSyncAtMutation = internalMutation({
  args: {
    syncId: v.id("calendarSync"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.syncId, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

