import { ConvexReactClient } from "convex/react";

/**
 * Convex Client - Legacy
 * 
 * Note: We are migrating to Postgres. This client is maintained for backward
 * compatibility during the vertical slice migration process.
 * ALWAYS returns a client instance to prevent build-time crashes.
 */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dummy.convex.cloud";

function isValidConvexUrl(url: string | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '' || trimmed.includes('your-')) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

// Always return a client to satisfy hooks during build/SSG
export const convex = new ConvexReactClient(isValidConvexUrl(convexUrl) ? convexUrl : "https://dummy.convex.cloud");

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Convex] Legacy client initialized');
}
