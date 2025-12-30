import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Public Provider Profiles Management
 * 
 * Handles management of public-facing provider profiles for the landing page.
 * These are separate from internal provider profiles to control what's visible publicly.
 */

// Get all public profiles for a tenant (admin view)
export const getPublicProfiles = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Sort by display order
    profiles.sort((a, b) => a.displayOrder - b.displayOrder);

    return profiles;
  },
});

// Get available providers to add (not yet having public profiles)
export const getAvailableProviders = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing public profile provider IDs
    const existingProfiles = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const existingProviderIds = new Set(
      existingProfiles.map(p => p.providerProfileId.toString())
    );

    // Get all provider profiles for this tenant
    const providerProfiles = await ctx.db
      .query("providerProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Filter out providers that already have public profiles
    return providerProfiles.filter(
      p => !existingProviderIds.has(p._id.toString())
    );
  },
});

// Create a new public profile
export const createPublicProfile = mutation({
  args: {
    tenantId: v.string(),
    providerProfileId: v.id("providerProfiles"),
    displayName: v.string(),
    title: v.string(),
    bio: v.string(),
    photo: v.optional(v.string()),
    specialties: v.array(v.string()),
    languages: v.optional(v.array(v.string())),
    acceptingNewPatients: v.boolean(),
    bookingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify provider exists
    const provider = await ctx.db.get(args.providerProfileId);
    if (!provider || provider.tenantId !== args.tenantId) {
      throw new Error("Provider not found");
    }

    // Get current max display order
    const existingProfiles = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const maxOrder = existingProfiles.reduce(
      (max, p) => Math.max(max, p.displayOrder), -1
    );

    const profileId = await ctx.db.insert("publicProviderProfiles", {
      tenantId: args.tenantId,
      providerProfileId: args.providerProfileId,
      displayName: args.displayName,
      title: args.title,
      bio: args.bio,
      photo: args.photo,
      specialties: args.specialties,
      languages: args.languages,
      clinicIds: [], // All clinics by default
      acceptingNewPatients: args.acceptingNewPatients,
      displayOrder: maxOrder + 1,
      isPublished: true,
      showOnLandingPage: true,
      bookingEnabled: args.bookingEnabled ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, profileId };
  },
});

// Update a public profile
export const updatePublicProfile = mutation({
  args: {
    profileId: v.id("publicProviderProfiles"),
    displayName: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    photo: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    acceptingNewPatients: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    showOnLandingPage: v.optional(v.boolean()),
    bookingEnabled: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const updates: Partial<typeof profile> = {
      updatedAt: Date.now(),
    };

    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.title !== undefined) updates.title = args.title;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.photo !== undefined) updates.photo = args.photo;
    if (args.specialties !== undefined) updates.specialties = args.specialties;
    if (args.languages !== undefined) updates.languages = args.languages;
    if (args.acceptingNewPatients !== undefined) updates.acceptingNewPatients = args.acceptingNewPatients;
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.showOnLandingPage !== undefined) updates.showOnLandingPage = args.showOnLandingPage;
    if (args.bookingEnabled !== undefined) updates.bookingEnabled = args.bookingEnabled;
    if (args.displayOrder !== undefined) updates.displayOrder = args.displayOrder;

    await ctx.db.patch(args.profileId, updates);

    return { success: true };
  },
});

// Delete a public profile
export const deletePublicProfile = mutation({
  args: {
    profileId: v.id("publicProviderProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.delete(args.profileId);

    return { success: true };
  },
});

// Reorder public profiles
export const reorderPublicProfiles = mutation({
  args: {
    tenantId: v.string(),
    profileIds: v.array(v.id("publicProviderProfiles")),
  },
  handler: async (ctx, args) => {
    // Update display order for each profile
    for (let i = 0; i < args.profileIds.length; i++) {
      const profileId = args.profileIds[i];
      if (!profileId) continue;
      await ctx.db.patch(profileId, {
        displayOrder: i,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Toggle publish status
export const togglePublicProfilePublished = mutation({
  args: {
    profileId: v.id("publicProviderProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(args.profileId, {
      isPublished: !profile.isPublished,
      updatedAt: Date.now(),
    });

    return { success: true, isPublished: !profile.isPublished };
  },
});

/**
 * Get public profile by user ID
 * Traverses: user -> providerProfile -> publicProviderProfile
 * Returns full profile data for preview and public profile status
 */
export const getPublicProfileByUserId = query({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user data for name
    const user = await ctx.db.get(args.userId);
    
    // Find the provider profile for this user
    const providerProfile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!providerProfile) {
      return {
        hasProfile: false,
        userProfile: user ? {
          name: user.name,
          email: user.email,
        } : null,
        profileData: null,
        publicProfile: null,
      };
    }

    // Verify tenant match
    if (providerProfile.tenantId !== args.tenantId) {
      return {
        hasProfile: false,
        userProfile: null,
        profileData: null,
        publicProfile: null,
      };
    }

    // Now find the public profile for this provider
    const publicProfile = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_provider", (q) => q.eq("providerProfileId", providerProfile._id))
      .first();

    // Build display name from profile data
    const title = (providerProfile as any).title || '';
    const firstName = (providerProfile as any).firstName || '';
    const lastName = (providerProfile as any).lastName || '';
    const displayName = [title, firstName, lastName].filter(Boolean).join(' ').trim() || user?.name || 'Unknown';

    return {
      hasProfile: true,
      userProfile: user ? {
        name: user.name,
        email: user.email,
      } : null,
      profileData: {
        _id: providerProfile._id,
        displayName,
        title: title || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        bio: providerProfile.bio,
        photo: providerProfile.professionalPhotoUrl,
        specialties: providerProfile.specialties,
        languages: providerProfile.languages,
        visibility: providerProfile.visibility,
      },
      publicProfile: publicProfile ? {
        _id: publicProfile._id,
        displayName: publicProfile.displayName,
        title: publicProfile.title,
        bio: publicProfile.bio,
        photo: publicProfile.photo,
        specialties: publicProfile.specialties,
        languages: publicProfile.languages,
        acceptingNewPatients: publicProfile.acceptingNewPatients,
        bookingEnabled: publicProfile.bookingEnabled,
        isPublished: publicProfile.isPublished,
        showOnLandingPage: publicProfile.showOnLandingPage,
        displayOrder: publicProfile.displayOrder,
      } : null,
    };
  },
});

/**
 * Create public profile by user ID
 * Automatically pulls data from the user's profile
 */
export const createPublicProfileByUserId = mutation({
  args: {
    userId: v.id("users"),
    tenantId: v.string(),
    acceptingNewPatients: v.boolean(),
    bookingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get user data
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the provider profile for this user
    const providerProfile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!providerProfile) {
      throw new Error("User does not have a profile. Please complete your profile first at Settings → Your Profile.");
    }

    if (providerProfile.tenantId !== args.tenantId) {
      throw new Error("Profile does not belong to this tenant");
    }

    // Check if public profile already exists
    const existingPublicProfile = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_provider", (q) => q.eq("providerProfileId", providerProfile._id))
      .first();

    if (existingPublicProfile) {
      throw new Error("Public profile already exists for this user");
    }

    // Build display name from profile data
    const title = (providerProfile as any).title || '';
    const firstName = (providerProfile as any).firstName || '';
    const lastName = (providerProfile as any).lastName || '';
    const displayName = [title, firstName, lastName].filter(Boolean).join(' ').trim() || user.name || 'Unknown';

    // Get current max display order
    const existingProfiles = await ctx.db
      .query("publicProviderProfiles")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const maxOrder = existingProfiles.reduce(
      (max, p) => Math.max(max, p.displayOrder), -1
    );

    // Use specialties from profile, default to empty array if not set
    const specialties = providerProfile.specialties || [];

    const profileId = await ctx.db.insert("publicProviderProfiles", {
      tenantId: args.tenantId,
      providerProfileId: providerProfile._id,
      displayName,
      title: specialties[0] ?? 'Team Member', // Use first specialty as title
      bio: providerProfile.bio || 'No bio provided',
      photo: providerProfile.professionalPhotoUrl,
      specialties,
      languages: providerProfile.languages,
      clinicIds: [],
      acceptingNewPatients: args.acceptingNewPatients,
      displayOrder: maxOrder + 1,
      isPublished: true,
      showOnLandingPage: true,
      bookingEnabled: args.bookingEnabled ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, profileId };
  },
});

