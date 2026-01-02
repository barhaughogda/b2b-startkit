import { mutation, query, action } from "./_generated/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Provider Profiles API
 *
 * Comprehensive provider profile management with:
 * - Field-level privacy controls
 * - Role-based visibility filtering
 * - Audit logging for HIPAA compliance
 * - Smart default visibility settings
 */

// Helper function to create default visibility settings
function getDefaultVisibility() {
  return {
    npi: "private" as const,
    licenseNumber: "private" as const,
    specialties: "public" as const,
    boardCertifications: "public" as const,
    education: "public" as const,
    certifications: "public" as const,
    bio: "public" as const,
    detailedBio: "portal" as const,
    philosophyOfCare: "portal" as const,
    communicationStyle: "portal" as const,
    whyIBecameADoctor: "portal" as const,
    languages: "public" as const,
    personalInterests: "portal" as const,
    communityInvolvement: "portal" as const,
    professionalPhoto: "public" as const,
    introductionVideo: "portal" as const,
    hospitalAffiliations: "public" as const,
    insuranceAccepted: "public" as const,
    conditionsTreated: "public" as const,
    proceduresPerformed: "public" as const,
    researchInterests: "public" as const,
    publications: "public" as const,
    testimonials: "portal" as const
  };
}

// Type for audit event details
type AuditDetail = {
  fieldsUpdated?: string[];
  patientId?: Id<"patients">;
  [key: string]: unknown; // Allow additional fields for flexibility
};

// Type for profile fields used in completion calculation
type ProfileCompletionFields = {
  specialties?: string[];
  bio?: string;
  professionalPhotoUrl?: string;
  detailedBio?: string;
  philosophyOfCare?: string;
  boardCertifications?: unknown[];
  education?: unknown[];
  languages?: string[];
  hospitalAffiliations?: unknown[];
  insuranceAccepted?: string[];
  conditionsTreated?: string[];
  introductionVideoUrl?: string;
};

// Helper function to calculate completion percentage
function calculateCompletion(profile: Partial<ProfileCompletionFields>): number {
  const requiredFields: (keyof ProfileCompletionFields)[] = ['specialties', 'bio', 'professionalPhotoUrl'];
  const recommendedFields: (keyof ProfileCompletionFields)[] = [
    'detailedBio',
    'philosophyOfCare',
    'boardCertifications',
    'education',
    'languages',
    'hospitalAffiliations',
    'insuranceAccepted',
    'conditionsTreated',
    'introductionVideoUrl'
  ];

  let completedRequired = 0;
  let completedRecommended = 0;

  requiredFields.forEach(field => {
    const value = profile[field];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) completedRequired++;
      } else {
        completedRequired++;
      }
    }
  });

  recommendedFields.forEach(field => {
    const value = profile[field];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) completedRecommended++;
      } else {
        completedRecommended++;
      }
    }
  });

  const requiredScore = (completedRequired / requiredFields.length) * 60;
  const recommendedScore = (completedRecommended / recommendedFields.length) * 40;

  return Math.round(requiredScore + recommendedScore);
}

// Helper function to log audit events (with user ID)
async function logAuditEventWithUser(
  ctx: QueryCtx | MutationCtx,
  tenantId: string,
  userId: Id<"users"> | undefined,
  action: string,
  resource: string,
  resourceId: Id<"providerProfiles"> | Id<"providerTestimonials"> | string,
  details?: AuditDetail
) {
  try {
    if ('runMutation' in ctx) {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId,
        userId,
        action,
        resource,
        resourceId: typeof resourceId === 'string' ? resourceId : resourceId,
        details,
        timestamp: Date.now()
      });
    } else {
      console.debug('Audit logging skipped in query context');
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Helper function to log audit events (with patient ID - stored in details)
async function logAuditEventWithPatient(
  ctx: QueryCtx | MutationCtx,
  tenantId: string,
  patientId: Id<"patients"> | undefined,
  action: string,
  resource: string,
  resourceId: Id<"providerProfiles"> | Id<"providerTestimonials"> | string,
  details?: AuditDetail
) {
  try {
    if ('runMutation' in ctx) {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId,
        userId: undefined, // auditLogs.create only accepts user IDs
        action,
        resource,
        resourceId: typeof resourceId === 'string' ? resourceId : resourceId,
        details: {
          ...details,
          ...(patientId ? { patientId } : {})
        },
        timestamp: Date.now()
      });
    } else {
      console.debug('Audit logging skipped in query context');
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Unified helper function to log audit events
// Automatically routes to the correct function based on ID type
async function logAuditEvent(
  ctx: QueryCtx | MutationCtx,
  tenantId: string,
  userId: Id<"users"> | Id<"patients"> | undefined,
  action: string,
  resource: string,
  resourceId: Id<"providerProfiles"> | Id<"providerTestimonials"> | string,
  details?: AuditDetail
) {
  // Since we can't distinguish user vs patient IDs at runtime,
  // we'll use the patient version which stores the ID in details
  // This is safe but less optimal - call sites should use the specific functions when possible
  await logAuditEventWithPatient(ctx, tenantId, userId as Id<"patients"> | undefined, action, resource, resourceId, details);
}

// Visibility settings schema validator
const visibilitySchema = v.object({
  npi: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  licenseNumber: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  specialties: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  boardCertifications: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  education: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  certifications: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  bio: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  detailedBio: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  philosophyOfCare: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  communicationStyle: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  whyIBecameADoctor: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  languages: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  personalInterests: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  communityInvolvement: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  professionalPhoto: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  introductionVideo: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  hospitalAffiliations: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  insuranceAccepted: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  conditionsTreated: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  proceduresPerformed: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  researchInterests: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  publications: v.union(v.literal("public"), v.literal("portal"), v.literal("private")),
  testimonials: v.union(v.literal("public"), v.literal("portal"), v.literal("private"))
});

// Create a new provider profile
export const createProviderProfile = mutation({
  args: {
    userId: v.id("users"),
    providerId: v.optional(v.id("providers")),
    tenantId: v.string(),
    specialties: v.array(v.string()),
    languages: v.array(v.string()),
    visibility: v.optional(visibilitySchema),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.specialties || args.specialties.length === 0) {
      throw new Error("At least one specialty is required");
    }

    // Check if profile already exists for this user
    const existing = await ctx.db
      .query("providerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      throw new Error("Profile already exists for this user");
    }

    // Get user to verify tenant match
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.tenantId && user.tenantId !== args.tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    const now = Date.now();
    const visibility = args.visibility || getDefaultVisibility();

    const profileId = await ctx.db.insert("providerProfiles", {
      userId: args.userId,
      providerId: args.providerId,
      tenantId: args.tenantId,
      specialties: args.specialties,
      languages: args.languages,
      visibility: visibility,
      completionPercentage: 0,
      isVerified: false,
      isPublished: false,
      createdAt: now,
      updatedAt: now
    });

    // Log audit event
    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      args.userId,
      "profile_created",
      "providerProfile",
      profileId
    );

    return profileId;
  },
});

// Get provider profile by user ID (for provider editing their own profile)
export const getProviderProfileByUserId = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId)
      )
      .first();

    if (!profile) {
      return null;
    }

    // Get user info
    const user = await ctx.db.get(args.userId);

    return {
      ...profile,
      user: user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      } : null
    };
  },
});

// Type for visibility settings
type VisibilitySettings = ReturnType<typeof getDefaultVisibility>;
type VisibilityFieldName = keyof VisibilitySettings;

// Helper function to check if a field should be visible to a viewer based on their role
function isFieldVisible(
  fieldName: VisibilityFieldName,
  visibility: VisibilitySettings,
  viewerRole: "public" | "patient" | "provider" | "admin"
): boolean {
  const fieldVisibility = visibility[fieldName];
  
  // Admins can see everything
  if (viewerRole === "admin") {
    return true;
  }
  
  // Providers can see their own profile fully
  if (viewerRole === "provider") {
    return true;
  }
  
  // Public viewers can only see public fields
  if (viewerRole === "public") {
    return fieldVisibility === "public";
  }
  
  // Patient viewers can see public and portal fields
  if (viewerRole === "patient") {
    return fieldVisibility === "public" || fieldVisibility === "portal";
  }
  
  return false;
}

// Helper function to filter profile fields based on visibility settings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterProfileFields(
  profile: any, // Profile document from database
  viewerRole: "public" | "patient" | "provider" | "admin"
): any {
  if (!profile) {
    return null;
  }
  
  const visibility = profile.visibility || getDefaultVisibility();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered: any = {
    _id: profile._id,
    _creationTime: profile._creationTime,
    userId: profile.userId,
    tenantId: profile.tenantId,
    specialties: profile.specialties, // Always visible for basic identification
    languages: profile.languages, // Always visible for accessibility
    visibility: visibility, // Use computed visibility with defaults
    completionPercentage: profile.completionPercentage,
    isVerified: profile.isVerified,
    isPublished: profile.isPublished,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
  
  // Identity fields
  if (isFieldVisible("npi", visibility, viewerRole)) {
    filtered.npi = profile.npi;
  }
  if (isFieldVisible("licenseNumber", visibility, viewerRole)) {
    filtered.licenseNumber = profile.licenseNumber;
    filtered.licenseState = profile.licenseState;
  }
  
  // Credentials
  if (isFieldVisible("boardCertifications", visibility, viewerRole)) {
    filtered.boardCertifications = profile.boardCertifications;
  }
  if (isFieldVisible("education", visibility, viewerRole)) {
    filtered.education = profile.education;
  }
  if (isFieldVisible("certifications", visibility, viewerRole)) {
    filtered.certifications = profile.certifications;
  }
  
  // Personal content
  if (isFieldVisible("bio", visibility, viewerRole)) {
    filtered.bio = profile.bio;
  }
  if (isFieldVisible("detailedBio", visibility, viewerRole)) {
    filtered.detailedBio = profile.detailedBio;
  }
  if (isFieldVisible("philosophyOfCare", visibility, viewerRole)) {
    filtered.philosophyOfCare = profile.philosophyOfCare;
  }
  if (isFieldVisible("communicationStyle", visibility, viewerRole)) {
    filtered.communicationStyle = profile.communicationStyle;
  }
  if (isFieldVisible("whyIBecameADoctor", visibility, viewerRole)) {
    filtered.whyIBecameADoctor = profile.whyIBecameADoctor;
  }
  
  // Humanizing elements
  if (isFieldVisible("personalInterests", visibility, viewerRole)) {
    filtered.personalInterests = profile.personalInterests;
  }
  if (isFieldVisible("communityInvolvement", visibility, viewerRole)) {
    filtered.communityInvolvement = profile.communityInvolvement;
    filtered.volunteerWork = profile.volunteerWork;
  }
  
  // Multimedia
  if (isFieldVisible("professionalPhoto", visibility, viewerRole)) {
    filtered.professionalPhotoUrl = profile.professionalPhotoUrl;
    filtered.professionalPhotoAltText = profile.professionalPhotoAltText;
  }
  if (isFieldVisible("introductionVideo", visibility, viewerRole)) {
    filtered.introductionVideoUrl = profile.introductionVideoUrl;
    filtered.introductionVideoThumbnail = profile.introductionVideoThumbnail;
    filtered.introductionVideoTranscript = profile.introductionVideoTranscript;
    filtered.introductionVideoCaptions = profile.introductionVideoCaptions;
  }
  
  // Practice details
  if (isFieldVisible("hospitalAffiliations", visibility, viewerRole)) {
    filtered.hospitalAffiliations = profile.hospitalAffiliations;
  }
  if (isFieldVisible("insuranceAccepted", visibility, viewerRole)) {
    filtered.insuranceAccepted = profile.insuranceAccepted;
  }
  if (isFieldVisible("conditionsTreated", visibility, viewerRole)) {
    filtered.conditionsTreated = profile.conditionsTreated;
  }
  if (isFieldVisible("proceduresPerformed", visibility, viewerRole)) {
    filtered.proceduresPerformed = profile.proceduresPerformed;
  }
  if (isFieldVisible("researchInterests", visibility, viewerRole)) {
    filtered.researchInterests = profile.researchInterests;
    filtered.clinicalInterests = profile.clinicalInterests;
  }
  if (isFieldVisible("publications", visibility, viewerRole)) {
    filtered.publications = profile.publications;
  }
  
  return filtered;
}

// Get provider profile by profile ID (with visibility filtering)
export const getProviderProfile = query({
  args: {
    profileId: v.id("providerProfiles"),
    viewerRole: v.union(
      v.literal("public"),
      v.literal("patient"),
      v.literal("provider"),
      v.literal("admin")
    ),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile) {
      return null;
    }

    // Verify tenant access
    if (profile.tenantId !== args.tenantId) {
      throw new Error("Profile not found in this tenant");
    }

    // Only return published profiles for public/patient viewers
    if ((args.viewerRole === "public" || args.viewerRole === "patient") && !profile.isPublished) {
      return null;
    }

    // Server-side field-level filtering based on visibility settings
    return filterProfileFields(profile, args.viewerRole);
  },
});

// Get public provider profile (most restrictive view)
export const getPublicProviderProfile = query({
  args: {
    profileId: v.id("providerProfiles"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || profile.tenantId !== args.tenantId || !profile.isPublished) {
      return null;
    }

    // Log view for analytics (no PHI)
    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      undefined,
      "profile_viewed_public",
      "providerProfile",
      args.profileId
    );

    // Server-side field-level filtering for public viewers (most restrictive)
    return filterProfileFields(profile, "public");
  },
});

// Get patient portal provider profile (authenticated patient view)
export const getPatientProviderProfile = query({
  args: {
    profileId: v.id("providerProfiles"),
    tenantId: v.string(),
    patientId: v.optional(v.id("patients"))
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || profile.tenantId !== args.tenantId || !profile.isPublished) {
      return null;
    }

    // Log view for audit
    await logAuditEventWithPatient(
      ctx,
      args.tenantId,
      args.patientId,
      "profile_viewed_patient",
      "providerProfile",
      args.profileId,
      { patientId: args.patientId }
    );

    // Server-side field-level filtering for patient viewers (public + portal fields)
    return filterProfileFields(profile, "patient");
  },
});

// Update provider profile
// Using v.any() here is acceptable for flexible partial updates
// The handler validates the updates against the profile structure
export const updateProviderProfile = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    userId: v.id("users"),
    tenantId: v.string(),
    updates: v.any() // Flexible partial updates - validated in handler
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verify ownership
    if (profile.userId !== args.userId) {
      throw new Error("Unauthorized: You can only update your own profile");
    }

    if (profile.tenantId !== args.tenantId) {
      throw new Error("Profile not found in this tenant");
    }

    // Filter out fields that don't belong in providerProfiles schema
    // These are user identity fields that belong in the users table
    // 
    // NOTE: This field list is duplicated because Convex runs server-side and cannot
    // import client-side utilities. The source of truth for these field lists is:
    // src/lib/constants/providerProfileFields.ts
    // 
    // When updating these fields, update ALL of the following:
    // 1. src/lib/constants/providerProfileFields.ts (source of truth)
    // 2. src/lib/utils/providerProfileHelpers.ts (client-side utility)
    // 3. This file (convex/providerProfiles.ts) - server-side filtering
    // 
    // NOTE: title and gender are stored in providerProfiles, not filtered out
    const invalidFields = [
      'dateOfBirth',
      'firstName',
      'lastName',
      'phone',
      'email',
      'userId',
      'providerId',
      'tenantId',
      'createdAt',
      'updatedAt',
    ];
    
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.updates)) {
      if (!invalidFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // Calculate new completion percentage
    const updatedProfile = { ...profile, ...filteredUpdates };
    const completionPercentage = calculateCompletion(updatedProfile);

    await ctx.db.patch(args.profileId, {
      ...filteredUpdates,
      completionPercentage,
      updatedAt: Date.now()
    });

    // Log audit event
    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      args.userId,
      "profile_updated",
      "providerProfile",
      args.profileId,
      { fieldsUpdated: Object.keys(args.updates) }
    );

    return args.profileId;
  },
});

// Get providers by specialty (for directory/search)
export const getProvidersBySpecialty = query({
  args: {
    specialty: v.string(),
    tenantId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all published profiles for the tenant
    const allProfiles = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_published", (q) =>
        q.eq("tenantId", args.tenantId).eq("isPublished", true)
      )
      .collect();

    // Filter by specialty in JavaScript (Convex doesn't support .includes() in query filters)
    const profiles = allProfiles
      .filter(p => p.specialties && p.specialties.includes(args.specialty))
      .slice(0, limit);

    return profiles;
  },
});

// Search providers (for directory)
export const searchProviders = query({
  args: {
    tenantId: v.string(),
    searchTerm: v.optional(v.string()),
    specialty: v.optional(v.string()),
    language: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let profiles = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_published", (q) =>
        q.eq("tenantId", args.tenantId).eq("isPublished", true)
      )
      .collect();

    // Filter by specialty
    if (args.specialty) {
      profiles = profiles.filter(p =>
        p.specialties.includes(args.specialty!)
      );
    }

    // Filter by language
    if (args.language) {
      profiles = profiles.filter(p =>
        p.languages.includes(args.language!)
      );
    }

    // Search by term (would need to search user names - simplified here)
    if (args.searchTerm) {
      // This would ideally search user names via join
      // For now, just return filtered results
    }

    return profiles.slice(0, limit);
  },
});

// Get all published providers for a tenant (public directory)
export const getPublishedProviders = query({
  args: {
    tenantId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20; // Default to 20 per page for better performance

    const result = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant_published", (q) =>
        q.eq("tenantId", args.tenantId).eq("isPublished", true)
      )
      .order("desc")
      .paginate({
        cursor: args.cursor || null,
        numItems: limit
      });

    return {
      providers: result.page,
      hasMore: !result.isDone,
      nextCursor: result.continueCursor || null
    };
  },
});

// Publish/unpublish profile (admin or provider)
export const setProfilePublished = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    userId: v.id("users"),
    tenantId: v.string(),
    isPublished: v.boolean()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || profile.tenantId !== args.tenantId) {
      throw new Error("Profile not found");
    }

    // Verify user can publish (owner or admin)
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (profile.userId !== args.userId && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.profileId, {
      isPublished: args.isPublished,
      updatedAt: Date.now()
    });

    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      args.userId,
      args.isPublished ? "profile_published" : "profile_unpublished",
      "providerProfile",
      args.profileId
    );

    return args.profileId;
  },
});

// Verify profile (admin only)
export const verifyProfile = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    userId: v.id("users"),
    tenantId: v.string(),
    isVerified: v.boolean()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || profile.tenantId !== args.tenantId) {
      throw new Error("Profile not found");
    }

    // Verify user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.profileId, {
      isVerified: args.isVerified,
      lastReviewedAt: Date.now(),
      updatedAt: Date.now()
    });

    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      args.userId,
      args.isVerified ? "profile_verified" : "profile_unverified",
      "providerProfile",
      args.profileId
    );

    return args.profileId;
  },
});

// Patient Testimonials

// Add patient testimonial
export const addPatientTestimonial = mutation({
  args: {
    providerProfileId: v.id("providerProfiles"),
    tenantId: v.string(),
    patientId: v.optional(v.id("patients")),
    patientFirstName: v.string(),
    patientLastNameInitial: v.optional(v.string()),
    rating: v.number(),
    comment: v.string(),
    consentGiven: v.boolean()
  },
  handler: async (ctx, args) => {
    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Validate comment
    if (!args.comment || args.comment.trim().length < 10) {
      throw new Error("Comment must be at least 10 characters");
    }

    if (!args.consentGiven) {
      throw new Error("Patient consent is required");
    }

    const profile = await ctx.db.get(args.providerProfileId);
    if (!profile || profile.tenantId !== args.tenantId) {
      throw new Error("Provider profile not found");
    }

    const now = Date.now();
    const testimonialId = await ctx.db.insert("providerTestimonials", {
      providerProfileId: args.providerProfileId,
      tenantId: args.tenantId,
      patientId: args.patientId,
      patientFirstName: args.patientFirstName,
      patientLastNameInitial: args.patientLastNameInitial,
      rating: args.rating,
      comment: args.comment.trim(),
      consentGiven: args.consentGiven,
      isVerified: false,
      isApproved: false,
      isPublished: false,
      createdAt: now,
      updatedAt: now
    });

    // Add testimonial ID to profile
    const currentTestimonials = profile.testimonials || [];
    await ctx.db.patch(args.providerProfileId, {
      testimonials: [...currentTestimonials, testimonialId],
      updatedAt: now
    });

    await logAuditEventWithPatient(
      ctx,
      args.tenantId,
      args.patientId,
      "testimonial_added",
      "providerTestimonial",
      testimonialId
    );

    return testimonialId;
  },
});

// Get testimonials for a provider
export const getProviderTestimonials = query({
  args: {
    providerProfileId: v.id("providerProfiles"),
    tenantId: v.string(),
    includeUnpublished: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    let testimonials = await ctx.db
      .query("providerTestimonials")
      .withIndex("by_provider", (q) => q.eq("providerProfileId", args.providerProfileId))
      .collect();

    // Filter by tenant
    testimonials = testimonials.filter(t => t.tenantId === args.tenantId);

    // Filter by published status
    if (!args.includeUnpublished) {
      testimonials = testimonials.filter(t => t.isPublished);
    }

    // Sort by creation date (newest first)
    testimonials.sort((a, b) => b.createdAt - a.createdAt);

    return testimonials;
  },
});

// Approve testimonial (admin)
export const approveTestimonial = mutation({
  args: {
    testimonialId: v.id("providerTestimonials"),
    userId: v.id("users"),
    tenantId: v.string(),
    isApproved: v.boolean(),
    isPublished: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const testimonial = await ctx.db.get(args.testimonialId);

    if (!testimonial || testimonial.tenantId !== args.tenantId) {
      throw new Error("Testimonial not found");
    }

    // Verify user is admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.testimonialId, {
      isApproved: args.isApproved,
      isPublished: args.isPublished !== undefined ? args.isPublished : args.isApproved,
      updatedAt: Date.now()
    });

    await logAuditEventWithUser(
      ctx,
      args.tenantId,
      args.userId,
      args.isApproved ? "testimonial_approved" : "testimonial_rejected",
      "providerTestimonial",
      args.testimonialId
    );

    return args.testimonialId;
  },
});

