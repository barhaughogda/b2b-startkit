/**
 * Tests for calendar audit logging functionality
 * 
 * Tests that all calendar-related operations properly log audit events:
 * - Appointment edits (including admin edits)
 * - Availability changes
 * - Location management
 * - Calendar sync events
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHIPAAAuditLogger } from "../auditLogger";

describe("Calendar Audit Logging", () => {
  let mockCtx: any;
  let mockRunMutation: any;

  beforeEach(() => {
    mockRunMutation = vi.fn().mockResolvedValue(undefined);
    mockCtx = {
      runMutation: mockRunMutation,
    };
  });

  describe("logCalendarEdit", () => {
    it("should log appointment updates", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarEdit({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        action: "appointment_updated",
        resource: "appointments",
        resourceId: "appt-456",
        details: {
          providerId: "provider-789" as any,
          appointmentId: "appt-456" as any,
          changes: {
            scheduledAt: 1234567890,
            duration: 30,
          },
        },
      });

      expect(mockRunMutation).toHaveBeenCalledTimes(1);
      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: "tenant-1",
          userId: "user-123",
          action: "appointment_updated",
          resource: "appointments",
          resourceId: "appt-456",
          details: expect.objectContaining({
            providerId: "provider-789",
            appointmentId: "appt-456",
          }),
        })
      );
    });

    it("should log admin appointment edits", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarEdit({
        tenantId: "tenant-1",
        userId: "admin-123" as any,
        action: "appointment_admin_edited",
        resource: "appointments",
        resourceId: "appt-456",
        details: {
          isAdminEdit: true,
          changes: {
            scheduledAt: 1234567890,
          },
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "appointment_admin_edited",
          details: expect.objectContaining({
            isAdminEdit: true,
          }),
        })
      );
    });

    it("should log location creation", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarEdit({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        action: "location_created",
        resource: "locations",
        resourceId: "loc-456",
        details: {
          locationId: "loc-456" as any,
          name: "Main Office",
          type: "office",
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "location_created",
          resource: "locations",
          details: expect.objectContaining({
            name: "Main Office",
            type: "office",
          }),
        })
      );
    });
  });

  describe("logAvailabilityChange", () => {
    it("should log recurring availability set", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logAvailabilityChange({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        providerId: "provider-789" as any,
        action: "availability_set",
        dayOfWeek: "monday",
        startTime: "09:00",
        endTime: "17:00",
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "availability_set",
          resource: "availability",
          resourceId: "provider-789",
          details: expect.objectContaining({
            providerId: "provider-789",
            dayOfWeek: "monday",
            startTime: "09:00",
            endTime: "17:00",
          }),
        })
      );
    });

    it("should log availability override added", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logAvailabilityChange({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        providerId: "provider-789" as any,
        action: "availability_override_added",
        overrideDate: 1234567890,
        startTime: "10:00",
        endTime: "14:00",
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "availability_override_added",
          details: expect.objectContaining({
            overrideDate: 1234567890,
          }),
        })
      );
    });

    it("should log availability override removed", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logAvailabilityChange({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        providerId: "provider-789" as any,
        action: "availability_override_removed",
        overrideDate: 1234567890,
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "availability_override_removed",
        })
      );
    });
  });

  describe("logCalendarSync", () => {
    it("should log calendar sync connection", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarSync({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        providerId: "provider-789" as any,
        action: "calendar_sync_connected",
        syncType: "google",
        details: {
          syncDirection: "bidirectional",
          calendarId: "primary",
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "calendar_sync_connected",
          resource: "calendarSync",
          details: expect.objectContaining({
            syncType: "google",
            syncDirection: "bidirectional",
          }),
        })
      );
    });

    it("should log calendar sync disconnect", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarSync({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        providerId: "provider-789" as any,
        action: "calendar_sync_disconnected",
        syncType: "google",
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "calendar_sync_disconnected",
        })
      );
    });

    it("should log successful calendar sync", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarSync({
        tenantId: "tenant-1",
        userId: undefined,
        providerId: "provider-789" as any,
        action: "calendar_sync_success",
        syncType: "google",
        details: {
          syncedCount: 5,
          errorCount: 0,
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "calendar_sync_success",
          details: expect.objectContaining({
            syncedCount: 5,
            errorCount: 0,
          }),
        })
      );
    });

    it("should log calendar sync failure", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      
      await logger.logCalendarSync({
        tenantId: "tenant-1",
        userId: undefined,
        providerId: "provider-789" as any,
        action: "calendar_sync_failed",
        syncType: "google",
        details: {
          errorMessage: "Token expired",
        },
      });

      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "calendar_sync_failed",
          details: expect.objectContaining({
            errorMessage: "Token expired",
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle audit logging errors gracefully", async () => {
      const errorCtx = {
        runMutation: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      
      const logger = createHIPAAAuditLogger(errorCtx);
      
      // Should not throw
      await expect(
        logger.logCalendarEdit({
          tenantId: "tenant-1",
          userId: "user-123" as any,
          action: "appointment_updated",
          resource: "appointments",
          resourceId: "appt-456",
        })
      ).resolves.not.toThrow();
    });

    it("should include timestamp in all audit logs", async () => {
      const logger = createHIPAAAuditLogger(mockCtx);
      const beforeTime = Date.now();
      
      await logger.logCalendarEdit({
        tenantId: "tenant-1",
        userId: "user-123" as any,
        action: "appointment_updated",
        resource: "appointments",
        resourceId: "appt-456",
      });

      const afterTime = Date.now();
      
      expect(mockRunMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );

      const callArgs = mockRunMutation.mock.calls[0][1];
      expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(callArgs.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});

