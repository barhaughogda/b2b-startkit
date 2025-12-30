/**
 * Request helper utilities
 * 
 * Shared utilities for extracting information from Next.js requests,
 * particularly for security and audit logging purposes.
 */

import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers
 * 
 * Checks headers in order of reliability:
 * 1. cf-connecting-ip (Cloudflare) - most reliable on Cloudflare/Vercel
 * 2. x-forwarded-for (standard proxy header) - takes first IP in chain
 * 3. x-real-ip (nginx/other proxies)
 * 4. request.ip (direct connection)
 * 5. 'unknown' (fallback)
 * 
 * @param request - Next.js request object
 * @param providedIp - Optional IP address provided in request body (for client-side calls)
 * @returns Client IP address string
 */
export function extractClientIP(
  request: NextRequest,
  providedIp?: string
): string {
  // Use provided IP if available (from client-side calls)
  if (providedIp) {
    return providedIp;
  }

  // Check Cloudflare header first (most reliable on Vercel/Cloudflare)
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Check x-forwarded-for header (standard proxy header)
  // Take first IP in chain (original client IP)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  // Check x-real-ip header (nginx/other proxies)
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to request.ip (direct connection)
  const ip = (request as any).ip;
  if (ip) {
    return ip;
  }

  // Final fallback
  return 'unknown';
}

/**
 * Extract user agent from request headers
 * 
 * @param request - Next.js request object
 * @param providedUserAgent - Optional user agent provided in request body
 * @returns User agent string
 */
export function extractUserAgent(
  request: NextRequest,
  providedUserAgent?: string
): string {
  if (providedUserAgent) {
    return providedUserAgent;
  }

  const userAgent = request.headers.get('user-agent');
  return userAgent || 'unknown';
}

