/**
 * CSRF protection utilities for API endpoints
 * Implements double-submit cookie pattern for stateless CSRF protection
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

interface CSRFConfig {
  cookieName: string;
  headerName: string;
  secret: string;
  maxAge: number; // in milliseconds
}

class CSRFProtection {
  private config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = config;
  }

  /**
   * Generate a CSRF token
   */
  generateToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const payload = `${timestamp}:${random}`;
    
    // In production, use proper HMAC with secret
    const token = Buffer.from(payload).toString('base64');
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateToken(token: string, cookieToken: string): boolean {
    if (!token || !cookieToken) {
      return false;
    }

    // Tokens must match exactly
    if (token !== cookieToken) {
      return false;
    }

    // Check if token is expired (optional - for extra security)
    try {
      const payload = Buffer.from(token, 'base64').toString();
      const [timestamp] = payload.split(':');
      const tokenAge = Date.now() - parseInt(timestamp);
      
      if (tokenAge > this.config.maxAge) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * Set CSRF token cookie
   */
  setCSRFCookie(token: string): void {
    const cookieStore = cookies();
    cookieStore.set(this.config.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.config.maxAge / 1000, // Convert to seconds
      path: '/'
    });
  }

  /**
   * Get CSRF token from cookie
   */
  getCSRFCookie(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(this.config.cookieName)?.value || null;
  }

  /**
   * Middleware to validate CSRF token
   */
  async validateRequest(req: NextRequest): Promise<{ valid: boolean; error?: string }> {
    try {
      // Skip CSRF for GET requests
      if (req.method === 'GET') {
        return { valid: true };
      }

      // Get token from header
      const token = req.headers.get(this.config.headerName);
      if (!token) {
        return { 
          valid: false, 
          error: 'CSRF token missing from request headers' 
        };
      }

      // Get token from cookie
      const cookieToken = this.getCSRFCookie();
      if (!cookieToken) {
        return { 
          valid: false, 
          error: 'CSRF token missing from cookies' 
        };
      }

      // Validate tokens match
      if (!this.validateToken(token, cookieToken)) {
        return { 
          valid: false, 
          error: 'CSRF token validation failed' 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('CSRF validation error:', error);
      return { 
        valid: false, 
        error: 'CSRF validation error' 
      };
    }
  }
}

// Default CSRF configuration
const defaultConfig: CSRFConfig = {
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  maxAge: 30 * 60 * 1000, // 30 minutes
};

// Singleton instance
const csrfProtection = new CSRFProtection(defaultConfig);

/**
 * Generate and set CSRF token
 */
export function generateCSRFToken(): string {
  const token = csrfProtection.generateToken();
  csrfProtection.setCSRFCookie(token);
  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(req: NextRequest): Promise<{ valid: boolean; error?: string }> {
  return csrfProtection.validateRequest(req);
}

/**
 * CSRF protection middleware for API routes
 */
export async function withCSRFProtection(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
): Promise<Response> {
  const validation = await validateCSRFToken(req);
  
  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        error: 'CSRF validation failed',
        message: validation.error || 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }

  return handler(req);
}

/**
 * Get CSRF token for client-side use
 */
export function getCSRFToken(): string | null {
  return csrfProtection.getCSRFCookie();
}

export default csrfProtection;
