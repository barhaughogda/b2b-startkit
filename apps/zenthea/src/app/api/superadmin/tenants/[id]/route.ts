import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { isValidEmail, isValidHexColor } from "@/lib/validation/tenant";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/superadmin/tenants/[id]
 * Returns full tenant details including all settings, subscription, branding, features
 * Requires superadmin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const tenantId = params.id;

    // Query Convex for tenant details
    let tenant;
    try {
      tenant = await convex.query(
        (api as any).admin.tenants.getTenantDetailsForSuperadmin,
        {
          tenantId,
        }
      );
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run")) {
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message: "The Convex function 'admin/tenants:getTenantDetailsForSuperadmin' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }
      
      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).admin.tenants.getTenantDetailsForSuperadmin",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: tenant,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching tenant details:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenant details",
        message: errorMessage,
        code: "FETCH_TENANT_DETAILS_ERROR",
        ...(process.env.NODE_ENV === "development" && {
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
 * PUT /api/superadmin/tenants/[id]
 * Updates tenant details (including subscription)
 * Requires superadmin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const tenantId = params.id;

    // Parse request body
    const body = await request.json();
    const updates = body;

    // Validate updates
    const validationErrors = validateTenantUpdates(updates);
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

    // Update tenant via Convex
    let updatedTenant;
    try {
      updatedTenant = await convex.mutation(
        (api as any).admin.tenants.updateTenantForSuperadmin,
        {
          tenantId,
          updates,
        }
      );
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError);
      
      // Check if this is a "function not found" error
      if (errorMessage.includes("Could not find public function") || 
          errorMessage.includes("Did you forget to run")) {
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message: "The Convex function 'admin/tenants:updateTenantForSuperadmin' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                error: errorMessage,
                solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }
      
      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex mutation failed:", {
          error: errorMessage,
          apiPath: "(api as any).admin.tenants.updateTenantForSuperadmin",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedTenant,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error updating tenant:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tenant",
        message: errorMessage,
        code: "UPDATE_TENANT_ERROR",
        ...(process.env.NODE_ENV === "development" && {
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
 * Validate tenant updates
 * Returns array of validation error messages
 */
function validateTenantUpdates(updates: any): string[] {
  const errors: string[] = [];

  // Validate name
  if (updates.name !== undefined) {
    if (typeof updates.name !== "string" || !updates.name.trim()) {
      errors.push("Tenant name is required");
    }
  }

  // Validate subscription limits
  if (updates.subscription) {
    if (
      updates.subscription.maxUsers !== undefined &&
      (updates.subscription.maxUsers < 1 ||
        updates.subscription.maxUsers > 10000)
    ) {
      errors.push("Max users must be between 1 and 10,000");
    }
    if (
      updates.subscription.maxPatients !== undefined &&
      (updates.subscription.maxPatients < 1 ||
        updates.subscription.maxPatients > 100000)
    ) {
      errors.push("Max patients must be between 1 and 100,000");
    }
  }

  // Validate contact email
  if (updates.contactInfo?.email !== undefined) {
    if (!isValidEmail(updates.contactInfo.email)) {
      errors.push("Invalid contact email format");
    }
  }

  // Validate color formats
  if (updates.branding) {
    if (
      updates.branding.primaryColor &&
      !isValidHexColor(updates.branding.primaryColor)
    ) {
      errors.push("Primary color must be a valid hex color");
    }
    if (
      updates.branding.secondaryColor &&
      !isValidHexColor(updates.branding.secondaryColor)
    ) {
      errors.push("Secondary color must be a valid hex color");
    }
    if (
      updates.branding.accentColor &&
      !isValidHexColor(updates.branding.accentColor)
    ) {
      errors.push("Accent color must be a valid hex color");
    }
  }

  return errors;
}

