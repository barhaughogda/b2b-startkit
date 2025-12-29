import { ConvexReactClient } from "convex/react";

// Note: In Next.js, only NEXT_PUBLIC_* environment variables are available in client-side code
// CONVEX_DEPLOYMENT_URL is only available server-side, so we only check NEXT_PUBLIC_CONVEX_URL here
// For Vercel environments, ensure NEXT_PUBLIC_CONVEX_URL is set for all environments (Production, Preview, Development)
// CRITICAL: This variable MUST be set in Vercel BEFORE the build happens, as it's embedded at build time
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Build-time verification (runs during module initialization)
if (typeof window === 'undefined') {
  // Server-side: log during build
  if (!convexUrl) {
    console.warn('[Convex Build] ⚠️ NEXT_PUBLIC_CONVEX_URL is not set during build');
    console.warn('[Convex Build] This will cause the Convex client to be null in the browser');
  } else {
    console.log('[Convex Build] ✅ NEXT_PUBLIC_CONVEX_URL is set:', convexUrl.substring(0, 30) + '...');
  }
}

// Validate that the URL is a valid absolute URL before creating the client
function isValidConvexUrl(url: string | undefined): url is string {
  if (!url) {
    // Log in development to help debug
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[Convex] NEXT_PUBLIC_CONVEX_URL is not set');
    }
    return false;
  }
  
  // Trim whitespace
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return false;
  }
  
  // Check if it's a placeholder value (from documentation examples)
  if (
    trimmedUrl.includes('your-convex-url') ||
    trimmedUrl.includes('your-deployment-url') ||
    trimmedUrl.includes('your-dev-deployment') ||
    trimmedUrl.includes('your-prod-deployment') ||
    trimmedUrl.includes('your-new-prod-deployment') ||
    trimmedUrl.includes('your-local-deployment')
  ) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[Convex] NEXT_PUBLIC_CONVEX_URL appears to be a placeholder:', trimmedUrl);
    }
    return false;
  }
  
  // Check if it's a valid absolute URL
  try {
    const parsed = new URL(trimmedUrl);
    const isValid = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    if (!isValid && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[Convex] NEXT_PUBLIC_CONVEX_URL has invalid protocol:', parsed.protocol);
    }
    return isValid;
  } catch (error) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[Convex] NEXT_PUBLIC_CONVEX_URL is not a valid URL:', trimmedUrl, error);
    }
    return false;
  }
}

// Create Convex client if URL is valid
const isValidUrl = isValidConvexUrl(convexUrl);
export const convex = isValidUrl
  ? new ConvexReactClient(convexUrl!)
  : null;

// Log initialization status (always log in browser for debugging)
if (typeof window !== 'undefined') {
  if (convex) {
    console.log('[Convex] ✅ Client initialized successfully');
    console.log('[Convex] URL:', convexUrl);
  } else {
    console.error('[Convex] ❌ Client not initialized');
    console.error('[Convex] NEXT_PUBLIC_CONVEX_URL:', convexUrl || 'NOT SET');
    console.error('[Convex] URL validation result:', isValidUrl);
    console.error('[Convex] typeof convexUrl:', typeof convexUrl);
    console.error('[Convex] convexUrl === undefined:', convexUrl === undefined);
    console.error('[Convex] convexUrl === null:', convexUrl === null);
    console.error('[Convex] convexUrl === ""', convexUrl === '');
    if (convexUrl) {
      console.error('[Convex] URL value:', JSON.stringify(convexUrl));
      console.error('[Convex] URL length:', convexUrl.length);
      console.error('[Convex] URL trimmed:', JSON.stringify(convexUrl.trim()));
      console.error('[Convex] URL starts with https:', convexUrl.trim().startsWith('https://'));
      console.error('[Convex] URL ends with .convex.cloud:', convexUrl.trim().endsWith('.convex.cloud'));
    } else {
      console.error('[Convex] ⚠️ CRITICAL: NEXT_PUBLIC_CONVEX_URL is not embedded in the build!');
      console.error('[Convex] ⚠️ This means the variable was not set in Vercel when the build happened.');
      console.error('[Convex] ⚠️ Solution: Set NEXT_PUBLIC_CONVEX_URL in Vercel, then CLEAR BUILD CACHE and redeploy.');
    }
  }
}
