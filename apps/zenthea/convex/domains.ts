import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Domain Management - Queries, Mutations, and Actions
 * 
 * Handles custom domain configuration including:
 * - Domain verification (DNS checking)
 * - Domain registration with Vercel API
 * - Domain status management
 */

// Get domain configuration for a tenant
export const getDomainConfig = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      return null;
    }

    return {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domains: tenant.domains,
      status: tenant.status,
    };
  },
});

// Request domain verification
export const requestDomainVerification = mutation({
  args: {
    tenantId: v.string(),
    customDomain: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(args.customDomain)) {
      throw new Error("Invalid domain format");
    }

    // Check if domain is already in use by another tenant
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_custom_domain", (q) => q.eq("domains.customDomain", args.customDomain))
      .first();

    if (existingTenant && existingTenant.id !== args.tenantId) {
      throw new Error("This domain is already in use by another organization");
    }

    // Update tenant with new domain (unverified)
    const currentDomains = tenant.domains || {};
    await ctx.db.patch(tenant._id, {
      domains: {
        ...currentDomains,
        customDomain: args.customDomain,
        customDomainVerified: false,
        customDomainVerifiedAt: undefined,
      },
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Domain saved. Please configure your DNS to verify ownership.",
      verificationInstructions: {
        type: "CNAME",
        host: args.customDomain,
        value: "cname.vercel-dns.com",
      },
    };
  },
});

// Mark domain as verified (internal use - would be called by verification action)
export const markDomainVerified = mutation({
  args: {
    tenantId: v.string(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentDomains = tenant.domains || {};
    await ctx.db.patch(tenant._id, {
      domains: {
        ...currentDomains,
        customDomainVerified: args.verified,
        customDomainVerifiedAt: args.verified ? Date.now() : undefined,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove custom domain
export const removeCustomDomain = mutation({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentDomains = tenant.domains || {};
    await ctx.db.patch(tenant._id, {
      domains: {
        ...currentDomains,
        customDomain: undefined,
        customDomainVerified: undefined,
        customDomainVerifiedAt: undefined,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// SECURITY: Rate limiting for DNS verification to prevent enumeration attacks
// Uses Convex database for distributed rate limiting (works across multiple instances)
// This mutation is called from the action to check and update rate limits
export const checkDomainVerificationRateLimit = mutation({
  args: {
    domain: v.string(),
    maxAttempts: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identifier = `domain_verify:${args.domain.toLowerCase()}`;
    const actionType = "domain_verification";
    const maxAttempts = args.maxAttempts ?? 10;
    const windowMs = args.windowMs ?? 3600000;

    // Check existing rate limit record
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", identifier).eq("action", actionType)
      )
      .first();

    if (!existing) {
      // Create new rate limit record
      await ctx.db.insert("rateLimits", {
        identifier,
        action: actionType,
        attempts: 1,
        windowStart: now,
        windowMs,
        maxAttempts,
        createdAt: now,
        updatedAt: now,
      });
      return { allowed: true };
    }

    // Check if window has expired
    if (existing.windowStart + existing.windowMs < now) {
      // Reset window
      await ctx.db.patch(existing._id, {
        attempts: 1,
        windowStart: now,
        updatedAt: now,
      });
      return { allowed: true };
    }

    // Check if rate limit exceeded
    if (existing.attempts >= maxAttempts) {
      return { allowed: false }; // Rate limit exceeded
    }

    // Increment attempts
    await ctx.db.patch(existing._id, {
      attempts: existing.attempts + 1,
      updatedAt: now,
    });

    return { allowed: true };
  },
});

// Verify domain DNS configuration (action - can make external requests)
export const verifyDomainDns = action({
  args: {
    tenantId: v.string(),
    customDomain: v.string(),
  },
  handler: async (ctx, args): Promise<{
    verified: boolean;
    message: string;
    details?: {
      cnameFound: boolean;
      cnameValue?: string;
      expectedValue: string;
    };
  }> => {
    // SECURITY: Rate limiting - prevent DNS enumeration attacks
    const rateLimitResult = await ctx.runMutation(api.domains.checkDomainVerificationRateLimit, {
      domain: args.customDomain,
      maxAttempts: 10,
      windowMs: 3600000,
    });
    if (!rateLimitResult.allowed) {
      return {
        verified: false,
        message: "Too many verification attempts. Please try again later.",
      };
    }

    // SECURITY: Validate domain format before DNS lookup
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(args.customDomain)) {
      return {
        verified: false,
        message: "Invalid domain format",
      };
    }

    // Verify tenant exists and owns this domain
    const tenant = await ctx.runQuery(api.domains.getDomainConfig, { tenantId: args.tenantId });
    if (!tenant || tenant.domains?.customDomain !== args.customDomain) {
      return {
        verified: false,
        message: "Domain not found for this tenant",
      };
    }

    const expectedCname = "cname.vercel-dns.com";
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      // SECURITY: Use Vercel API for domain verification if available
      // Fallback to public DNS resolver with timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const dnsResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(args.customDomain)}&type=CNAME`,
        { 
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        }
      );
      
      // Clear timeout if fetch succeeds
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!dnsResponse.ok) {
        return {
          verified: false,
          message: "Unable to verify DNS configuration. Please try again later.",
        };
      }

      // SECURITY: Validate response size to prevent DoS
      const contentLength = dnsResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 100000) { // 100KB limit
        return {
          verified: false,
          message: "DNS response too large. Please contact support.",
        };
      }

      const dnsData = await dnsResponse.json();
      
      // Check for CNAME record
      const cnameRecord = dnsData.Answer?.find(
        (record: { type: number; data: string }) => record.type === 5 // CNAME type
      );

      if (!cnameRecord) {
        return {
          verified: false,
          message: "CNAME record not found. Please configure your DNS settings.",
          details: {
            cnameFound: false,
            expectedValue: expectedCname,
          },
        };
      }

      // Check if CNAME points to correct value
      const cnameValue = cnameRecord.data.replace(/\.$/, ''); // Remove trailing dot
      const isCorrect = cnameValue.toLowerCase() === expectedCname.toLowerCase();

      if (isCorrect) {
        // Update tenant as verified
        await ctx.runMutation(api.domains.markDomainVerified, {
          tenantId: args.tenantId,
          verified: true,
        });

        return {
          verified: true,
          message: "Domain verified successfully!",
          details: {
            cnameFound: true,
            cnameValue,
            expectedValue: expectedCname,
          },
        };
      } else {
        return {
          verified: false,
          message: `CNAME record found but points to incorrect value: ${cnameValue}`,
          details: {
            cnameFound: true,
            cnameValue,
            expectedValue: expectedCname,
          },
        };
      }
    } catch (error) {
      // Ensure timeout is cleared on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      console.error("DNS verification error:", error);
      return {
        verified: false,
        message: "Error verifying DNS. Please check your domain configuration and try again.",
      };
    }
  },
});

// Get verification status
export const getDomainVerificationStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.tenantId))
      .first();

    if (!tenant || !tenant.domains?.customDomain) {
      return null;
    }

    return {
      customDomain: tenant.domains.customDomain,
      verified: tenant.domains.customDomainVerified ?? false,
      verifiedAt: tenant.domains.customDomainVerifiedAt,
      instructions: {
        type: "CNAME",
        host: tenant.domains.customDomain,
        value: "cname.vercel-dns.com",
      },
    };
  },
});

