import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Public Landing Page Queries
 * 
 * These queries are used to fetch tenant data for public-facing landing pages.
 * They do not require authentication and only return publicly-safe information.
 */

// Get tenant by URL slug (for path-based routing: zenthea.ai/clinic/[slug])
export const getTenantBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!tenant) {
      return null;
    }

    // Return only public-safe information
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      description: tenant.description,
      type: tenant.type,
      branding: {
        logo: tenant.branding.logo,
        primaryColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor,
        accentColor: tenant.branding.accentColor,
        favicon: tenant.branding.favicon,
      },
      contactInfo: {
        phone: tenant.contactInfo.phone,
        email: tenant.contactInfo.email,
        address: tenant.contactInfo.address,
        website: tenant.contactInfo.website,
      },
      landingPage: tenant.landingPage,
      // Website Builder configuration (only return if published)
      websiteBuilder: tenant.websiteBuilder?.publishedAt ? {
        version: tenant.websiteBuilder.version,
        siteStructure: tenant.websiteBuilder.siteStructure || 'multi-page', // Default for backwards compat
        templateId: tenant.websiteBuilder.templateId, // Deprecated but kept for compat
        header: tenant.websiteBuilder.header,
        footer: tenant.websiteBuilder.footer,
        theme: tenant.websiteBuilder.theme,
        blocks: tenant.websiteBuilder.blocks,
        pages: tenant.websiteBuilder.pages, // Include pages for multi-page navigation
        seo: tenant.websiteBuilder.seo,
        publishedAt: tenant.websiteBuilder.publishedAt,
      } : undefined,
      bookingSettings: tenant.bookingSettings ? {
        mode: tenant.bookingSettings.mode,
        appointmentTypes: tenant.bookingSettings.appointmentTypes?.filter(t => t.enabled && t.allowOnline !== false),
        welcomeMessage: tenant.bookingSettings.welcomeMessage,
        confirmationMessage: tenant.bookingSettings.confirmationMessage,
        requirePhone: tenant.bookingSettings.requirePhone,
        requireInsurance: tenant.bookingSettings.requireInsurance,
        requireDateOfBirth: tenant.bookingSettings.requireDateOfBirth,
        advanceBookingDays: tenant.bookingSettings.advanceBookingDays,
        minimumNoticeHours: tenant.bookingSettings.minimumNoticeHours,
      } : undefined,
      features: {
        onlineScheduling: tenant.features.onlineScheduling,
        telehealth: tenant.features.telehealth,
        patientPortal: tenant.features.patientPortal,
      },
    };
  },
});

// Get tenant by subdomain (for subdomain routing: [subdomain].zenthea.ai)
export const getTenantBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("domains.subdomain", args.subdomain))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!tenant) {
      return null;
    }

    // Return only public-safe information (same as getTenantBySlug)
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      description: tenant.description,
      type: tenant.type,
      branding: {
        logo: tenant.branding.logo,
        primaryColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor,
        accentColor: tenant.branding.accentColor,
        favicon: tenant.branding.favicon,
      },
      contactInfo: {
        phone: tenant.contactInfo.phone,
        email: tenant.contactInfo.email,
        address: tenant.contactInfo.address,
        website: tenant.contactInfo.website,
      },
      landingPage: tenant.landingPage,
      // Website Builder configuration (only return if published)
      websiteBuilder: tenant.websiteBuilder?.publishedAt ? {
        version: tenant.websiteBuilder.version,
        siteStructure: tenant.websiteBuilder.siteStructure || 'multi-page', // Default for backwards compat
        templateId: tenant.websiteBuilder.templateId, // Deprecated but kept for compat
        header: tenant.websiteBuilder.header,
        footer: tenant.websiteBuilder.footer,
        theme: tenant.websiteBuilder.theme,
        blocks: tenant.websiteBuilder.blocks,
        pages: tenant.websiteBuilder.pages, // Include pages for multi-page navigation
        seo: tenant.websiteBuilder.seo,
        publishedAt: tenant.websiteBuilder.publishedAt,
      } : undefined,
      bookingSettings: tenant.bookingSettings ? {
        mode: tenant.bookingSettings.mode,
        appointmentTypes: tenant.bookingSettings.appointmentTypes?.filter(t => t.enabled && t.allowOnline !== false),
        welcomeMessage: tenant.bookingSettings.welcomeMessage,
        confirmationMessage: tenant.bookingSettings.confirmationMessage,
        requirePhone: tenant.bookingSettings.requirePhone,
        requireInsurance: tenant.bookingSettings.requireInsurance,
        requireDateOfBirth: tenant.bookingSettings.requireDateOfBirth,
        advanceBookingDays: tenant.bookingSettings.advanceBookingDays,
        minimumNoticeHours: tenant.bookingSettings.minimumNoticeHours,
      } : undefined,
      features: {
        onlineScheduling: tenant.features.onlineScheduling,
        telehealth: tenant.features.telehealth,
        patientPortal: tenant.features.patientPortal,
      },
    };
  },
});

// Get tenant by custom domain (for custom domain routing: portal.acmeclinic.com)
export const getTenantByCustomDomain = query({
  args: { customDomain: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_custom_domain", (q) => q.eq("domains.customDomain", args.customDomain))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("domains.customDomainVerified"), true)
        )
      )
      .first();

    if (!tenant) {
      return null;
    }

    // Return only public-safe information (same as getTenantBySlug)
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tagline: tenant.tagline,
      description: tenant.description,
      type: tenant.type,
      branding: {
        logo: tenant.branding.logo,
        primaryColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor,
        accentColor: tenant.branding.accentColor,
        favicon: tenant.branding.favicon,
      },
      contactInfo: {
        phone: tenant.contactInfo.phone,
        email: tenant.contactInfo.email,
        address: tenant.contactInfo.address,
        website: tenant.contactInfo.website,
      },
      landingPage: tenant.landingPage,
      // Website Builder configuration (only return if published)
      websiteBuilder: tenant.websiteBuilder?.publishedAt ? {
        version: tenant.websiteBuilder.version,
        siteStructure: tenant.websiteBuilder.siteStructure || 'multi-page', // Default for backwards compat
        templateId: tenant.websiteBuilder.templateId, // Deprecated but kept for compat
        header: tenant.websiteBuilder.header,
        footer: tenant.websiteBuilder.footer,
        theme: tenant.websiteBuilder.theme,
        blocks: tenant.websiteBuilder.blocks,
        pages: tenant.websiteBuilder.pages, // Include pages for multi-page navigation
        seo: tenant.websiteBuilder.seo,
        publishedAt: tenant.websiteBuilder.publishedAt,
      } : undefined,
      bookingSettings: tenant.bookingSettings ? {
        mode: tenant.bookingSettings.mode,
        appointmentTypes: tenant.bookingSettings.appointmentTypes?.filter(t => t.enabled && t.allowOnline !== false),
        welcomeMessage: tenant.bookingSettings.welcomeMessage,
        confirmationMessage: tenant.bookingSettings.confirmationMessage,
        requirePhone: tenant.bookingSettings.requirePhone,
        requireInsurance: tenant.bookingSettings.requireInsurance,
        requireDateOfBirth: tenant.bookingSettings.requireDateOfBirth,
        advanceBookingDays: tenant.bookingSettings.advanceBookingDays,
        minimumNoticeHours: tenant.bookingSettings.minimumNoticeHours,
      } : undefined,
      features: {
        onlineScheduling: tenant.features.onlineScheduling,
        telehealth: tenant.features.telehealth,
        patientPortal: tenant.features.patientPortal,
      },
    };
  },
});

// Get public provider profiles for a tenant (care team section)
export const getPublicProviderProfiles = query({
  args: { 
    tenantId: v.string(),
    clinicId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant_published", (q) => 
        q.eq("tenantId", args.tenantId).eq("isPublished", true)
      );

    const profiles = await query.collect();

    // Filter by clinic if specified
    let filtered = profiles;
    if (args.clinicId) {
      filtered = profiles.filter(p => 
        p.clinicIds.length === 0 || p.clinicIds.includes(args.clinicId!)
      );
    }

    // Sort by display order
    filtered.sort((a, b) => a.displayOrder - b.displayOrder);

    // Apply limit if specified
    if (args.limit && args.limit > 0) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered.map(profile => ({
      _id: profile._id,
      displayName: profile.displayName,
      title: profile.title,
      bio: profile.bio,
      photo: profile.photo,
      specialties: profile.specialties,
      languages: profile.languages,
      education: profile.education,
      certifications: profile.certifications,
      acceptingNewPatients: profile.acceptingNewPatients,
      bookingEnabled: profile.bookingEnabled,
    }));
  },
});

// Get single public provider profile
export const getPublicProviderProfile = query({
  args: { 
    profileId: v.id("publicProviderProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || !profile.isPublished) {
      return null;
    }

    return {
      _id: profile._id,
      tenantId: profile.tenantId,
      displayName: profile.displayName,
      title: profile.title,
      bio: profile.bio,
      photo: profile.photo,
      specialties: profile.specialties,
      languages: profile.languages,
      education: profile.education,
      certifications: profile.certifications,
      acceptingNewPatients: profile.acceptingNewPatients,
      bookingEnabled: profile.bookingEnabled,
      clinicIds: profile.clinicIds,
    };
  },
});

/**
 * Get booking-enabled providers for public booking flow
 * Returns provider profiles with user IDs for availability lookup
 * Used by PublicBookingWizard to select providers and check availability
 */
export const getBookingProviders = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get published public provider profiles with booking enabled
    const publicProfiles = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant_published", (q) => 
        q.eq("tenantId", args.tenantId).eq("isPublished", true)
      )
      .collect();

    // Filter to only booking-enabled providers
    const bookableProfiles = publicProfiles.filter(p => p.bookingEnabled !== false);

    // Sort by display order
    bookableProfiles.sort((a, b) => a.displayOrder - b.displayOrder);

    // Fetch providerProfiles to get user IDs and actual clinic assignments
    const providersWithUserIds = await Promise.all(
      bookableProfiles.map(async (publicProfile) => {
        const providerProfile = await ctx.db.get(publicProfile.providerProfileId);
        const userId = providerProfile?.userId;
        
        // Get user's actual clinic assignments (for availability lookup)
        // This is different from publicProfile.clinicIds which is for display visibility
        let userClinicIds: string[] = [];
        if (userId) {
          const user = await ctx.db.get(userId);
          userClinicIds = user?.clinics ?? [];
        }
        
        return {
          _id: publicProfile._id,
          displayName: publicProfile.displayName,
          title: publicProfile.title,
          bio: publicProfile.bio,
          photo: publicProfile.photo,
          specialties: publicProfile.specialties,
          languages: publicProfile.languages,
          acceptingNewPatients: publicProfile.acceptingNewPatients,
          bookingEnabled: publicProfile.bookingEnabled,
          clinicIds: userClinicIds.length > 0 ? userClinicIds : publicProfile.clinicIds, // Use user's actual clinics, fallback to display clinics
          // Include userId for availability lookup
          userId: userId || null,
          providerProfileId: publicProfile.providerProfileId,
          // Include providerId from providerProfile for appointment creation
          providerId: providerProfile?.providerId || null,
        };
      })
    );

    return providersWithUserIds;
  },
});

// Get public clinics for a tenant (clinic locations section)
export const getPublicClinics = query({
  args: { 
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get tenant first to get basic location from contactInfo
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      return [];
    }

    // Get clinics for this tenant
    const clinics = await ctx.db
      .query("clinics")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // If no clinics defined, return tenant's main location as a single clinic
    if (clinics.length === 0) {
      return [{
        id: tenant.id,
        name: tenant.name,
        address: tenant.contactInfo.address,
        phone: tenant.contactInfo.phone,
        email: tenant.contactInfo.email,
        website: tenant.contactInfo.website,
        isMainLocation: true,
      }];
    }

    return clinics.map(clinic => ({
      id: clinic._id,
      name: clinic.name,
      address: clinic.address,
      isMainLocation: false,
    }));
  },
});

// Check if a tenant exists and has landing page enabled
export const checkTenantLandingPage = query({
  args: { 
    slug: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tenant = null;

    // Try custom domain first (highest priority)
    if (args.customDomain) {
      tenant = await ctx.db
        .query("tenants")
        .withIndex("by_custom_domain", (q) => q.eq("domains.customDomain", args.customDomain))
        .first();
    }
    
    // Try subdomain next
    if (!tenant && args.subdomain) {
      tenant = await ctx.db
        .query("tenants")
        .withIndex("by_subdomain", (q) => q.eq("domains.subdomain", args.subdomain))
        .first();
    }
    
    // Finally try slug
    if (!tenant && args.slug) {
      tenant = await ctx.db
        .query("tenants")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    }

    if (!tenant) {
      return { exists: false, landingPageEnabled: false, slug: null };
    }

    return {
      exists: true,
      landingPageEnabled: tenant.landingPage?.enabled ?? false,
      slug: tenant.slug,
      tenantId: tenant.id,
      status: tenant.status,
    };
  },
});

// List all tenants for tenant selector (main login page)
export const listTenantsForSelector = query({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db
      .query("tenants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo: tenant.branding.logo,
      domains: tenant.domains,
    }));
  },
});

/**
 * Get full provider profile for public modal display
 * 
 * Fetches the linked providerProfile data for rich content display in the provider detail modal.
 * Returns visibility-filtered data appropriate for public viewers.
 */
export const getPublicProviderFullProfile = query({
  args: { 
    publicProfileId: v.id("publicProviderProfiles"),
  },
  handler: async (ctx, args) => {
    // Get the public profile first
    const publicProfile = await ctx.db.get(args.publicProfileId);

    if (!publicProfile || !publicProfile.isPublished) {
      return null;
    }

    // Get the linked provider profile for rich content
    const providerProfile = await ctx.db.get(publicProfile.providerProfileId);

    if (!providerProfile) {
      // Return just the public profile data if provider profile not found
      return {
        _id: publicProfile._id,
        tenantId: publicProfile.tenantId,
        displayName: publicProfile.displayName,
        title: publicProfile.title,
        bio: publicProfile.bio,
        photo: publicProfile.photo,
        specialties: publicProfile.specialties,
        languages: publicProfile.languages || [],
        education: publicProfile.education || [],
        certifications: publicProfile.certifications || [],
        acceptingNewPatients: publicProfile.acceptingNewPatients,
        bookingEnabled: publicProfile.bookingEnabled,
        // No rich content available
        detailedBio: undefined,
        philosophyOfCare: undefined,
        communicationStyle: undefined,
        whyIBecameADoctor: undefined,
        introductionVideoUrl: undefined,
        introductionVideoThumbnail: undefined,
        introductionVideoTranscript: undefined,
        boardCertifications: [],
        conditionsTreated: [],
        proceduresPerformed: [],
        hospitalAffiliations: [],
        insuranceAccepted: [],
        isVerified: false,
      };
    }

    // Get the user info for display name
    const user = providerProfile.userId 
      ? await ctx.db.get(providerProfile.userId)
      : null;

    // Get visibility settings or use defaults
    const visibility = providerProfile.visibility || {
      npi: 'private',
      licenseNumber: 'private',
      specialties: 'public',
      boardCertifications: 'public',
      education: 'public',
      certifications: 'public',
      bio: 'public',
      detailedBio: 'public', // Changed to public for full experience
      philosophyOfCare: 'public', // Changed to public for full experience
      communicationStyle: 'public', // Changed to public for full experience
      whyIBecameADoctor: 'public', // Changed to public for full experience
      languages: 'public',
      personalInterests: 'portal',
      communityInvolvement: 'portal',
      professionalPhoto: 'public',
      introductionVideo: 'public', // Changed to public for full experience
      hospitalAffiliations: 'public',
      insuranceAccepted: 'public',
      conditionsTreated: 'public',
      proceduresPerformed: 'public',
      researchInterests: 'public',
      publications: 'public',
      testimonials: 'portal',
    };

    // Helper to check visibility for public viewers
    const isPubliclyVisible = (field: string) => {
      const v = visibility[field as keyof typeof visibility];
      return v === 'public';
    };

    // Build response with visibility filtering for public viewers
    return {
      _id: publicProfile._id,
      tenantId: publicProfile.tenantId,
      providerProfileId: publicProfile.providerProfileId,
      
      // Basic info from public profile
      displayName: publicProfile.displayName,
      title: publicProfile.title,
      bio: publicProfile.bio,
      photo: publicProfile.photo || providerProfile.professionalPhotoUrl,
      specialties: publicProfile.specialties,
      languages: publicProfile.languages || providerProfile.languages || [],
      education: publicProfile.education || providerProfile.education || [],
      certifications: publicProfile.certifications || providerProfile.certifications || [],
      acceptingNewPatients: publicProfile.acceptingNewPatients,
      bookingEnabled: publicProfile.bookingEnabled,
      
      // Rich content from provider profile (visibility filtered)
      detailedBio: isPubliclyVisible('detailedBio') ? providerProfile.detailedBio : undefined,
      philosophyOfCare: isPubliclyVisible('philosophyOfCare') ? providerProfile.philosophyOfCare : undefined,
      communicationStyle: isPubliclyVisible('communicationStyle') ? providerProfile.communicationStyle : undefined,
      whyIBecameADoctor: isPubliclyVisible('whyIBecameADoctor') ? providerProfile.whyIBecameADoctor : undefined,
      
      // Video content
      introductionVideoUrl: isPubliclyVisible('introductionVideo') ? providerProfile.introductionVideoUrl : undefined,
      introductionVideoThumbnail: isPubliclyVisible('introductionVideo') ? providerProfile.introductionVideoThumbnail : undefined,
      introductionVideoTranscript: isPubliclyVisible('introductionVideo') ? providerProfile.introductionVideoTranscript : undefined,
      
      // Credentials
      boardCertifications: isPubliclyVisible('boardCertifications') ? providerProfile.boardCertifications || [] : [],
      
      // Practice details
      conditionsTreated: isPubliclyVisible('conditionsTreated') ? providerProfile.conditionsTreated || [] : [],
      proceduresPerformed: isPubliclyVisible('proceduresPerformed') ? providerProfile.proceduresPerformed || [] : [],
      hospitalAffiliations: isPubliclyVisible('hospitalAffiliations') ? providerProfile.hospitalAffiliations || [] : [],
      insuranceAccepted: isPubliclyVisible('insuranceAccepted') ? providerProfile.insuranceAccepted || [] : [],
      
      // User info
      firstName: user?.firstName,
      lastName: user?.lastName,
      
      // Status
      isVerified: providerProfile.isVerified || false,
    };
  },
});

