import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/company/clinics
 * Get list of clinics for the tenant
 * Owner-only endpoint
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is clinic user (with backward compatibility)
    const isClinicUser =
      session.user.role === "clinic_user" ||
      session.user.role === "admin" ||
      session.user.role === "provider";

    if (!isClinicUser && session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Clinic access required" },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Query Convex for clinics
    let result;
    try {
      result = await convex.query(
        (api as any).clinic?.clinics?.getClinics as any,
        {
          tenantId,
          userEmail: session.user.email!,
        }
      );
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      // Check if this is a "function not found" error
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("Did you forget to run")
      ) {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/clinics:getClinics' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // Check for authorization errors
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can view clinics" },
          { status: 403 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex query failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.clinics.getClinics",
        });
      }
      throw convexError;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching clinics:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clinics",
        message: errorMessage,
        code: "FETCH_CLINICS_ERROR",
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
 * POST /api/company/clinics
 * Create a new clinic
 * Owner-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is clinic user (with backward compatibility)
    const isClinicUser =
      session.user.role === "clinic_user" ||
      session.user.role === "admin" ||
      session.user.role === "provider";

    if (!isClinicUser && session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Clinic access required" },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, address, isActive } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Missing required field: name",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Clinic name cannot be empty",
          code: "INVALID_CLINIC_NAME",
        },
        { status: 400 }
      );
    }

    // Create clinic via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.clinics?.createClinic as any,
        {
          tenantId,
          userEmail: session.user.email!,
          name: name.trim(),
          description: description?.trim(),
          address: address,
          isActive: isActive ?? true,
        }
      );
    } catch (convexError) {
      const errorMessage =
        convexError instanceof Error
          ? convexError.message
          : String(convexError);

      // Check if this is a "function not found" error
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("Did you forget to run")
      ) {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Convex function not deployed:", errorMessage);
        }
        return NextResponse.json(
          {
            success: false,
            error: "Convex function not deployed",
            message:
              "The Convex function 'clinic/clinics:createClinic' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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

      // Check for known errors
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("owner")
      ) {
        return NextResponse.json(
          { error: "Only clinic owners can create clinics" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("already exists")) {
        return NextResponse.json(
          {
            success: false,
            error: "Clinic already exists",
            message: errorMessage,
            code: "CLINIC_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("Invalid") ||
        errorMessage.includes("does not belong")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: errorMessage,
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // For other Convex errors, log and re-throw
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Convex action failed:", {
          error: errorMessage,
          apiPath: "(api as any).clinic.clinics.createClinic",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "clinic_created",
        resource: "clinics",
        resourceId: result.clinicId,
        details: {
          clinicName: name,
          isActive: isActive ?? true,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        timestamp: Date.now(),
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          clinicId: result.clinicId,
          message: result.message,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating clinic:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create clinic",
        message: errorMessage,
        code: "CREATE_CLINIC_ERROR",
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


