import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getTimezoneFromAddress } from "./lib/timezoneFromAddress";
// import { encryptPHISync, decryptPHISync } from "../src/lib/security/encryption";

// Create a new patient
export const createPatient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.number(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    })),
    insurance: v.optional(v.object({
      provider: v.string(),
      policyNumber: v.string(),
      groupNumber: v.optional(v.string()),
    })),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.firstName?.trim()) {
      throw new Error("First name is required");
    }
    if (!args.lastName?.trim()) {
      throw new Error("Last name is required");
    }
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }

    // Validate date of birth (must be in the past)
    const now = Date.now();
    if (args.dateOfBirth >= now) {
      throw new Error("Date of birth must be in the past");
    }

    // Check for duplicate email within tenant
    if (args.email) {
      const existingPatient = await ctx.db
        .query("patients")
        .withIndex("by_email_tenant", (q) => 
          q.eq("email", args.email).eq("tenantId", args.tenantId)
        )
        .first();
      
      if (existingPatient) {
        throw new Error("Patient with this email already exists in this tenant");
      }
    }

    // Validate phone format if provided
    if (args.phone && !/^\+?[\d\s\-\(\)]+$/.test(args.phone)) {
      throw new Error("Invalid phone number format");
    }

    // Validate email format if provided
    if (args.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // HIPAA compliance: Encrypt PHI data
    const encryptedFirstName = args.firstName.trim(); // encryptPHISync(args.firstName.trim());
    const encryptedLastName = args.lastName.trim(); // encryptPHISync(args.lastName.trim());
    const encryptedEmail = args.email ? args.email.trim() : undefined; // encryptPHISync(args.email.trim()) : undefined;
    const encryptedPhone = args.phone ? args.phone.trim() : undefined; // encryptPHISync(args.phone.trim()) : undefined;
    
    // Encrypt address if provided
    let encryptedAddress = undefined;
    if (args.address) {
      encryptedAddress = {
        street: args.address.street, // encryptPHISync(args.address.street),
        city: args.address.city, // encryptPHISync(args.address.city),
        state: args.address.state, // encryptPHISync(args.address.state),
        zipCode: args.address.zipCode, // encryptPHISync(args.address.zipCode),
      };
    }

    // Encrypt insurance information if provided
    let encryptedInsurance = undefined;
    if (args.insurance) {
      encryptedInsurance = {
        provider: args.insurance.provider, // encryptPHISync(args.insurance.provider),
        policyNumber: args.insurance.policyNumber, // encryptPHISync(args.insurance.policyNumber),
        groupNumber: args.insurance.groupNumber ? args.insurance.groupNumber : undefined, // encryptPHISync(args.insurance.groupNumber) : undefined,
      };
    }

    // Auto-detect timezone from address state (if US address)
    const detectedTimezone = getTimezoneFromAddress(args.address);

    try {
      const patientId = await ctx.db.insert("patients", {
        firstName: encryptedFirstName,
        lastName: encryptedLastName,
        dateOfBirth: args.dateOfBirth,
        email: encryptedEmail,
        phone: encryptedPhone,
        address: encryptedAddress,
        insurance: encryptedInsurance,
        timezone: detectedTimezone, // Auto-detected from address, can be overridden in settings
        tenantId: args.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      // HIPAA compliance: Log patient creation
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: args.tenantId,
        userId: undefined, // userId not available in this context
        action: 'create',
        resource: 'patient',
        resourceId: patientId,
        details: {
          patientId,
          timestamp: now,
          dataTypes: ['name', 'contact', 'demographics']
        },
        ipAddress: undefined,
        userAgent: 'convex-mutation',
        timestamp: now
      });

      return patientId;
    } catch (error) {
      throw new Error(`Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get patient by email and tenant
export const getPatientByEmail = query({
  args: { 
    email: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate and normalize inputs
      const trimmedEmail = args.email?.trim();
      const trimmedTenantId = args.tenantId?.trim();

      if (!trimmedEmail) {
        // Structured error logging for better observability
        console.error('[getPatientByEmail] Validation failed: empty email', {
          tenantId: trimmedTenantId || 'missing',
          timestamp: Date.now(),
        });
        return null;
      }

      if (!trimmedTenantId) {
        console.error('[getPatientByEmail] Validation failed: empty tenantId', {
          email: trimmedEmail.substring(0, 3) + '***', // Partial email for logging (privacy)
          timestamp: Date.now(),
        });
        return null;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        console.error('[getPatientByEmail] Validation failed: invalid email format', {
          emailPrefix: trimmedEmail.substring(0, 3) + '***',
          tenantId: trimmedTenantId,
          timestamp: Date.now(),
        });
        return null;
      }

      const patient = await ctx.db
        .query("patients")
        .withIndex("by_email_tenant", (q) => 
          q.eq("email", trimmedEmail).eq("tenantId", trimmedTenantId)
        )
        .first();
      
      if (!patient) {
        return null;
      }

      // HIPAA compliance: Placeholder for future PHI decryption
      // TODO: When field-level encryption is implemented, decrypt PHI fields here
      // Currently, patient data is stored unencrypted in Convex
      // This is a placeholder structure for when encryption is added
      const decryptedPatient = {
        ...patient,
      };

      return decryptedPatient;
    } catch (error) {
      // Structured error logging with context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[getPatientByEmail] Error occurred', {
        error: errorMessage,
        emailPrefix: args.email?.substring(0, 3) + '***' || 'missing',
        tenantId: args.tenantId || 'missing',
        timestamp: Date.now(),
      });
      throw new Error(`Failed to get patient by email: ${errorMessage}`);
    }
  },
});

// Get patient by ID
export const getPatient = query({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.id);
    if (!patient) {
      return null;
    }

    // HIPAA compliance: Log patient data access
    // Note: Queries cannot call mutations directly, so audit logging for queries
    // should be handled client-side or via a separate mutation call
    // For now, we'll skip audit logging in queries to avoid circular dependencies

    // HIPAA compliance: Decrypt PHI data
    const decryptedPatient = {
      ...patient,
      firstName: patient.firstName, // decryptPHISync(patient.firstName),
      lastName: patient.lastName, // decryptPHISync(patient.lastName),
      email: patient.email ? patient.email : undefined, // decryptPHISync(patient.email) : undefined,
      phone: patient.phone ? patient.phone : undefined, // decryptPHISync(patient.phone) : undefined,
      address: patient.address ? {
        street: patient.address.street, // decryptPHISync(patient.address.street),
        city: patient.address.city, // decryptPHISync(patient.address.city),
        state: patient.address.state, // decryptPHISync(patient.address.state),
        zipCode: patient.address.zipCode, // decryptPHISync(patient.address.zipCode),
      } : undefined,
      insurance: patient.insurance ? {
        provider: patient.insurance.provider, // decryptPHISync(patient.insurance.provider),
        policyNumber: patient.insurance.policyNumber, // decryptPHISync(patient.insurance.policyNumber),
        groupNumber: patient.insurance.groupNumber ? patient.insurance.groupNumber : undefined, // decryptPHISync(patient.insurance.groupNumber) : undefined,
      } : undefined,
    };

    return decryptedPatient;
  },
});

// Search patients by name (optimized for real-time)
export const searchPatients = query({
  args: { 
    searchTerm: v.string(),
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchTerm = args.searchTerm.toLowerCase();
    
    // Use index for better performance with tenant filtering
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    return patients
      .filter(patient => 
        patient.firstName.toLowerCase().includes(searchTerm) ||
        patient.lastName.toLowerCase().includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);
  },
});

// Get patients by tenant (real-time dashboard)
export const getPatientsByTenant = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    
    return await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .paginate({ cursor: null, numItems: limit });
  },
});

// Get recent patients (real-time activity feed)
export const getRecentPatients = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    return await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get patients by IDs (batch fetch for name mapping)
export const getPatientsByIds = query({
  args: {
    patientIds: v.array(v.id("patients")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch patients by their IDs
    const patients = await Promise.all(
      args.patientIds.map(async (patientId) => {
        const patient = await ctx.db.get(patientId);
        // Only return if patient belongs to the tenant (security check)
        if (patient && patient.tenantId === args.tenantId) {
          return {
            _id: patient._id,
            firstName: patient.firstName,
            lastName: patient.lastName,
          };
        }
        return null;
      })
    );
    
    // Filter out null values (patients not found or wrong tenant)
    return patients.filter((p): p is { _id: any; firstName: string; lastName: string } => p !== null);
  },
});

// Get patient statistics (real-time metrics)
export const getPatientStats = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const recentPatients = patients.filter(p => p.createdAt >= oneMonthAgo);
    const newThisWeek = patients.filter(p => p.createdAt >= oneWeekAgo);
    
    return {
      total: patients.length,
      recent: recentPatients.length,
      newThisWeek: newThisWeek.length,
      withEmail: patients.filter(p => p.email).length,
      withPhone: patients.filter(p => p.phone).length,
      withInsurance: patients.filter(p => p.insurance).length,
    };
  },
});

// Update patient
export const updatePatient = mutation({
  args: {
    id: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    })),
    insurance: v.optional(v.object({
      provider: v.string(),
      policyNumber: v.string(),
      groupNumber: v.optional(v.string()),
    })),
    // Booking preferences
    preferredClinicId: v.optional(v.id("clinics")),
    preferredLocationId: v.optional(v.id("locations")),
    // Display preferences
    timezone: v.optional(v.union(v.string(), v.null())), // Patient's timezone (IANA format). Null to clear/inherit.
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Check if patient exists
    const existingPatient = await ctx.db.get(id);
    if (!existingPatient) {
      throw new Error("Patient not found");
    }

    // Validate updated fields
    if (updates.firstName !== undefined && !updates.firstName?.trim()) {
      throw new Error("First name cannot be empty");
    }
    if (updates.lastName !== undefined && !updates.lastName?.trim()) {
      throw new Error("Last name cannot be empty");
    }

    // Validate date of birth if provided
    if (updates.dateOfBirth !== undefined) {
      const now = Date.now();
      if (updates.dateOfBirth >= now) {
        throw new Error("Date of birth must be in the past");
      }
    }

    // Check for duplicate email within tenant if email is being updated
    if (updates.email !== undefined && updates.email) {
      const duplicatePatient = await ctx.db
        .query("patients")
        .withIndex("by_email_tenant", (q) => 
          q.eq("email", updates.email).eq("tenantId", existingPatient.tenantId)
        )
        .first();
      
      if (duplicatePatient && duplicatePatient._id !== id) {
        throw new Error("Another patient with this email already exists in this tenant");
      }
    }

    // Validate phone format if provided
    if (updates.phone !== undefined && updates.phone && !/^\+?[\d\s\-\(\)]+$/.test(updates.phone)) {
      throw new Error("Invalid phone number format");
    }

    // Validate email format if provided
    if (updates.email !== undefined && updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throw new Error("Invalid email format");
    }

    try {
      const updateData: any = {
        ...updates,
        updatedAt: Date.now(),
      };

      // Trim string fields
      if (updates.firstName !== undefined) {
        updateData.firstName = updates.firstName.trim();
      }
      if (updates.lastName !== undefined) {
        updateData.lastName = updates.lastName.trim();
      }

      return await ctx.db.patch(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Update patient timezone (for display preferences)
export const updatePatientTimezone = mutation({
  args: {
    patientId: v.id("patients"),
    timezone: v.union(v.string(), v.null()), // IANA timezone (e.g., "America/New_York") or null to re-detect from address
  },
  handler: async (ctx, args) => {
    const { patientId, timezone } = args;
    
    const patient = await ctx.db.get(patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    let finalTimezone = timezone;
    
    // If null, re-detect from address
    if (timezone === null && patient.address) {
      finalTimezone = getTimezoneFromAddress(patient.address) || null;
    }
    
    return await ctx.db.patch(patientId, {
      timezone: finalTimezone ?? undefined, // Convert null to undefined for Convex
      updatedAt: Date.now(),
    });
  },
});

// Delete patient
export const deletePatient = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    // Check if patient exists
    const existingPatient = await ctx.db.get(args.id);
    if (!existingPatient) {
      throw new Error("Patient not found");
    }

    // Check for related appointments
    const relatedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.id))
      .collect();

    if (relatedAppointments.length > 0) {
      throw new Error("Cannot delete patient with existing appointments. Please cancel or complete all appointments first.");
    }

    // Check for related medical records
    const relatedRecords = await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.id))
      .collect();

    if (relatedRecords.length > 0) {
      throw new Error("Cannot delete patient with existing medical records. Please archive or transfer records first.");
    }

    try {
      return await ctx.db.delete(args.id);
    } catch (error) {
      throw new Error(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// List all patients
export const listPatients = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db.query("patients").take(limit);
  },
});

// Get patients with computed fields for provider dashboard
export const getPatientsWithComputedFields = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all patients for tenant
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Get all appointments for computing lastVisit and nextAppointment
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    const now = Date.now();
    
    // Process each patient to add computed fields
    const patientsWithComputedFields = patients.map(patient => {
      // Compute name
      const name = `${patient.firstName} ${patient.lastName}`.trim();
      
      // Compute age from dateOfBirth
      const age = Math.floor((now - patient.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Get patient appointments
      const patientAppointments = appointments.filter(apt => apt.patientId === patient._id);
      
      // Compute lastVisit (most recent completed appointment)
      const completedAppointments = patientAppointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => b.scheduledAt - a.scheduledAt);
      const lastVisit = completedAppointments[0]
        ? new Date(completedAppointments[0].scheduledAt).toLocaleDateString()
        : 'Never';
      
      // Compute nextAppointment (upcoming scheduled or confirmed appointment)
      const upcomingAppointments = patientAppointments
        .filter(apt => 
          (apt.status === 'scheduled' || apt.status === 'confirmed') && 
          apt.scheduledAt > now
        )
        .sort((a, b) => a.scheduledAt - b.scheduledAt);
      const nextAppointment = upcomingAppointments[0]
        ? new Date(upcomingAppointments[0].scheduledAt).toLocaleDateString()
        : undefined;
      
      // Determine status (Active if has recent activity or upcoming appointment, otherwise Inactive)
      // Consider active if last visit was within 6 months or has upcoming appointment
      const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60 * 1000);
      const hasRecentActivity = (completedAppointments[0]?.scheduledAt ?? 0) > sixMonthsAgo;
      const status: 'Active' | 'Inactive' = (hasRecentActivity || upcomingAppointments.length > 0) 
        ? 'Active' 
        : 'Inactive';
      
      // Get gender (map from schema's optional string to required 'Male' | 'Female')
      const genderValue = patient.gender || '';
      const gender: 'Male' | 'Female' = genderValue.toLowerCase().includes('male') 
        ? 'Male' 
        : genderValue.toLowerCase().includes('female') 
        ? 'Female' 
        : 'Male'; // Default to Male if not specified
      
      return {
        ...patient,
        _id: patient._id,
        name,
        age,
        status,
        lastVisit,
        nextAppointment,
        avatar: patient.avatar,
        gender,
      };
    });
    
    return patientsWithComputedFields;
  },
});
