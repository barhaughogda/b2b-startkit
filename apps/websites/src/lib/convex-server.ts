import { ConvexHttpClient } from "convex/browser";

/**
 * Convex HTTP Client - Server Side Only
 */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://migrated-to-postgres-123.convex.cloud";

function isValidConvexUrl(url: string | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '' || trimmed.includes('your-') || trimmed.includes('dummy')) return false;
  try {
    return trimmed.startsWith('http') && trimmed.includes('.convex.cloud');
  } catch {
    return false;
  }
}

const fallbackUrl = "https://migrated-to-postgres-placeholder.convex.cloud";
const effectiveUrl = isValidConvexUrl(convexUrl) ? convexUrl : fallbackUrl;

export const convexHttp = new ConvexHttpClient(effectiveUrl);
