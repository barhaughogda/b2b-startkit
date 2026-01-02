import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { verifyPatientAccess } from "./utils/authorization";

// Validators for each profile section data type
const demographicsDataValidator = v.object({
  preferredName: v.optional(v.string()),
  gender: v.optional(v.string()),
  genderIdentity: v.optional(v.string()),
  preferredPronouns: v.optional(v.string()),
  maritalStatus: v.optional(v.string()),
  occupation: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
  race: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  cellPhone: v.optional(v.string()),
  workPhone: v.optional(v.string()),
});

const medicalHistoryDataValidator = v.object({
  chronicConditions: v.optional(v.array(v.object({
    condition: v.string(),
    diagnosisDate: v.string(),
    status: v.string(),
    notes: v.optional(v.string())
  }))),
  surgeries: v.optional(v.array(v.object({
    procedure: v.string(),
    date: v.string(),
    hospital: v.optional(v.string()),
    notes: v.optional(v.string())
  }))),
  hospitalizations: v.optional(v.array(v.object({
    reason: v.string(),
    admissionDate: v.string(),
    dischargeDate: v.string(),
    hospital: v.optional(v.string()),
    notes: v.optional(v.string())
  })))
});

const allergiesDataValidator = v.object({
  medications: v.optional(v.array(v.object({
    substance: v.string(),
    reactionType: v.string(),
    severity: v.string(),
    symptoms: v.string(),
    dateIdentified: v.optional(v.string())
  }))),
  foods: v.optional(v.array(v.object({
    food: v.string(),
    reactionType: v.string(),
    severity: v.string(),
    symptoms: v.string()
  }))),
  environmental: v.optional(v.array(v.object({
    allergen: v.string(),
    reactionType: v.string(),
    severity: v.string(),
    symptoms: v.string()
  }))),
  other: v.optional(v.array(v.object({
    substance: v.string(),
    reactionType: v.string(),
    severity: v.string(),
    symptoms: v.string()
  })))
});

const medicationsDataValidator = v.array(v.object({
  name: v.string(),
  dosage: v.string(),
  frequency: v.string(),
  route: v.string(),
  prescribedBy: v.optional(v.string()),
  startDate: v.string(),
  indication: v.optional(v.string()),
  notes: v.optional(v.string())
}));

const emergencyContactsDataValidator = v.array(v.object({
  name: v.string(),
  relationship: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  isPrimary: v.boolean()
}));

const healthcareProxyDataValidator = v.object({
  name: v.string(),
  relationship: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  documentOnFile: v.boolean()
});

const insuranceDataValidator = v.object({
  primary: v.optional(v.object({
    provider: v.string(),
    policyNumber: v.string(),
    groupNumber: v.optional(v.string()),
    subscriberName: v.string(),
    subscriberDOB: v.optional(v.string()),
    effectiveDate: v.string(),
    employerName: v.optional(v.string())
  })),
  secondary: v.optional(v.object({
    provider: v.string(),
    policyNumber: v.string(),
    groupNumber: v.optional(v.string()),
    subscriberName: v.string()
  })),
  provider: v.optional(v.string()),
  policyNumber: v.optional(v.string()),
  groupNumber: v.optional(v.string())
});

const lifestyleDataValidator = v.object({
  smokingStatus: v.optional(v.string()),
  smokingHistory: v.optional(v.object({
    packsPerDay: v.optional(v.number()),
    yearsSmoked: v.optional(v.number()),
    quitDate: v.optional(v.string())
  })),
  alcoholUse: v.optional(v.string()),
  alcoholDetails: v.optional(v.string()),
  exerciseFrequency: v.optional(v.string()),
  exerciseTypes: v.optional(v.array(v.string())),
  dietaryPatterns: v.optional(v.array(v.string())),
  occupationalExposures: v.optional(v.string())
});

const familyHistoryDataValidator = v.array(v.object({
  relationship: v.string(),
  condition: v.string(),
  ageAtDiagnosis: v.optional(v.number()),
  currentAge: v.optional(v.number()),
  deceased: v.boolean(),
  notes: v.optional(v.string())
}));

const immunizationsDataValidator = v.array(v.object({
  vaccine: v.string(),
  dateAdministered: v.string(),
  lotNumber: v.optional(v.string()),
  administeredBy: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string())
}));

const advanceDirectivesDataValidator = v.object({
  hasLivingWill: v.optional(v.boolean()),
  livingWillDate: v.optional(v.string()),
  hasDNR: v.optional(v.boolean()),
  dnrDate: v.optional(v.string()),
  hasPOLST: v.optional(v.boolean()),
  polstDate: v.optional(v.string()),
  organDonor: v.optional(v.boolean()),
  advanceDirectivesOnFile: v.optional(v.boolean()),
  notes: v.optional(v.string())
});

const socialDeterminantsDataValidator = v.object({
  housingStatus: v.optional(v.string()),
  foodSecurity: v.optional(v.string()),
  transportationAccess: v.optional(v.string()),
  financialStrain: v.optional(v.string())
});

// Union validator for all possible section data types
const profileSectionDataValidator = v.union(
  demographicsDataValidator,
  v.string(), // medicalBio
  medicalHistoryDataValidator,
  allergiesDataValidator,
  medicationsDataValidator,
  emergencyContactsDataValidator,
  healthcareProxyDataValidator,
  insuranceDataValidator,
  lifestyleDataValidator,
  familyHistoryDataValidator,
  immunizationsDataValidator,
  advanceDirectivesDataValidator,
  socialDeterminantsDataValidator
);

// Find patient by email
export const findPatientByEmail = query({
  args: { email: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    // Validate inputs - return null if email is empty or tenantId is missing
    if (!args.email || !args.email.trim() || !args.tenantId || !args.tenantId.trim()) {
      return null;
    }

    try {
      const patient = await ctx.db
        .query("patients")
        .withIndex("by_email_tenant", (q) => 
          q.eq("email", args.email.trim()).eq("tenantId", args.tenantId.trim())
        )
        .first();
      
      return patient?._id || null;
    } catch (error) {
      // Log error for debugging but return null gracefully
      console.error("Error finding patient by email:", error);
      return null;
    }
  },
});

// Get complete patient profile
export const getPatientProfile = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      return null;
    }

    // Note: Audit logging for queries is handled client-side or via mutations
    // Queries are read-only and cannot insert into the database

    return patient;
  },
});

// Update patient profile section
export const updatePatientProfile = mutation({
  args: {
    patientId: v.id("patients"),
    section: v.union(
      v.literal("demographics"),
      v.literal("medicalHistory"),
      v.literal("allergies"),
      v.literal("medications"),
      v.literal("emergencyContacts"),
      v.literal("healthcareProxy"),
      v.literal("insurance"),
      v.literal("lifestyle"),
      v.literal("familyHistory"),
      v.literal("immunizations"),
      v.literal("advanceDirectives"),
      v.literal("socialDeterminants"),
      v.literal("medicalBio")
    ),
    // Data type depends on section - validated using union of all possible section types
    // Runtime type checking in handler ensures data matches expected type for each section
    data: profileSectionDataValidator,
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const now = Date.now();
    const updateData: any = {
      updatedAt: now,
    };

    // Update specific section based on section name
    // Runtime type validation ensures data matches expected type for each section
    switch (args.section) {
      case 'demographics':
        // Demographics expects an object with optional string fields
        if (typeof args.data !== 'object' || args.data === null || Array.isArray(args.data)) {
          throw new Error(`Invalid data type for 'demographics' section: expected object, got ${typeof args.data}`);
        }
        const demographicsData = args.data as Record<string, unknown>;
        if (demographicsData.preferredName !== undefined) updateData.preferredName = demographicsData.preferredName;
        if (demographicsData.gender !== undefined) updateData.gender = demographicsData.gender;
        if (demographicsData.genderIdentity !== undefined) updateData.genderIdentity = demographicsData.genderIdentity;
        if (demographicsData.preferredPronouns !== undefined) updateData.preferredPronouns = demographicsData.preferredPronouns;
        if (demographicsData.maritalStatus !== undefined) updateData.maritalStatus = demographicsData.maritalStatus;
        if (demographicsData.occupation !== undefined) updateData.occupation = demographicsData.occupation;
        if (demographicsData.primaryLanguage !== undefined) updateData.primaryLanguage = demographicsData.primaryLanguage;
        if (demographicsData.race !== undefined) updateData.race = demographicsData.race;
        if (demographicsData.ethnicity !== undefined) updateData.ethnicity = demographicsData.ethnicity;
        if (demographicsData.cellPhone !== undefined) updateData.cellPhone = demographicsData.cellPhone;
        if (demographicsData.workPhone !== undefined) updateData.workPhone = demographicsData.workPhone;
        break;
      
      case 'medicalBio':
        // MedicalBio expects a string
        if (typeof args.data !== 'string') {
          throw new Error(`Invalid data type for 'medicalBio' section: expected string, got ${typeof args.data}`);
        }
        updateData.medicalBio = args.data;
        break;
      
      case 'medicalHistory':
      case 'allergies':
      case 'medications':
      case 'emergencyContacts':
      case 'healthcareProxy':
      case 'insurance':
      case 'lifestyle':
      case 'familyHistory':
      case 'immunizations':
      case 'advanceDirectives':
      case 'socialDeterminants':
        // These sections expect objects or arrays (validated by schema)
        if (typeof args.data !== 'object' || args.data === null) {
          throw new Error(`Invalid data type for '${args.section}' section: expected object or array, got ${typeof args.data}`);
        }
        updateData[args.section] = args.data;
        break;
      
      default:
        throw new Error(`Unknown section: ${args.section}`);
    }

    // Calculate profile completeness
    const sectionsCompleted: string[] = [];
    if (updateData.preferredName || patient.preferredName) sectionsCompleted.push('demographics');
    if (updateData.medicalHistory || patient.medicalHistory) sectionsCompleted.push('medicalHistory');
    if (updateData.allergies || patient.allergies) sectionsCompleted.push('allergies');
    if (updateData.medications || patient.medications) sectionsCompleted.push('medications');
    if (updateData.emergencyContacts || patient.emergencyContacts) sectionsCompleted.push('emergencyContacts');
    if (updateData.healthcareProxy || patient.healthcareProxy) sectionsCompleted.push('healthcareProxy');
    if (updateData.insurance || patient.insurance) sectionsCompleted.push('insurance');
    if (updateData.lifestyle || patient.lifestyle) sectionsCompleted.push('lifestyle');
    if (updateData.familyHistory || patient.familyHistory) sectionsCompleted.push('familyHistory');
    if (updateData.immunizations || patient.immunizations) sectionsCompleted.push('immunizations');
    if (updateData.advanceDirectives || patient.advanceDirectives) sectionsCompleted.push('advanceDirectives');
    if (updateData.medicalBio || patient.medicalBio) sectionsCompleted.push('medicalBio');

    updateData.profileCompleteness = {
      lastUpdated: now,
      sectionsCompleted: sectionsCompleted
    };

    // HIPAA compliance: Log profile update (mutations can call other mutations)
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: patient.tenantId,
      userId: authResult.userId,
      action: 'update',
      resource: 'patient_profile',
      resourceId: args.patientId,
      details: {
        patientId: args.patientId,
        section: args.section,
        timestamp: now,
        dataTypes: [args.section]
      },
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: now
    });

    await ctx.db.patch(args.patientId, updateData);
  },
});

// Add allergy
export const addAllergy = mutation({
  args: {
    patientId: v.id("patients"),
    category: v.string(), // medications, foods, environmental, other
    allergy: v.object({
      substance: v.string(),
      reactionType: v.string(),
      severity: v.string(),
      symptoms: v.string(),
      dateIdentified: v.optional(v.string())
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const allergies = patient.allergies || {
      medications: [],
      foods: [],
      environmental: [],
      other: []
    };

    const categoryArray = allergies[args.category as keyof typeof allergies] as any[];
    if (!Array.isArray(categoryArray)) {
      throw new Error(`Invalid allergy category: ${args.category}`);
    }

    // Check for duplicates
    const duplicate = categoryArray.find(
      (a: any) => a.substance.toLowerCase() === args.allergy.substance.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Allergy to ${args.allergy.substance} already exists`);
    }

    categoryArray.push(args.allergy);

    await ctx.db.patch(args.patientId, {
      allergies: allergies,
      updatedAt: Date.now()
    });
  },
});

// Remove allergy
export const removeAllergy = mutation({
  args: {
    patientId: v.id("patients"),
    category: v.string(),
    index: v.number(),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const allergies = patient.allergies || {
      medications: [],
      foods: [],
      environmental: [],
      other: []
    };

    const categoryArray = allergies[args.category as keyof typeof allergies] as any[];
    if (!Array.isArray(categoryArray)) {
      throw new Error(`Invalid allergy category: ${args.category}`);
    }

    if (args.index < 0 || args.index >= categoryArray.length) {
      throw new Error("Invalid allergy index");
    }

    categoryArray.splice(args.index, 1);

    await ctx.db.patch(args.patientId, {
      allergies: allergies,
      updatedAt: Date.now()
    });
  },
});

// Add medication
export const addMedication = mutation({
  args: {
    patientId: v.id("patients"),
    medication: v.object({
      name: v.string(),
      dosage: v.string(),
      frequency: v.string(),
      route: v.string(),
      prescribedBy: v.optional(v.string()),
      startDate: v.string(),
      indication: v.optional(v.string()),
      notes: v.optional(v.string())
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const medications = patient.medications || [];

    // Check for duplicates
    const duplicate = medications.find(
      (m: any) => m.name.toLowerCase() === args.medication.name.toLowerCase() &&
                  m.dosage === args.medication.dosage
    );
    if (duplicate) {
      throw new Error(`Medication ${args.medication.name} at ${args.medication.dosage} already exists`);
    }

    medications.push(args.medication);

    await ctx.db.patch(args.patientId, {
      medications: medications,
      updatedAt: Date.now()
    });
  },
});

// Update medication
export const updateMedication = mutation({
  args: {
    patientId: v.id("patients"),
    index: v.number(),
    medication: v.object({
      name: v.string(),
      dosage: v.string(),
      frequency: v.string(),
      route: v.string(),
      prescribedBy: v.optional(v.string()),
      startDate: v.string(),
      indication: v.optional(v.string()),
      notes: v.optional(v.string())
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const medications = patient.medications || [];

    if (args.index < 0 || args.index >= medications.length) {
      throw new Error("Invalid medication index");
    }

    medications[args.index] = args.medication;

    await ctx.db.patch(args.patientId, {
      medications: medications,
      updatedAt: Date.now()
    });
  },
});

// Remove medication
export const removeMedication = mutation({
  args: {
    patientId: v.id("patients"),
    index: v.number(),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const medications = patient.medications || [];

    if (args.index < 0 || args.index >= medications.length) {
      throw new Error("Invalid medication index");
    }

    medications.splice(args.index, 1);

    await ctx.db.patch(args.patientId, {
      medications: medications,
      updatedAt: Date.now()
    });
  },
});

// Add emergency contact
export const addEmergencyContact = mutation({
  args: {
    patientId: v.id("patients"),
    contact: v.object({
      name: v.string(),
      relationship: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      isPrimary: v.boolean()
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const contacts = patient.emergencyContacts || [];

    // If this is set as primary, unset other primary contacts
    if (args.contact.isPrimary) {
      contacts.forEach((c: any) => {
        c.isPrimary = false;
      });
    }

    contacts.push(args.contact);

    await ctx.db.patch(args.patientId, {
      emergencyContacts: contacts,
      updatedAt: Date.now()
    });
  },
});

// Remove emergency contact
export const removeEmergencyContact = mutation({
  args: {
    patientId: v.id("patients"),
    index: v.number(),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const contacts = patient.emergencyContacts || [];

    if (args.index < 0 || args.index >= contacts.length) {
      throw new Error("Invalid contact index");
    }

    contacts.splice(args.index, 1);

    await ctx.db.patch(args.patientId, {
      emergencyContacts: contacts,
      updatedAt: Date.now()
    });
  },
});

// Add family history entry
export const addFamilyHistory = mutation({
  args: {
    patientId: v.id("patients"),
    entry: v.object({
      relationship: v.string(),
      condition: v.string(),
      ageAtDiagnosis: v.optional(v.number()),
      currentAge: v.optional(v.number()),
      deceased: v.boolean(),
      notes: v.optional(v.string())
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const familyHistory = patient.familyHistory || [];
    familyHistory.push(args.entry);

    await ctx.db.patch(args.patientId, {
      familyHistory: familyHistory,
      updatedAt: Date.now()
    });
  },
});

// Remove family history entry
export const removeFamilyHistory = mutation({
  args: {
    patientId: v.id("patients"),
    index: v.number(),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const familyHistory = patient.familyHistory || [];

    if (args.index < 0 || args.index >= familyHistory.length) {
      throw new Error("Invalid family history index");
    }

    familyHistory.splice(args.index, 1);

    await ctx.db.patch(args.patientId, {
      familyHistory: familyHistory,
      updatedAt: Date.now()
    });
  },
});

// Add immunization
export const addImmunization = mutation({
  args: {
    patientId: v.id("patients"),
    immunization: v.object({
      vaccine: v.string(),
      dateAdministered: v.string(),
      lotNumber: v.optional(v.string()),
      administeredBy: v.optional(v.string()),
      location: v.optional(v.string()),
      notes: v.optional(v.string())
    }),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const immunizations = patient.immunizations || [];
    immunizations.push(args.immunization);

    await ctx.db.patch(args.patientId, {
      immunizations: immunizations,
      updatedAt: Date.now()
    });
  },
});

// Remove immunization
export const removeImmunization = mutation({
  args: {
    patientId: v.id("patients"),
    index: v.number(),
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const immunizations = patient.immunizations || [];

    if (args.index < 0 || args.index >= immunizations.length) {
      throw new Error("Invalid immunization index");
    }

    immunizations.splice(args.index, 1);

    await ctx.db.patch(args.patientId, {
      immunizations: immunizations,
      updatedAt: Date.now()
    });
  },
});

// Update patient avatar
export const updatePatientAvatar = mutation({
  args: {
    patientId: v.id("patients"),
    avatarUrl: v.string(), // URL to the uploaded avatar image
    userEmail: v.optional(v.string()) // Email of authenticated user (from NextAuth session)
  },
  handler: async (ctx, args) => {
    // Authorization check: Verify user has access to this patient
    const authResult = await verifyPatientAccess(ctx, args.patientId, args.userEmail);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized access");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const now = Date.now();

    // HIPAA compliance: Log profile photo update
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: patient.tenantId,
      userId: authResult.userId,
      action: 'update',
      resource: 'patient_profile',
      resourceId: args.patientId,
      details: {
        patientId: args.patientId,
        section: 'avatar',
        timestamp: now,
        dataTypes: ['avatar']
      },
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: now
    });

    await ctx.db.patch(args.patientId, {
      avatar: args.avatarUrl,
      updatedAt: now
    });
  },
});

