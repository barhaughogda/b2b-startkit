/**
 * Convex API Helper Utilities
 * 
 * Provides type-safe wrappers for Convex API calls with standardized error handling.
 * Reduces the need for `(api as any)` casts and provides consistent error responses.
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { FunctionReference } from "convex/server";
import { api } from "@/convex/_generated/api";
import { logger } from "@/lib/logger";

/**
 * Custom error class for Convex function not deployed errors
 */
export class ConvexFunctionNotDeployedError extends Error {
  constructor(
    public readonly apiPath: string,
    public readonly originalError: string
  ) {
    super(`Convex function '${apiPath}' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.`);
    this.name = "ConvexFunctionNotDeployedError";
  }
}

/**
 * Type-safe helper to get a Convex API function from nested namespaces
 * 
 * @example
 * ```ts
 * const actionFn = getConvexFunction(api, ['clinic', 'users', 'getClinicUsers']);
 * if (!actionFn) {
 *   throw new ConvexFunctionNotDeployedError('clinic.users.getClinicUsers', 'Function not found');
 * }
 * ```
 */
/**
 * Get a Convex API function from a path array.
 * 
 * Convex's API is a proxy object (anyApi) that doesn't expose its structure
 * for inspection, but allows dynamic property access. This function navigates
 * the proxy by accessing properties directly.
 * 
 * @example
 * ```ts
 * // For convex/clinic/users.ts -> api.clinic.users.getClinicUsers
 * const fn = getConvexFunction(api, ['clinic', 'users', 'getClinicUsers']);
 * ```
 */
export function getConvexFunction(
  apiObj: unknown,
  path: string[]
): FunctionReference<"query" | "mutation" | "action", "public" | "internal"> | null {
  if (!path || path.length === 0) {
    return null;
  }

  try {
    // Convex's API is a proxy that allows dynamic property access
    // We navigate by accessing properties directly, which works even though
    // we can't inspect the structure
    // 
    // NOTE: Using 'any' is necessary here because Convex's proxy object doesn't
    // expose its structure for TypeScript inspection (no index signatures),
    // but it does allow dynamic property access at runtime. This is a known
    // limitation of TypeScript with proxy objects.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = apiObj;
    
    for (const segment of path) {
      if (current == null) {
        return null;
      }
      
      // Access the property directly (works with Convex's proxy)
      current = current[segment];
      
      // If we get undefined, the path doesn't exist
      if (current === undefined) {
        return null;
      }
    }
    
    // Return the function reference if we successfully navigated
    // Convex function references are objects, not functions
    if (current != null && typeof current === "object") {
      return current as FunctionReference<"query" | "mutation" | "action", "public" | "internal">;
    }
    
    return null;
  } catch (error) {
    // If any access fails, return null
    return null;
  }
}

/**
 * Safely call a Convex query with standardized error handling
 */
export async function callConvexQuery<TResult = unknown>(
  convex: ConvexHttpClient,
  apiPath: string,
  functionPath: string[],
  args: Record<string, unknown>,
  options?: {
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<{ success: true; data: TResult } | NextResponse> {
  try {
    const queryFn = getConvexFunction(api, functionPath);
    
    if (!queryFn) {
      const errorMessage = `Convex function '${apiPath}' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.`;
      
      if (process.env.NODE_ENV === "development") {
        logger.error("Convex function not deployed", {
          apiPath,
          functionPath: functionPath.join("."),
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "Convex function not deployed",
          message: errorMessage,
          code: options?.errorCode || "CONVEX_FUNCTION_NOT_DEPLOYED",
          ...(process.env.NODE_ENV === "development" && {
            details: {
              apiPath,
              solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
            },
          }),
        },
        { status: 503 }
      );
    }
    
    const result = await convex.query(queryFn as any, args);
    return { success: true as const, data: result as TResult };
  } catch (error) {
    return handleConvexError(error, apiPath, options);
  }
}

/**
 * Safely call a Convex mutation with standardized error handling
 */
export async function callConvexMutation<TResult = unknown>(
  convex: ConvexHttpClient,
  apiPath: string,
  functionPath: string[],
  args: Record<string, unknown>,
  options?: {
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<{ success: true; data: TResult } | NextResponse> {
  try {
    const mutationFn = getConvexFunction(api, functionPath);
    
    if (!mutationFn) {
      const errorMessage = `Convex function '${apiPath}' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.`;
      
      if (process.env.NODE_ENV === "development") {
        logger.error("Convex function not deployed", {
          apiPath,
          functionPath: functionPath.join("."),
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "Convex function not deployed",
          message: errorMessage,
          code: options?.errorCode || "CONVEX_FUNCTION_NOT_DEPLOYED",
          ...(process.env.NODE_ENV === "development" && {
            details: {
              apiPath,
              solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
            },
          }),
        },
        { status: 503 }
      );
    }
    
    const result = await convex.mutation(mutationFn as any, args);
    return { success: true as const, data: result as TResult };
  } catch (error) {
    return handleConvexError(error, apiPath, options);
  }
}

/**
 * Safely call a Convex action with standardized error handling
 */
export async function callConvexAction<TResult = unknown>(
  convex: ConvexHttpClient,
  apiPath: string,
  functionPath: string[],
  args: Record<string, unknown>,
  options?: {
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<{ success: true; data: TResult } | NextResponse> {
  try {
    const actionFn = getConvexFunction(api, functionPath);
    
    if (!actionFn) {
      const errorMessage = `Convex function '${apiPath}' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.`;
      
      if (process.env.NODE_ENV === "development") {
        logger.error("Convex function not deployed", {
          apiPath,
          functionPath: functionPath.join("."),
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "Convex function not deployed",
          message: errorMessage,
          code: options?.errorCode || "CONVEX_FUNCTION_NOT_DEPLOYED",
          ...(process.env.NODE_ENV === "development" && {
            details: {
              apiPath,
              solution: "Run 'npx convex dev' in a separate terminal to sync Convex functions",
            },
          }),
        },
        { status: 503 }
      );
    }
    
    const result = await convex.action(actionFn as any, args);
    return { success: true as const, data: result as TResult };
  } catch (error) {
    return handleConvexError(error, apiPath, options);
  }
}

/**
 * Handle Convex errors and return appropriate HTTP responses
 */
function handleConvexError(
  error: unknown,
  apiPath: string,
  options?: {
    errorCode?: string;
    errorMessage?: string;
  }
): NextResponse {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Check if this is a "function not found" error
  if (
    errorMessage.includes("Could not find public function") ||
    errorMessage.includes("Did you forget to run")
  ) {
    if (process.env.NODE_ENV === "development") {
      logger.error("Convex function not deployed", {
        error: errorMessage,
        apiPath,
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "Convex function not deployed",
        message: `The Convex function '${apiPath}' is not deployed. Please run 'npx convex dev' or 'npx convex deploy' to sync your functions.`,
        code: options?.errorCode || "CONVEX_FUNCTION_NOT_DEPLOYED",
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
    errorMessage.includes("owner") ||
    errorMessage.includes("Owner access required") ||
    errorMessage.includes("Forbidden")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
        message: errorMessage || options?.errorMessage || "You do not have permission to perform this action",
        code: options?.errorCode || "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  // Check for not found errors
  if (
    errorMessage.includes("not found") ||
    errorMessage.includes("does not exist")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Not Found",
        message: errorMessage,
        code: options?.errorCode || "NOT_FOUND",
      },
      { status: 404 }
    );
  }

  // Check for validation errors
  if (
    errorMessage.includes("Invalid") ||
    errorMessage.includes("does not belong") ||
    errorMessage.includes("Validation")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation error",
        message: errorMessage,
        code: options?.errorCode || "VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // Check for conflict errors (already exists)
  if (
    errorMessage.includes("already exists") ||
    errorMessage.includes("already been")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Conflict",
        message: errorMessage,
        code: options?.errorCode || "CONFLICT",
      },
      { status: 409 }
    );
  }

  // Check for expired errors
  if (errorMessage.includes("expired")) {
    return NextResponse.json(
      {
        success: false,
        error: "Expired",
        message: errorMessage,
        code: options?.errorCode || "EXPIRED",
      },
      { status: 400 }
    );
  }

  // Check for in-use errors
  if (errorMessage.includes("in use") || errorMessage.includes("assigned")) {
    return NextResponse.json(
      {
        success: false,
        error: "Resource in use",
        message: errorMessage,
        code: options?.errorCode || "RESOURCE_IN_USE",
      },
      { status: 400 }
    );
  }

  // Log unexpected errors
  logger.error("Unexpected Convex error", {
    error: errorMessage,
    stack: errorStack,
    apiPath,
  });

  // Return generic error response
  return NextResponse.json(
    {
      success: false,
      error: options?.errorMessage || "Internal server error",
      message: errorMessage,
      code: options?.errorCode || "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development" && {
        details: {
          stack: errorStack,
          apiPath,
        },
      }),
    },
    { status: 500 }
  );
}

