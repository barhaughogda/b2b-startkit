import { NextResponse } from 'next/server';

/**
 * Standardized API error response format
 * Ensures consistent error responses across all API routes
 */

export interface ApiErrorResponse {
  error: string;
  message: string;
  debug?: Record<string, unknown>;
}

/**
 * Create a standardized error response
 * @param error - Error type/code (e.g., 'Unauthorized', 'Bad Request')
 * @param message - User-friendly error message
 * @param debug - Optional debug information (only included in development)
 * @param status - HTTP status code (default: 500)
 */
export function createErrorResponse(
  error: string,
  message: string,
  debug?: Record<string, unknown>,
  status: number = 500
): NextResponse<ApiErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const enableDebugLogging = isDevelopment || process.env.ENABLE_DEBUG_LOGGING === 'true';

  const response: ApiErrorResponse = {
    error,
    message,
  };

  // Only include debug info in development or when explicitly enabled
  if (enableDebugLogging && debug) {
    response.debug = debug;
  }

  return NextResponse.json(response, { status });
}

/**
 * Common error response helpers
 */
export const apiErrors = {
  unauthorized: (message: string = 'Please sign in to continue.', debug?: Record<string, unknown>) =>
    createErrorResponse('Unauthorized', message, debug, 401),

  forbidden: (message: string = 'You do not have permission to perform this action.', debug?: Record<string, unknown>) =>
    createErrorResponse('Forbidden', message, debug, 403),

  badRequest: (message: string, debug?: Record<string, unknown>) =>
    createErrorResponse('Bad Request', message, debug, 400),

  notFound: (message: string = 'Resource not found.', debug?: Record<string, unknown>) =>
    createErrorResponse('Not Found', message, debug, 404),

  serverError: (message: string = 'An internal server error occurred. Please try again later.', debug?: Record<string, unknown>) =>
    createErrorResponse('Internal Server Error', message, debug, 500),

  configError: (message: string = 'Server configuration error. Please contact support.', debug?: Record<string, unknown>) =>
    createErrorResponse('Server configuration error', message, debug, 500),
};

