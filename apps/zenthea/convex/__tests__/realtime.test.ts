import { describe, it, expect, beforeEach } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

describe("Real-Time Queries", () => {
  let t: ConvexTestingHelper;
  const tenantId = "test-tenant";

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
  });

  describe("Patient Real-Time Queries", () => {
    it("should get patients by tenant with real-time updates", async () => {
      // Create test patients
      const patient1 = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      const patient2 = await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
      });

      // Test tenant-based query
      const patients = await t.query(api.patients.getPatientsByTenant, { tenantId });
      expect(patients.data).toHaveLength(2);
      expect(patients.data.map(p => p._id)).toContain(patient1);
      expect(patients.data.map(p => p._id)).toContain(patient2);
    });

    it("should get recent patients with real-time updates", async () => {
      // Create test patients
      await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId,
      });

      // Test recent patients query
      const recentPatients = await t.query(api.patients.getRecentPatients, { tenantId });
      expect(recentPatients).toHaveLength(2);
      expect(recentPatients[0].firstName).toBe("Jane"); // Most recent first
    });

    it("should get patient statistics with real-time metrics", async () => {
      // Create test patients with different attributes
      await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        email: "john@example.com",
        phone: "+1-555-123-4567",
        insurance: {
          provider: "Blue Cross",
          policyNumber: "BC123456",
        },
        tenantId,
      });

      await t.mutation(api.patients.createPatient, {
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: new Date("1985-05-15").getTime(),
        email: "jane@example.com",
        tenantId,
      });

      // Test statistics query
      const stats = await t.query(api.patients.getPatientStats, { tenantId });
      expect(stats.total).toBe(2);
      expect(stats.withEmail).toBe(2);
      expect(stats.withPhone).toBe(1);
      expect(stats.withInsurance).toBe(1);
    });

    it("should search patients with tenant isolation", async () => {
      // Create patients in different tenants
      await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId: "tenant-1",
      });

      await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: new Date("1985-05-15").getTime(),
        tenantId: "tenant-2",
      });

      // Test search with tenant isolation
      const searchResults = await t.query(api.patients.searchPatients, { 
        searchTerm: "John", 
        tenantId: "tenant-1" 
      });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].lastName).toBe("Doe");
    });
  });

  describe("Provider Real-Time Queries", () => {
    it("should get providers by tenant with real-time updates", async () => {
      // Create test providers
      const provider1 = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. John",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "john.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      const provider2 = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Doe",
        specialty: "Dermatology",
        email: "jane.doe@example.com",
        licenseNumber: "LIC789012",
        npi: "0987654321",
        tenantId,
      });

      // Test tenant-based query
      const providers = await t.query(api.providers.getProvidersByTenant, { tenantId });
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p._id)).toContain(provider1);
      expect(providers.map(p => p._id)).toContain(provider2);
    });

    it("should get providers by specialty with real-time filtering", async () => {
      // Create providers with different specialties
      await t.mutation(api.providers.createProvider, {
        firstName: "Dr. John",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "john.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Doe",
        specialty: "Dermatology",
        email: "jane.doe@example.com",
        licenseNumber: "LIC789012",
        npi: "0987654321",
        tenantId,
      });

      // Test specialty filtering
      const cardiologists = await t.query(api.providers.getProvidersBySpecialty, { 
        specialty: "Cardiology", 
        tenantId 
      });
      expect(cardiologists).toHaveLength(1);
      expect(cardiologists[0].specialty).toBe("Cardiology");
    });

    it("should get provider statistics with real-time metrics", async () => {
      // Create providers with different specialties
      await t.mutation(api.providers.createProvider, {
        firstName: "Dr. John",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "john.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Doe",
        specialty: "Cardiology",
        email: "jane.doe@example.com",
        licenseNumber: "LIC789012",
        npi: "0987654321",
        tenantId,
      });

      await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Bob",
        lastName: "Johnson",
        specialty: "Dermatology",
        email: "bob.johnson@example.com",
        licenseNumber: "LIC345678",
        npi: "1122334455",
        tenantId,
      });

      // Test statistics query
      const stats = await t.query(api.providers.getProviderStats, { tenantId });
      expect(stats.total).toBe(3);
      expect(stats.specialties).toBe(2);
      expect(stats.specialtyBreakdown.Cardiology).toBe(2);
      expect(stats.specialtyBreakdown.Dermatology).toBe(1);
    });
  });

  describe("Appointment Real-Time Queries", () => {
    let patientId: Id<"patients">;
    let providerId: Id<"providers">;

    beforeEach(async () => {
      // Create test patient
      patientId = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      // Create test provider
      providerId = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "jane.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });
    });

    it("should get today's appointments with real-time updates", async () => {
      const now = Date.now();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0); // 10 AM today

      // Create today's appointment
      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: today.getTime(),
        duration: 30,
        type: "consultation",
        tenantId,
      });

      // Test today's appointments query
      const todaysAppointments = await t.query(api.appointments.getTodaysAppointments, { 
        tenantId 
      });
      expect(todaysAppointments).toHaveLength(1);
      expect(todaysAppointments[0].type).toBe("consultation");
    });

    it("should get upcoming appointments with real-time updates", async () => {
      const now = Date.now();
      const tomorrow = now + (24 * 60 * 60 * 1000);

      // Create upcoming appointment
      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: tomorrow,
        duration: 30,
        type: "consultation",
        tenantId,
      });

      // Test upcoming appointments query
      const upcomingAppointments = await t.query(api.appointments.getUpcomingAppointments, { 
        tenantId 
      });
      expect(upcomingAppointments).toHaveLength(1);
      expect(upcomingAppointments[0].type).toBe("consultation");
    });

    it("should get appointment statistics with real-time metrics", async () => {
      const now = Date.now();
      const tomorrow = now + (24 * 60 * 60 * 1000);

      // Create appointments with different statuses
      const appointment1 = await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: tomorrow,
        duration: 30,
        type: "consultation",
        tenantId,
      });

      await t.mutation(api.appointments.updateAppointmentStatus, {
        id: appointment1,
        status: "confirmed",
      });

      // Test statistics query
      const stats = await t.query(api.appointments.getAppointmentStats, { tenantId });
      expect(stats.total).toBe(1);
      expect(stats.confirmed).toBe(1);
      expect(stats.scheduled).toBe(0);
    });

    it("should get appointment calendar data with real-time updates", async () => {
      const now = Date.now();
      const tomorrow = now + (24 * 60 * 60 * 1000);
      const dayAfter = now + (2 * 24 * 60 * 60 * 1000);

      // Create appointments on different days
      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: tomorrow,
        duration: 30,
        type: "consultation",
        tenantId,
      });

      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: dayAfter,
        duration: 60,
        type: "procedure",
        tenantId,
      });

      // Test calendar query
      const calendarData = await t.query(api.appointments.getAppointmentCalendar, {
        tenantId,
        startDate: now,
        endDate: now + (7 * 24 * 60 * 60 * 1000),
      });

      expect(Object.keys(calendarData)).toHaveLength(2);
      expect(calendarData[new Date(tomorrow).toDateString()]).toHaveLength(1);
      expect(calendarData[new Date(dayAfter).toDateString()]).toHaveLength(1);
    });
  });

  describe("Dashboard Real-Time Queries", () => {
    it("should get comprehensive dashboard data with real-time updates", async () => {
      // Create test data
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      const providerId = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "jane.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      const appointmentId = await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: Date.now() + (24 * 60 * 60 * 1000),
        duration: 30,
        type: "consultation",
        tenantId,
      });

      await t.mutation(api.medicalRecords.createMedicalRecord, {
        patientId,
        providerId,
        appointmentId,
        diagnosis: "Hypertension",
        treatment: "Lifestyle modifications",
        tenantId,
      });

      // Test dashboard query
      const dashboardData = await t.query(api.dashboard.getDashboardData, { tenantId });
      
      expect(dashboardData.tenantId).toBe(tenantId);
      expect(dashboardData.stats.patients.total).toBe(1);
      expect(dashboardData.stats.providers.total).toBe(1);
      expect(dashboardData.stats.appointments.total).toBe(1);
      expect(dashboardData.stats.medicalRecords.total).toBe(1);
      expect(dashboardData.activityFeed).toHaveLength(4); // 4 activities
    });

    it("should get real-time notifications", async () => {
      const now = Date.now();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0);

      // Create patient and provider
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      const providerId = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "jane.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      // Create today's appointment
      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: today.getTime(),
        duration: 30,
        type: "consultation",
        tenantId,
      });

      // Test notifications query
      const notifications = await t.query(api.dashboard.getNotifications, { tenantId });
      
      expect(notifications.tenantId).toBe(tenantId);
      expect(notifications.notifications.length).toBeGreaterThan(0);
      expect(notifications.notifications[0].type).toBe("info");
    });

    it("should get real-time analytics data", async () => {
      const now = Date.now();
      const startDate = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = now;

      // Create test data
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01").getTime(),
        tenantId,
      });

      const providerId = await t.mutation(api.providers.createProvider, {
        firstName: "Dr. Jane",
        lastName: "Smith",
        specialty: "Cardiology",
        email: "jane.smith@example.com",
        licenseNumber: "LIC123456",
        npi: "1234567890",
        tenantId,
      });

      await t.mutation(api.appointments.createAppointment, {
        patientId,
        providerId,
        scheduledAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
        duration: 30,
        type: "consultation",
        tenantId,
      });

      // Test analytics query
      const analytics = await t.query(api.dashboard.getAnalytics, { 
        tenantId,
        startDate,
        endDate,
      });
      
      expect(analytics.tenantId).toBe(tenantId);
      expect(analytics.totals.newPatients).toBe(1);
      expect(analytics.totals.appointments).toBe(1);
      expect(analytics.dailyMetrics.length).toBeGreaterThan(0);
    });
  });
});
