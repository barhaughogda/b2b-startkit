import { describe, it, expect, beforeEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

describe("Opening Hours", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant";
  let userEmail: string;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();

    // Create a test user for authorization
    const now = Date.now();
    await t.mutation(api.users.createUserMutation, {
      email: "test@example.com",
      name: "Test User",
      role: "admin",
      tenantId,
      passwordHash: "hashed-password",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    userEmail = "test@example.com";
  });

  describe("Company Opening Hours", () => {
    it("should set weekly schedule for company", async () => {
      const schedule = [
        { dayOfWeek: "monday" as const, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "tuesday" as const, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "wednesday" as const, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "thursday" as const, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: "friday" as const, startTime: "09:00", endTime: "17:00" },
      ];

      const result = await t.mutation(api.openingHours.setWeeklySchedule, {
        tenantId,
        userEmail,
        schedule,
      });

      expect(result).toHaveLength(5);

      // Verify the schedule was stored
      const companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      expect(companyHours.recurring).toHaveLength(5);
      expect(companyHours.overrides).toHaveLength(0);
    });

    it("should set individual day opening hours", async () => {
      const id = await t.mutation(api.openingHours.setDayOpeningHours, {
        tenantId,
        userEmail,
        dayOfWeek: "monday",
        startTime: "08:00",
        endTime: "18:00",
      });

      expect(id).toBeDefined();

      const companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      const mondayHours = companyHours.recurring.find((h: any) => h.dayOfWeek === "monday");
      expect(mondayHours).toBeDefined();
      expect(mondayHours?.startTime).toBe("08:00");
      expect(mondayHours?.endTime).toBe("18:00");
    });

    it("should mark a day as closed", async () => {
      await t.mutation(api.openingHours.setDayOpeningHours, {
        tenantId,
        userEmail,
        dayOfWeek: "sunday",
        startTime: "00:00",
        endTime: "00:00",
        isClosed: true,
      });

      const companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      const sundayHours = companyHours.recurring.find((h: any) => h.dayOfWeek === "sunday");
      expect(sundayHours).toBeDefined();
      expect(sundayHours?.isClosed).toBe(true);
    });

    it("should add date-specific override", async () => {
      const overrideDate = "2024-12-25"; // Christmas

      const id = await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        userEmail,
        overrideDate,
        isClosed: true,
      });

      expect(id).toBeDefined();

      const companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      expect(companyHours.overrides).toHaveLength(1);
      expect(companyHours.overrides[0].overrideDate).toBe(overrideDate);
      expect(companyHours.overrides[0].isClosed).toBe(true);
    });

    it("should add date-specific special hours", async () => {
      const overrideDate = "2024-12-24"; // Christmas Eve

      await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        userEmail,
        overrideDate,
        startTime: "09:00",
        endTime: "14:00", // Half day
        isClosed: false,
      });

      const companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      const override = companyHours.overrides.find((h: any) => h.overrideDate === overrideDate);
      expect(override).toBeDefined();
      expect(override?.startTime).toBe("09:00");
      expect(override?.endTime).toBe("14:00");
      expect(override?.isClosed).toBe(false);
    });

    it("should remove date override", async () => {
      const overrideDate = "2024-12-25";

      await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        userEmail,
        overrideDate,
        isClosed: true,
      });

      let companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      expect(companyHours.overrides).toHaveLength(1);

      await t.mutation(api.openingHours.removeDateOverride, {
        tenantId,
        userEmail,
        overrideDate,
      });

      companyHours = await t.query(api.openingHours.getCompanyOpeningHours, { tenantId });
      expect(companyHours.overrides).toHaveLength(0);
    });
  });

  describe("Clinic Opening Hours", () => {
    let clinicId: Id<"clinics">;

    beforeEach(async () => {
      // Create a test clinic
      clinicId = await t.mutation(api.clinics.createClinic, {
        name: "Test Clinic",
        tenantId,
        type: "clinic",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "TS",
          zipCode: "12345",
        },
      });
    });

    it("should set clinic-specific opening hours", async () => {
      await t.mutation(api.openingHours.setDayOpeningHours, {
        tenantId,
        clinicId,
        userEmail,
        dayOfWeek: "monday",
        startTime: "10:00",
        endTime: "19:00",
      });

      const clinicHours = await t.query(api.openingHours.getClinicOpeningHours, {
        tenantId,
        clinicId,
      });

      expect(clinicHours.recurring).toHaveLength(1);
      expect(clinicHours.recurring[0].startTime).toBe("10:00");
      expect(clinicHours.recurring[0].endTime).toBe("19:00");
    });

    it("should check if clinic has custom hours", async () => {
      // Before setting custom hours
      let hasCustom = await t.query(api.openingHours.hasCustomOpeningHours, {
        tenantId,
        clinicId,
      });
      expect(hasCustom).toBe(false);

      // After setting custom hours
      await t.mutation(api.openingHours.setDayOpeningHours, {
        tenantId,
        clinicId,
        userEmail,
        dayOfWeek: "monday",
        startTime: "10:00",
        endTime: "19:00",
      });

      hasCustom = await t.query(api.openingHours.hasCustomOpeningHours, {
        tenantId,
        clinicId,
      });
      expect(hasCustom).toBe(true);
    });

    it("should clear clinic opening hours", async () => {
      // Set some hours
      await t.mutation(api.openingHours.setDayOpeningHours, {
        tenantId,
        clinicId,
        userEmail,
        dayOfWeek: "monday",
        startTime: "10:00",
        endTime: "19:00",
      });

      await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        clinicId,
        userEmail,
        overrideDate: "2024-12-25",
        isClosed: true,
      });

      let clinicHours = await t.query(api.openingHours.getClinicOpeningHours, {
        tenantId,
        clinicId,
      });
      expect(clinicHours.recurring.length + clinicHours.overrides.length).toBe(2);

      // Clear all
      await t.mutation(api.openingHours.clearClinicOpeningHours, {
        tenantId,
        clinicId,
        userEmail,
      });

      clinicHours = await t.query(api.openingHours.getClinicOpeningHours, {
        tenantId,
        clinicId,
      });
      expect(clinicHours.recurring.length + clinicHours.overrides.length).toBe(0);
    });
  });

  describe("Effective Opening Hours (Inheritance)", () => {
    let clinicId: Id<"clinics">;

    beforeEach(async () => {
      // Create a test clinic
      clinicId = await t.mutation(api.clinics.createClinic, {
        name: "Test Clinic",
        tenantId,
        type: "clinic",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "TS",
          zipCode: "12345",
        },
      });

      // Set company default hours
      await t.mutation(api.openingHours.setWeeklySchedule, {
        tenantId,
        userEmail,
        schedule: [
          { dayOfWeek: "monday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "tuesday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "wednesday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "thursday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "friday", startTime: "09:00", endTime: "17:00" },
        ],
      });
    });

    it("should inherit company hours when clinic has none", async () => {
      const effective = await t.query(api.openingHours.getEffectiveOpeningHours, {
        tenantId,
        clinicId,
      });

      expect(effective.source).toBe("company");
      expect(effective.recurring).toHaveLength(5);
      // Check inherited flag
      expect(effective.recurring[0].inherited).toBe(true);
    });

    it("should use clinic hours when clinic has custom schedule", async () => {
      // Set clinic-specific hours
      await t.mutation(api.openingHours.setWeeklySchedule, {
        tenantId,
        clinicId,
        userEmail,
        schedule: [
          { dayOfWeek: "monday", startTime: "10:00", endTime: "18:00" },
          { dayOfWeek: "tuesday", startTime: "10:00", endTime: "18:00" },
        ],
      });

      const effective = await t.query(api.openingHours.getEffectiveOpeningHours, {
        tenantId,
        clinicId,
      });

      expect(effective.source).toBe("clinic");
      expect(effective.recurring).toHaveLength(2);
      expect(effective.recurring[0].startTime).toBe("10:00");
      expect(effective.recurring[0].inherited).toBeUndefined();
    });

    it("should apply clinic override over company override for same date", async () => {
      const overrideDate = "2024-12-25";

      // Company override - closed
      await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        userEmail,
        overrideDate,
        isClosed: true,
      });

      // Clinic override - special hours (open)
      await t.mutation(api.openingHours.addDateOverride, {
        tenantId,
        clinicId,
        userEmail,
        overrideDate,
        startTime: "10:00",
        endTime: "14:00",
        isClosed: false,
      });

      const effective = await t.query(api.openingHours.getEffectiveOpeningHours, {
        tenantId,
        clinicId,
      });

      // Find the override for the date
      const christmasOverride = effective.overrides.find(
        (o: any) => o.overrideDate === overrideDate && !o.inherited
      );
      expect(christmasOverride).toBeDefined();
      expect(christmasOverride?.isClosed).toBe(false);
      expect(christmasOverride?.startTime).toBe("10:00");
    });
  });

  describe("Opening Hours Summary", () => {
    it("should return formatted hours summary", async () => {
      await t.mutation(api.openingHours.setWeeklySchedule, {
        tenantId,
        userEmail,
        schedule: [
          { dayOfWeek: "monday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "tuesday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "wednesday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "thursday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "friday", startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: "saturday", startTime: "10:00", endTime: "14:00" },
          { dayOfWeek: "sunday", startTime: "00:00", endTime: "00:00", isClosed: true },
        ],
      });

      const summary = await t.query(api.openingHours.getOpeningHoursSummary, { tenantId });

      expect(summary).toBeDefined();
      expect(summary?.hasHours).toBe(true);
      expect(summary?.lines).toBeDefined();
      
      // Should group Mon-Fri together
      const monFriLine = summary?.lines.find((l: string) => l.includes("Mon-Fri"));
      expect(monFriLine).toBeDefined();
      expect(monFriLine).toContain("9:00 AM");
      expect(monFriLine).toContain("5:00 PM");

      // Saturday should be separate
      const satLine = summary?.lines.find((l: string) => l.includes("Sat"));
      expect(satLine).toBeDefined();
      expect(satLine).toContain("10:00 AM");
      expect(satLine).toContain("2:00 PM");

      // Sunday should be closed
      const sunLine = summary?.lines.find((l: string) => l.includes("Sun"));
      expect(sunLine).toBeDefined();
      expect(sunLine).toContain("Closed");
    });

    it("should return null when no hours are set", async () => {
      const summary = await t.query(api.openingHours.getOpeningHoursSummary, { 
        tenantId: "no-hours-tenant" 
      });

      expect(summary).toBeNull();
    });
  });
});

