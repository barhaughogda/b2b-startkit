/**
 * Rate limiting utility for API endpoints
 * Implements sliding window rate limiting with Redis-like in-memory storage
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    key: string, 
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create entry
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Increment counter
    entry.count++;
    
    // Check if within limit (after incrementing)
    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Generate rate limit key from request
   */
  generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default: IP-based rate limiting
    const ip = this.getClientIP(req);
    const endpoint = new URL(req.url).pathname;
    return `${ip}:${endpoint}`;
  }

  /**
   * Extract client IP from request
   * Uses shared utility for consistent IP extraction across the codebase
   * Note: This method accepts Request (not NextRequest) for compatibility
   */
  private getClientIP(req: Request): string {
    // Convert Request to NextRequest-like object for shared utility
    // The shared utility expects NextRequest, but we can adapt
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    // Use same logic as shared utility but adapted for Request type
    if (cfConnectingIP) return cfConnectingIP.trim();
    if (forwarded) {
      const firstIp = forwarded.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
    if (realIP) return realIP.trim();
    
    // Fallback to connection IP (in server environment)
    return 'unknown';
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware for API routes
 */
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<{ allowed: boolean; response?: Response }> {
  try {
    const key = rateLimiter.generateKey(req, config);
    const result = await rateLimiter.checkLimit(key, config);

    if (!result.allowed) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetTime.toString()
            }
          }
        )
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Upload endpoints - more restrictive
  UPLOAD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 uploads per 15 minutes
  },
  
  // General API endpoints
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },
  
  // Admin endpoints - more permissive but still limited
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 50 requests per 15 minutes
  },
  
  // Image serving - very permissive
  IMAGE_SERVE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
  }
} as const;

export default rateLimiter;
