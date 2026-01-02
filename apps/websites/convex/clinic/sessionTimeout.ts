/**
 * Session Timeout Configuration
 * 
 * Functions for managing session timeout settings per tenant.
 * These settings control automatic logout after inactivity.
 */

import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { api } from "../_generated/api";
import { verifyOwnerAccessQuery } from "../utils/authorization";

/**
 * Get session timeout configuration for a tenant
 * Returns default values if not configured
 */
export const getSessionTimeoutConfig = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Return configured values or defaults
    const sessionTimeout = tenant.settings.sessionTimeout;
    
    return {
      timeout: sessionTimeout?.timeout ?? 30, // Default: 30 minutes
      warningTime: sessionTimeout?.warningTime ?? 2, // Default: 2 minutes
      enabled: sessionTimeout?.enabled ?? true, // Default: enabled
      maxConcurrentSessions: sessionTimeout?.maxConcurrentSessions ?? 3, // Default: 3 concurrent sessions
    };
  },
});

/**
 * Update session timeout configuration for a tenant
 * Owner-only action
 */
export const updateSessionTimeoutConfig = action({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    timeout: v.optional(v.number()), // Timeout in minutes (5-480)
    warningTime: v.optional(v.number()), // Warning time in minutes (must be < timeout)
    enabled: v.optional(v.boolean()), // Whether session timeout is enabled
    maxConcurrentSessions: v.optional(v.number()), // Maximum concurrent sessions per user (1-10)
  },
  handler: async (ctx, args): Promise<{ success: boolean; config: any }> => {
    // Verify owner access
    const authResult: any = await ctx.runQuery(api.utils.authorization.verifyOwnerAccessQuery, {
      userEmail: args.userEmail,
      tenantId: args.tenantId,
    });
    
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized: Only clinic owners can update session timeout settings");
    }

    // Validate timeout value (5-480 minutes)
    if (args.timeout !== undefined) {
      if (args.timeout < 5 || args.timeout > 480) {
        throw new Error("Session timeout must be between 5 and 480 minutes");
      }
    }

    // Validate warning time (must be less than timeout)
    if (args.warningTime !== undefined && args.timeout !== undefined) {
      if (args.warningTime >= args.timeout) {
        throw new Error("Warning time must be less than session timeout");
      }
      if (args.warningTime < 1) {
        throw new Error("Warning time must be at least 1 minute");
      }
    }

    // Validate max concurrent sessions (1-10)
    if (args.maxConcurrentSessions !== undefined) {
      if (args.maxConcurrentSessions < 1 || args.maxConcurrentSessions > 10) {
        throw new Error("Max concurrent sessions must be between 1 and 10");
      }
    }

    // Get current tenant settings
    const tenant: any = await ctx.runQuery(api.tenants.getTenant, {
      tenantId: args.tenantId,
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Build updated session timeout config
    const currentSessionTimeout: any = tenant.settings.sessionTimeout ?? {};
    const updatedSessionTimeout: any = {
      ...currentSessionTimeout,
      ...(args.timeout !== undefined && { timeout: args.timeout }),
      ...(args.warningTime !== undefined && { warningTime: args.warningTime }),
      ...(args.enabled !== undefined && { enabled: args.enabled }),
      ...(args.maxConcurrentSessions !== undefined && { maxConcurrentSessions: args.maxConcurrentSessions }),
    };

    // If warning time is not provided but timeout is, ensure warning time is valid
    if (args.timeout !== undefined && args.warningTime === undefined) {
      const timeout = args.timeout;
      const currentWarningTime = currentSessionTimeout?.warningTime ?? 2;
      // Ensure warning time doesn't exceed timeout
      if (currentWarningTime >= timeout) {
        updatedSessionTimeout.warningTime = Math.max(1, Math.floor(timeout * 0.1)); // Default to 10% of timeout, min 1 minute
      }
    }

    // Update tenant settings
    await ctx.runMutation(api.tenants.updateTenantSettings, {
      tenantId: args.tenantId,
      settings: {
        sessionTimeout: updatedSessionTimeout,
      },
    });

    // Log the change
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: args.tenantId,
      userId: authResult.userId,
      action: "session_timeout_updated",
      resource: "tenant",
      resourceId: args.tenantId,
      details: {
        previousConfig: currentSessionTimeout,
        newConfig: updatedSessionTimeout,
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      config: updatedSessionTimeout,
    };
  },
});

