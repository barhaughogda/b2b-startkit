import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new medical record
export const createMedicalRecord = mutation({
  args: {
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    appointmentId: v.optional(v.id("appointments")),
    recordType: v.string(), // 'vitals', 'lab_result', 'medication', 'allergy', 'visit_summary'
    title: v.string(),
    description: v.optional(v.string()),
    data: v.optional(v.any()), // Flexible JSON structure for different record types
    dateRecorded: v.string(), // ISO date string
    status: v.string(), // 'active', 'inactive', 'archived'
    isConfidential: v.boolean(),
    tags: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string()
    }))),
    notes: v.optional(v.string()),
    tenantId: v.string(), // Required for tenant isolation
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("medicalRecords", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get medical record by ID
export const getMedicalRecord = query({
  args: { id: v.id("medicalRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get medical records by patient
export const getMedicalRecordsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Get medical records by provider
export const getMedicalRecordsByProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalRecords")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// Get medical records by appointment
export const getMedicalRecordsByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalRecords")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .collect();
  },
});

// Update medical record
export const updateMedicalRecord = mutation({
  args: {
    id: v.id("medicalRecords"),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    medications: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete medical record
export const deleteMedicalRecord = mutation({
  args: { id: v.id("medicalRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// List all medical records
export const listMedicalRecords = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db.query("medicalRecords").take(limit);
  },
});

// Get medical records by tenant (real-time dashboard)
export const getMedicalRecordsByTenant = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("medicalRecords")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get recent medical records (real-time activity feed)
export const getRecentMedicalRecords = query({
  args: { 
    tenantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    return await ctx.db
      .query("medicalRecords")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(limit);
  },
});

// Get medical record statistics (real-time metrics)
export const getMedicalRecordStats = query({
  args: { 
    tenantId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.startDate || (now - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    const endDate = args.endDate || now;
    
    const records = await ctx.db
      .query("medicalRecords")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startDate),
          q.lte(q.field("createdAt"), endDate)
        )
      )
      .collect();
    
    // Count records with medications
    const withMedications = records.filter(r => r.recordType === 'medication');
    
    // Get unique diagnoses
    const uniqueDiagnoses = Array.from(new Set(records.filter(r => r.recordType === 'diagnosis').map(r => r.title)));
    
    // Get unique treatments
    const uniqueTreatments = Array.from(new Set(records.filter(r => r.recordType === 'treatment').map(r => r.title)));
    
    return {
      total: records.length,
      withMedications: withMedications.length,
      uniqueDiagnoses: uniqueDiagnoses.length,
      uniqueTreatments: uniqueTreatments.length,
      recentRecords: records.filter(r => r.createdAt >= (now - (7 * 24 * 60 * 60 * 1000))).length,
    };
  },
});

// Get medical records by date range (real-time reporting)
export const getMedicalRecordsByDateRange = query({
  args: { 
    tenantId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    patientId: v.optional(v.id("patients")),
    providerId: v.optional(v.id("providers")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("medicalRecords")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      );
    
    if (args.patientId) {
      query = query.filter((q) => q.eq(q.field("patientId"), args.patientId));
    }
    
    if (args.providerId) {
      query = query.filter((q) => q.eq(q.field("providerId"), args.providerId));
    }
    
    return await query.collect();
  },
});

// Get patient health records with provider details
export const getPatientHealthRecords = query({
  args: {
    patientId: v.id("patients"),
    tenantId: v.string(),
    type: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    provider: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("medicalRecords")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("patientId"), args.patientId));
    
    // Filter by type if specified
    if (args.type && args.type !== 'all') {
      // Map API types to record types
      const typeMap: Record<string, string> = {
        'vitals': 'vitals',
        'lab-results': 'lab_result',
        'medications': 'medication',
        'allergies': 'allergy',
        'visit-summaries': 'visit_summary'
      };
      
      const recordType = typeMap[args.type];
      if (recordType) {
        query = query.filter((q) => q.eq(q.field("recordType"), recordType));
      }
    }
    
    // Filter by date range if specified
    if (args.dateFrom) {
      const fromDate = new Date(args.dateFrom).toISOString();
      query = query.filter((q) => q.gte(q.field("dateRecorded"), fromDate));
    }
    
    if (args.dateTo) {
      const toDate = new Date(args.dateTo).toISOString();
      query = query.filter((q) => q.lte(q.field("dateRecorded"), toDate));
    }
    
    const records = await query.collect();
    
    // Get provider details for each record
    const recordsWithProviders = await Promise.all(
      records.map(async (record) => {
        const provider = record.providerId ? await ctx.db.get(record.providerId) : null;
        return {
          ...record,
          providerName: provider ? `${provider.firstName} ${provider.lastName}` : 'Unknown Provider'
        };
      })
    );
    
    return recordsWithProviders;
  },
});
