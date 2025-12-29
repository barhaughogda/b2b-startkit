import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { isValidTenantId } from "@/hooks/useTenantId";
import { isValidEmail, isValidHexColor } from "@/lib/validation/tenant";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/superadmin/tenants
 * Returns list of all tenants with pagination, filtering, search, and sorting
 * Requires superadmin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as
      | "active"
      | "inactive"
      | "suspended"
      | "trial"
      | null;
    const plan = searchParams.get("plan") as
      | "demo"
      | "basic"
      | "premium"
      | "enterprise"
      | null;
    const type = searchParams.get("type") as
      | "clinic"
      | "hospital"
      | "practice"
      | "group"
      | null;
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") as
      | "name"
      | "createdAt"
      | "status"
      | null;
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;

    // Query Convex for tenant list
    let result;
    try {
      result = await convex.query(
        (api as any).admin.tenants.listTenantsForSuperadmin,
        {
          page,
          limit,
          status: status || undefined,
          plan: plan || undefined,
          type: type || undefined,
          search,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
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
            message: "The Convex function 'admin/tenants:listTenantsForSuperadmin' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.tenants.listTenantsForSuperadmin",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching tenants:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenants",
        message: errorMessage,
        code: "FETCH_TENANTS_ERROR",
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
 * POST /api/superadmin/tenants
 * Creates a new tenant
 * Requires superadmin role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse request body
    const body = await request.json();
    const {
      id,
      name,
      type,
      contactInfo,
      subscription,
      branding,
    } = body;

    // Validate required fields
    const validationErrors: string[] = [];
    if (!id || typeof id !== "string" || !id.trim()) {
      validationErrors.push("Tenant ID is required");
    } else if (!isValidTenantId(id)) {
      validationErrors.push("Tenant ID must be 3-50 characters, alphanumeric with hyphens/underscores only");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      validationErrors.push("Tenant name is required");
    }
    if (!type || !["clinic", "hospital", "practice", "group"].includes(type)) {
      validationErrors.push("Valid tenant type is required (clinic, hospital, practice, group)");
    }
    if (!contactInfo) {
      validationErrors.push("Contact information is required");
    } else {
      if (!contactInfo.email || typeof contactInfo.email !== "string") {
        validationErrors.push("Contact email is required");
      } else if (!isValidEmail(contactInfo.email)) {
        validationErrors.push("Invalid email format");
      }
      if (!contactInfo.phone || typeof contactInfo.phone !== "string") {
        validationErrors.push("Contact phone is required");
      }
      if (!contactInfo.address) {
        validationErrors.push("Contact address is required");
      } else {
        const requiredAddressFields = ["street", "city", "state", "zipCode", "country"];
        for (const field of requiredAddressFields) {
          if (!contactInfo.address[field] || typeof contactInfo.address[field] !== "string") {
            validationErrors.push(`Address ${field} is required`);
          }
        }
      }
    }

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

    // Validate subscription limits if provided
    if (subscription) {
      if (
        subscription.maxUsers !== undefined &&
        (subscription.maxUsers < 1 || subscription.maxUsers > 10000)
      ) {
        validationErrors.push("Max users must be between 1 and 10,000");
      }
      if (
        subscription.maxPatients !== undefined &&
        (subscription.maxPatients < 1 || subscription.maxPatients > 100000)
      ) {
        validationErrors.push("Max patients must be between 1 and 100,000");
      }
    }

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

    // Validate color formats if provided
    if (branding) {
      if (branding.primaryColor && !isValidHexColor(branding.primaryColor)) {
        validationErrors.push("Primary color must be a valid hex color");
      }
      if (branding.secondaryColor && !isValidHexColor(branding.secondaryColor)) {
        validationErrors.push("Secondary color must be a valid hex color");
      }
      if (branding.accentColor && !isValidHexColor(branding.accentColor)) {
        validationErrors.push("Accent color must be a valid hex color");
      }
    }

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

    // Create tenant via Convex
    let newTenant;
    try {
      newTenant = await convex.mutation(
        (api as any).admin.tenants.createTenantForSuperadmin,
        {
          id: id.trim(),
          name: name.trim(),
          type,
          contactInfo,
          subscription,
          branding,
        }
      );
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error ? convexError.message : String(convexError);

      // Check if this is a "function not found" error
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("Did you forget to run")
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'admin/tenants:createTenantForSuperadmin' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
            code: "CONVEX_FUNCTION_NOT_DEPLOYED",
            ...(process.env.NODE_ENV === "development" && {
              details: {
                error: errorMessage,
                solution:
                  "Run 'npx convex dev' in a separate terminal to sync Convex functions",
              },
            }),
          },
          { status: 503 }
        );
      }

      // Handle specific error messages
      if (errorMessage.includes("already exists") || errorMessage.includes("already in use")) {
        return NextResponse.json(
          {
            success: false,
            error: "Tenant creation failed",
            message: errorMessage,
            code: "TENANT_EXISTS",
          },
          { status: 409 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Convex mutation failed:", {
          error: errorMessage,
          apiPath: "(api as any).admin.tenants.createTenantForSuperadmin",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: newTenant,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error creating tenant:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create tenant",
        message: errorMessage,
        code: "CREATE_TENANT_ERROR",
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

