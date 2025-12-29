import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current logo URL for a tenant
 */
export const getLogo = query({
  args: { tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // For now, we'll use a default tenant ID since this is for the public marketing site
    // In a multi-tenant setup, you'd get this from the user's session
    const tenantId = args.tenantId || "default";
    
    try {
      const tenant = await ctx.db
        .query("tenants")
        .withIndex("by_tenant_id", (q) => q.eq("id", tenantId))
        .first();
      
      if (tenant?.branding?.logo) {
        return {
          success: true,
          url: tenant.branding.logo,
          isManual: true,
          message: "Using manually set logo"
        };
      }
      
      // Return default logo if no custom logo is set
      return {
        success: true,
        url: "https://dbbi79w6g08cf.cloudfront.net/images/logo/zenthea-logo.png",
        isManual: false,
        message: "Using default logo"
      };
    } catch (error) {
      console.error("Error getting logo:", error);
      return {
        success: false,
        url: "https://dbbi79w6g08cf.cloudfront.net/images/logo/zenthea-logo.png",
        isManual: false,
        message: "Error getting logo, using default"
      };
    }
  },
});

/**
 * Set the logo URL for a tenant
 */
export const setLogo = mutation({
  args: { 
    url: v.string(),
    tenantId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId || "default";
    
    try {
      // Validate URL format
      new URL(args.url);
      
      // Check if tenant exists
      let tenant = await ctx.db
        .query("tenants")
        .withIndex("by_tenant_id", (q) => q.eq("id", tenantId))
        .first();
      
      if (!tenant) {
        // Create a default tenant if it doesn't exist
        const now = Date.now();
        const newTenantId = await ctx.db.insert("tenants", {
          id: tenantId,
          name: "Default Tenant",
          type: "clinic" as const,
          status: "active" as const,
          subscription: {
            plan: "demo" as const,
            status: "active" as const,
            startDate: new Date().toISOString(),
            maxUsers: 10,
            maxPatients: 100
          },
          branding: {
            logo: args.url,
            primaryColor: "#5FBFAF",
            secondaryColor: "#5F284A"
          },
          contactInfo: {
            phone: "",
            email: "",
            address: {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: ""
            }
          },
          features: {
            onlineScheduling: true,
            telehealth: true,
            prescriptionRefills: true,
            labResults: true,
            messaging: true,
            billing: true,
            patientPortal: true,
            mobileApp: true
          },
          settings: {
            timezone: "UTC",
            dateFormat: "MM/DD/YYYY",
            timeFormat: "12h",
            currency: "USD",
            language: "en",
            appointmentDuration: 30,
            reminderSettings: {
              email: true,
              sms: false,
              phone: false,
              advanceNoticeHours: 24
            }
          },
          createdAt: now,
          updatedAt: now
        });
        
        // Get the created tenant
        tenant = await ctx.db.get(newTenantId);
      } else {
        // Update existing tenant's logo
        await ctx.db.patch(tenant._id, {
          branding: {
            ...tenant.branding,
            logo: args.url
          },
          updatedAt: Date.now()
        });
      }
      
      console.log("Logo set successfully:", args.url);
      
      return {
        success: true,
        url: args.url,
        message: "Logo set successfully"
      };
    } catch (error) {
      console.error("Error setting logo:", error);
      throw new Error("Failed to set logo");
    }
  },
});

/**
 * Clear the custom logo (revert to default)
 */
export const clearLogo = mutation({
  args: { tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId || "default";
    
    try {
      const tenant = await ctx.db
        .query("tenants")
        .withIndex("by_tenant_id", (q) => q.eq("id", tenantId))
        .first();
      
      if (tenant) {
        await ctx.db.patch(tenant._id, {
          branding: {
            ...tenant.branding,
            logo: undefined
          },
          updatedAt: Date.now()
        });
      }
      
      return {
        success: true,
        message: "Logo cleared successfully"
      };
    } catch (error) {
      console.error("Error clearing logo:", error);
      throw new Error("Failed to clear logo");
    }
  },
});
