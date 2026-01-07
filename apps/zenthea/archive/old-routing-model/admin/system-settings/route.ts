import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/system-settings
 * Returns current system settings for the tenant
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

    // Query Convex for system settings
    const settings = await convex.query((api as any).admin.systemSettings.getSystemSettings, {
      tenantId,
    });

    return NextResponse.json(
      {
        success: true,
        data: settings,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error fetching system settings:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch system settings",
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
 * PUT /api/admin/system-settings
 * Updates system settings for the tenant
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
    const settings = body;

    // Validate settings
    const validationErrors = validateSettings(settings);
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

    // Update settings via Convex
    const updatedSettings = await convex.mutation(
      (api as any).admin.systemSettings.updateSystemSettings,
      {
        tenantId,
        settings,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedSettings,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Error updating system settings:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update system settings",
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
 * Validate system settings
 * Returns array of validation error messages
 */
function validateSettings(settings: any): string[] {
  const errors: string[] = [];

  // Validate session timeout
  if (settings.sessionTimeout !== undefined) {
    if (
      typeof settings.sessionTimeout !== "number" ||
      settings.sessionTimeout < 5 ||
      settings.sessionTimeout > 480
    ) {
      errors.push("Session timeout must be between 5 and 480 minutes");
    }
  }

  // Validate max concurrent sessions
  if (settings.maxConcurrentSessions !== undefined) {
    if (
      typeof settings.maxConcurrentSessions !== "number" ||
      settings.maxConcurrentSessions < 1 ||
      settings.maxConcurrentSessions > 10
    ) {
      errors.push("Max concurrent sessions must be between 1 and 10");
    }
  }

  // Validate email from address
  if (settings.emailFromAddress !== undefined) {
    if (typeof settings.emailFromAddress !== "string" || !settings.emailFromAddress.trim()) {
      if (settings.emailNotifications) {
        errors.push("Email from address is required when email notifications are enabled");
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.emailFromAddress)) {
        errors.push("Invalid email from address format");
      }
    }
  }

  // Validate timezone
  if (settings.timezone !== undefined) {
    if (typeof settings.timezone !== "string" || !settings.timezone.trim()) {
      errors.push("Timezone is required");
    }
  }

  // Validate date format
  if (settings.dateFormat !== undefined) {
    if (typeof settings.dateFormat !== "string" || !settings.dateFormat.trim()) {
      errors.push("Date format is required");
    }
  }

  // Validate time format
  if (settings.timeFormat !== undefined) {
    if (settings.timeFormat !== "12h" && settings.timeFormat !== "24h") {
      errors.push("Time format must be '12h' or '24h'");
    }
  }

  // Validate currency
  if (settings.currency !== undefined) {
    if (typeof settings.currency !== "string" || !settings.currency.trim()) {
      errors.push("Currency is required");
    }
  }

  // Validate language
  if (settings.language !== undefined) {
    if (typeof settings.language !== "string" || !settings.language.trim()) {
      errors.push("Language is required");
    }
  }

  return errors;
}

