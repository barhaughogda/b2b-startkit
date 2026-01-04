'use client';

import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { logger } from "./logger";

/**
 * Convex Client - Legacy
 * 
 * Note: We are migrating to Postgres. This client is maintained for backward
 * compatibility during the vertical slice migration process.
 * ALWAYS returns a client instance to prevent build-time crashes.
 */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://migrated-to-postgres-123.convex.cloud";

function isValidConvexUrl(url: string | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '' || trimmed.includes('your-') || trimmed.includes('dummy')) return false;
  try {
    // Check if it looks like a valid convex URL
    return trimmed.startsWith('http') && trimmed.includes('.convex.cloud');
  } catch {
    return false;
  }
}

// Always return a client to satisfy hooks during build/SSG
// Using a placeholder domain if no URL is provided.
const fallbackUrl = "https://migrated-to-postgres-placeholder.convex.cloud";
const effectiveUrl = isValidConvexUrl(convexUrl) ? convexUrl : fallbackUrl;

// ConvexReactClient should only be initialized on the client or in a file marked with 'use client'
// To prevent 'createContext' errors in Server Components, we only export the HTTP client here
// and keep the React client for client-side usage.
export const convexHttp = new ConvexHttpClient(effectiveUrl);

// We'll use a getter or a separate client-only file for the React client
let client: ConvexReactClient | undefined;
export const getConvexClient = () => {
  if (!client) {
    client = new ConvexReactClient(effectiveUrl);
  }
  return client;
};

// For backward compatibility with existing imports
export const convex = typeof window !== 'undefined' ? new ConvexReactClient(effectiveUrl) : (null as any);

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (isValidConvexUrl(convexUrl)) {
    logger.info('[Convex] Legacy client initialized');
  } else {
    logger.warn('[Convex] No valid NEXT_PUBLIC_CONVEX_URL found. Convex features may not work.');
  }
}
