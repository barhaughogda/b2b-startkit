import { ConvexReactClient } from "convex/react";

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
export const convex = new ConvexReactClient(isValidConvexUrl(convexUrl) ? convexUrl : fallbackUrl);

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (isValidConvexUrl(convexUrl)) {
    console.log('[Convex] Legacy client initialized');
  } else {
    console.warn('[Convex] No valid NEXT_PUBLIC_CONVEX_URL found. Convex features may not work.');
  }
}
