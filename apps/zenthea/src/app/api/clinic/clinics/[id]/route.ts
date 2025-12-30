import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PUT /api/clinic/clinics/[id]
 * Update a clinic
 * Owner-only endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
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

    const clinicId = params.id as Id<"clinics">;

    // Parse request body
    const body = await request.json();
    const { name, description, address, isActive } = body;

    // Validate that at least one field is provided for update
    const hasUpdates =
      name !== undefined ||
      description !== undefined ||
      address !== undefined ||
      isActive !== undefined;

    if (!hasUpdates) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "At least one field must be provided for update",
          code: "NO_UPDATES_PROVIDED",
        },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (name === null || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Clinic name cannot be null or empty",
            code: "INVALID_CLINIC_NAME",
          },
          { status: 400 }
        );
      }
    }

    // Update clinic via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.clinics?.updateClinic as any,
        {
          tenantId,
          userEmail: session.user.email!,
          clinicId,
          name: name !== undefined ? name.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          address: address !== undefined ? address : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
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
              "The Convex function 'clinic/clinics:updateClinic' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can update clinics" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Clinic not found",
            message: errorMessage,
            code: "DEPARTMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("already exists")) {
        return NextResponse.json(
          {
            success: false,
            error: "Clinic name already exists",
            message: errorMessage,
            code: "CLINIC_NAME_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      if (
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
          apiPath: "(api as any).clinic.clinics.updateClinic",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "clinic_updated",
        resource: "clinics",
        resourceId: clinicId,
        details: {
          updatedFields: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { isActive }),
          },
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
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating clinic:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update clinic",
        message: errorMessage,
        code: "UPDATE_CLINIC_ERROR",
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
 * DELETE /api/clinic/clinics/[id]
 * Delete a clinic
 * Owner-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
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

    const clinicId = params.id as Id<"clinics">;

    // Delete clinic via Convex action
    let result;
    try {
      result = await convex.action(
        (api as any).clinic?.clinics?.deleteClinic as any,
        {
          tenantId,
          userEmail: session.user.email!,
          clinicId,
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
              "The Convex function 'clinic/clinics:deleteClinic' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          { error: "Only clinic owners can delete clinics" },
          { status: 403 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Clinic not found",
            message: errorMessage,
            code: "DEPARTMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (errorMessage.includes("assigned") || errorMessage.includes("user")) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete clinic in use",
            message: errorMessage,
            code: "CLINIC_IN_USE",
          },
          { status: 400 }
        );
      }

      if (errorMessage.includes("does not belong")) {
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
          apiPath: "(api as any).clinic.clinics.deleteClinic",
        });
      }
      throw convexError;
    }

    // Create audit log entry
    try {
      await convex.mutation(api.auditLogs.create, {
        tenantId,
        userId: session.user.id as any,
        action: "clinic_deleted",
        resource: "clinics",
        resourceId: clinicId,
        details: {
          deletedBy: session.user.email,
          deletedAt: Date.now(),
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
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting clinic:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete clinic",
        message: errorMessage,
        code: "DELETE_CLINIC_ERROR",
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





