import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tenant-settings
 * Returns current tenant settings including branding, features, subscription, and contact info
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const tenantId = authResult.tenantId;

    // Query Convex for full tenant data
    const tenant = await convex.query(api.tenants.getTenantData, {
      tenantId,
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: "Tenant not found",
        },
        { status: 404 }
      );
    }

    // Return formatted tenant settings
    return NextResponse.json(
      {
        success: true,
        data: tenant,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error fetching tenant settings:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenant settings",
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tenant-settings
 * Updates tenant settings including branding, features, and contact info
 * Subscription management is not allowed - tenant admins cannot change subscription
 * Requires admin role
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authorization
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const tenantId = authResult.tenantId;

    // Parse request body
    const body = await request.json();
    const {
      branding,
      features,
      subscription,
      contactInfo,
    } = body;

    // Reject subscription updates - tenant admins cannot change subscription
    if (subscription) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Subscription management is not available. Please contact support to change your subscription.",
        },
        { status: 403 }
      );
    }

    // Validate settings
    const validationErrors = validateTenantSettings(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    const results: any = {};

    // Update branding if provided
    if (branding) {
      const updatedBranding = await convex.mutation(
        api.tenants.updateTenantBranding,
        {
          tenantId,
          branding,
        }
      );
      results.branding = updatedBranding;
    }

    // Update features if provided
    if (features) {
      const updatedFeatures = await convex.mutation(
        api.tenants.updateTenantFeatures,
        {
          tenantId,
          features,
        }
      );
      results.features = updatedFeatures;
    }

    // Update contact info if provided
    if (contactInfo) {
      const updatedContactInfo = await convex.mutation(
        api.tenants.updateTenantContactInfo,
        {
          tenantId,
          contactInfo,
        }
      );
      results.contactInfo = updatedContactInfo;
    }

    // Note: Basic tenant info (name, type, status) updates would require
    // a separate mutation if needed. For now, we focus on settings that
    // are commonly changed through the admin interface.

    return NextResponse.json(
      {
        success: true,
        data: results,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error updating tenant settings:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tenant settings",
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * Validate tenant settings
 * Returns array of validation error messages
 */
function validateTenantSettings(settings: any): string[] {
  const errors: string[] = [];

  // Validate name
  if (settings.name !== undefined) {
    if (typeof settings.name !== "string" || !settings.name.trim()) {
      errors.push("Tenant name is required");
    }
  }

  // Validate contact email
  if (settings.contactInfo?.email !== undefined) {
    if (!settings.contactInfo.email.trim()) {
      errors.push("Contact email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.contactInfo.email)) {
        errors.push("Invalid contact email format");
      }
    }
  }

  // Validate contact phone
  if (settings.contactInfo?.phone !== undefined) {
    if (!settings.contactInfo.phone.trim()) {
      errors.push("Contact phone is required");
    }
  }

  // Validate address fields
  if (settings.contactInfo?.address) {
    const address = settings.contactInfo.address;
    if (address.street !== undefined && !address.street.trim()) {
      errors.push("Street address is required");
    }
    if (address.city !== undefined && !address.city.trim()) {
      errors.push("City is required");
    }
    if (address.state !== undefined && !address.state.trim()) {
      errors.push("State is required");
    }
    if (address.zipCode !== undefined && !address.zipCode.trim()) {
      errors.push("ZIP code is required");
    }
  }

  // Validate color formats
  if (settings.branding) {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      settings.branding.primaryColor &&
      !colorRegex.test(settings.branding.primaryColor)
    ) {
      errors.push("Primary color must be a valid hex color (e.g., #FF0000)");
    }
    if (
      settings.branding.secondaryColor &&
      !colorRegex.test(settings.branding.secondaryColor)
    ) {
      errors.push("Secondary color must be a valid hex color (e.g., #FF0000)");
    }
    if (
      settings.branding.accentColor &&
      !colorRegex.test(settings.branding.accentColor)
    ) {
      errors.push("Accent color must be a valid hex color (e.g., #FF0000)");
    }
  }

  // Subscription validation removed - subscription updates are not allowed for tenant admins

  // Validate custom domain format if provided
  if (settings.branding?.customDomain) {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(settings.branding.customDomain)) {
      errors.push("Custom domain must be a valid domain name");
    }
  }

  return errors;
}

