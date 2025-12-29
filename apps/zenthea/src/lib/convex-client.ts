/**
 * Convex Client Initialization
 * 
 * Provides a server-side Convex client for API routes.
 * This module initializes and exports a Convex HTTP client instance.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { logger } from "@/lib/logger";

/**
 * Initialize and return a Convex client and API reference
 * @returns Object containing the Convex client and API
 */
export async function initializeConvex() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    logger.warn("NEXT_PUBLIC_CONVEX_URL is not set. Convex operations will fail.");
    return {
      convex: null,
      api: null,
    };
  }

  const convex = new ConvexHttpClient(convexUrl);
  
  return {
    convex,
    api,
  };
}

