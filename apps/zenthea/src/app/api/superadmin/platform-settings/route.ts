import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/superadmin-auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/superadmin/platform-settings
 * Returns platform-wide settings (password policies, MFA, platform API keys, webhooks)
 * Requires superadmin role
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Query Convex for platform settings
    let settings;
    try {
      settings = await convex.query((api as any).admin.platformSettings.getPlatformSettings, {});
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
            message: "The Convex function 'admin/platformSettings:getPlatformSettings' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.platformSettings.getPlatformSettings",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: settings,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching platform settings:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch platform settings",
        message: errorMessage,
        code: "FETCH_PLATFORM_SETTINGS_ERROR",
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
 * PUT /api/superadmin/platform-settings
 * Updates platform-wide settings
 * Requires superadmin role
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify superadmin authorization
    const authResult = await verifySuperAdminAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse request body
    const body = await request.json();
    const settings = body;

    // Validate settings
    const validationErrors = validatePlatformSettings(settings);
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
    let updatedSettings;
    try {
      updatedSettings = await convex.mutation(
        (api as any).admin.platformSettings.updatePlatformSettings,
        {
          settings,
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
            message: "The Convex function 'admin/platformSettings:updatePlatformSettings' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.",
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
          apiPath: "(api as any).admin.platformSettings.updatePlatformSettings",
        });
      }
      throw convexError;
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedSettings,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (process.env.NODE_ENV === 'development') {
      console.error("Error updating platform settings:", errorMessage);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update platform settings",
        message: errorMessage,
        code: "UPDATE_PLATFORM_SETTINGS_ERROR",
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
 * Validate platform settings
 * Returns array of validation error messages
 */
function validatePlatformSettings(settings: any): string[] {
  const errors: string[] = [];

  // Validate password minimum length
  if (settings.passwordMinLength !== undefined) {
    if (
      typeof settings.passwordMinLength !== "number" ||
      settings.passwordMinLength < 8 ||
      settings.passwordMinLength > 128
    ) {
      errors.push("Password minimum length must be between 8 and 128 characters");
    }
  }

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

  // Validate account lockout max attempts
  if (settings.accountLockoutMaxAttempts !== undefined) {
    if (
      typeof settings.accountLockoutMaxAttempts !== "number" ||
      settings.accountLockoutMaxAttempts < 3 ||
      settings.accountLockoutMaxAttempts > 10
    ) {
      errors.push("Account lockout max attempts must be between 3 and 10");
    }
  }

  // Validate account lockout duration
  if (settings.accountLockoutDuration !== undefined) {
    if (
      typeof settings.accountLockoutDuration !== "number" ||
      settings.accountLockoutDuration < 5 ||
      settings.accountLockoutDuration > 1440
    ) {
      errors.push("Account lockout duration must be between 5 and 1440 minutes");
    }
  }

  // Validate API keys structure
  if (settings.apiKeys !== undefined) {
    if (!Array.isArray(settings.apiKeys)) {
      errors.push("API keys must be an array");
    } else {
      settings.apiKeys.forEach((key: any, index: number) => {
        if (!key.name || !key.key) {
          errors.push(`API key at index ${index} must have name and key`);
        }
      });
    }
  }

  // Validate webhooks structure
  if (settings.webhooks !== undefined) {
    if (!Array.isArray(settings.webhooks)) {
      errors.push("Webhooks must be an array");
    } else {
      settings.webhooks.forEach((webhook: any, index: number) => {
        if (!webhook.url) {
          errors.push(`Webhook at index ${index} must have a URL`);
        }
        if (!Array.isArray(webhook.events)) {
          errors.push(`Webhook at index ${index} must have an events array`);
        }
        if (typeof webhook.active !== "boolean") {
          errors.push(`Webhook at index ${index} must have an active boolean`);
        }
      });
    }
  }

  return errors;
}

