/**
 * Convex-compatible audit logging
 * 
 * Provides HIPAA-compliant audit logging for all system operations.
 * All logs are stored in the auditLogs table for compliance and security tracking.
 * 
 * Usage:
 * ```typescript
 * const logger = createHIPAAAuditLogger(ctx);
 * await logger.logCalendarEdit({
 *   tenantId: "...",
 *   userId: "...",
 *   action: "appointment_updated",
 *   appointmentId: "...",
 *   changes: {...}
 * });
 * ```
 */

import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

interface AuditLoggerContext {
  runMutation: (mutation: any, args: any) => Promise<any>;
}

export function createHIPAAAuditLogger(ctx: AuditLoggerContext) {
  return {
    /**
     * Log access to a resource
     */
    logAccess: async (
      tenantId: string,
      userId: Id<"users"> | undefined,
      action: string,
      resource: string,
      resourceId: string,
      details?: any
    ) => {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId,
          action,
          resource,
          resourceId,
          details,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log access audit event: ${action} on ${resource}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },

    /**
     * Log modification of a resource
     */
    logModification: async (
      tenantId: string,
      userId: Id<"users"> | undefined,
      action: string,
      resource: string,
      resourceId: string,
      details?: any
    ) => {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId,
          action,
          resource,
          resourceId,
          details,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log modification audit event: ${action} on ${resource}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },

    /**
     * Log security-related events
     */
    logSecurityEvent: async (
      tenantId: string,
      userId: Id<"users"> | undefined,
      event: string,
      details?: any
    ) => {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId,
          userId,
          action: event,
          resource: "security",
          resourceId: userId || "system",
          details,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log security event: ${event}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },

    /**
     * Log calendar-related edits (appointments, availability, locations)
     */
    logCalendarEdit: async (params: {
      tenantId: string;
      userId: Id<"users"> | undefined;
      action: string;
      resource: "appointments" | "availability" | "locations" | "calendarSync";
      resourceId: string;
      details?: {
        providerId?: Id<"providers">;
        appointmentId?: Id<"appointments">;
        locationId?: Id<"locations">;
        changes?: any;
        isAdminEdit?: boolean;
        originalScheduledAt?: number;
        newScheduledAt?: number;
        syncType?: "google" | "microsoft" | "apple";
        [key: string]: any;
      };
    }) => {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId: params.tenantId,
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          details: params.details,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log calendar edit audit event: ${params.action} on ${params.resource}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },

    /**
     * Log availability changes
     */
    logAvailabilityChange: async (params: {
      tenantId: string;
      userId: Id<"users"> | undefined;
      providerId?: Id<"providers">; // Optional - for backward compatibility, userId preferred
      action: "availability_set" | "availability_updated" | "availability_override_added" | "availability_override_removed" | "availability_removed";
      locationId?: Id<"locations">;
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      overrideDate?: number;
      details?: any;
    }) => {
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId: params.tenantId,
          userId: params.userId,
          action: params.action,
          resource: "availability",
          resourceId: params.providerId,
          details: {
            providerId: params.providerId,
            locationId: params.locationId,
            dayOfWeek: params.dayOfWeek,
            startTime: params.startTime,
            endTime: params.endTime,
            overrideDate: params.overrideDate,
            ...params.details,
          },
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log availability change audit event: ${params.action}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },

    /**
     * Log calendar sync events
     */
    logCalendarSync: async (params: {
      tenantId: string;
      userId: Id<"users"> | undefined;
      providerId?: Id<"providers">; // Optional - for backward compatibility, userId preferred
      action: "calendar_sync_connected" | "calendar_sync_disconnected" | "calendar_sync_success" | "calendar_sync_failed";
      syncType: "google" | "microsoft" | "apple";
      details?: {
        syncedCount?: number;
        errorCount?: number;
        errorMessage?: string;
        [key: string]: any;
      };
    }) => {
      try {
        // Use userId as resourceId if available, otherwise providerId
        const resourceId = params.userId || params.providerId;
        if (!resourceId) {
          // Skip logging if neither userId nor providerId is available
          return;
        }
        
        await ctx.runMutation(api.auditLogs.create, {
          tenantId: params.tenantId,
          userId: params.userId,
          action: params.action,
          resource: "calendarSync",
          resourceId: resourceId,
          details: {
            providerId: params.providerId,
            syncType: params.syncType,
            ...params.details,
          },
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to log calendar sync audit event: ${params.action}`, error);
        // Don't throw - audit logging failures shouldn't break operations
      }
    },
  };
}
