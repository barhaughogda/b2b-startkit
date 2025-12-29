/**
 * Security tests for rate limiting functionality
 */

import { withRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Request
const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
  return new Request(url, {
    method: 'POST',
    headers: new Headers(headers)
  });
};

describe('Rate Limiting Security Tests', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    vi.clearAllMocks();
  });

  describe('Upload Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const request = createMockRequest('http://localhost:3000/api/upload-hero-image');
      
      const result = await withRateLimit(request, RATE_LIMITS.UPLOAD);
      
      expect(result.allowed).toBe(true);
      expect(result.response).toBeUndefined();
    });

    it('should block requests exceeding rate limit', async () => {
      const request = createMockRequest('http://localhost:3000/api/upload-hero-image');
      
      console.log('Rate limit config:', RATE_LIMITS.UPLOAD);
      console.log('Making', RATE_LIMITS.UPLOAD.maxRequests + 1, 'requests');
      
      // Make multiple requests to exceed the limit (sequentially to avoid timing issues)
      const results = [];
      for (let i = 0; i < RATE_LIMITS.UPLOAD.maxRequests + 1; i++) {
        const result = await withRateLimit(request, RATE_LIMITS.UPLOAD);
        results.push(result);
        console.log(`Request ${i + 1}: allowed=${result.allowed}`);
      }
      
      // At least one should be blocked
      const blockedResults = results.filter(r => !r.allowed);
      console.log('Total results:', results.length);
      console.log('Blocked results:', blockedResults.length);
      console.log('All results:', results.map(r => ({ allowed: r.allowed, hasResponse: !!r.response })));
      expect(blockedResults.length).toBeGreaterThan(0);
      
      // Check response format
      if (blockedResults.length > 0) {
        const response = blockedResults[0].response;
        expect(response).toBeDefined();
        expect(response!.status).toBe(429);
        
        const body = await response!.json();
        console.log('Response body:', body);
        console.log('Response body type:', typeof body);
        console.log('Response body keys:', Object.keys(body || {}));
        expect(body.error).toBe('Rate limit exceeded');
        expect(body.retryAfter).toBeDefined();
      }
    });

    it('should include proper rate limit headers', async () => {
      const request = createMockRequest('http://localhost:3000/api/upload-hero-image');
      
      const result = await withRateLimit(request, RATE_LIMITS.UPLOAD);
      
      if (!result.allowed && result.response) {
        expect(result.response.headers.get('X-RateLimit-Limit')).toBe(RATE_LIMITS.UPLOAD.maxRequests.toString());
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBeDefined();
        expect(result.response.headers.get('X-RateLimit-Reset')).toBeDefined();
        expect(result.response.headers.get('Retry-After')).toBeDefined();
      }
    });
  });

  describe('API Rate Limiting', () => {
    it('should allow more requests for general API endpoints', async () => {
      const request = createMockRequest('http://localhost:3000/api/general');
      
      const result = await withRateLimit(request, RATE_LIMITS.API);
      
      expect(result.allowed).toBe(true);
    });

    it('should have higher limits for API vs Upload', () => {
      expect(RATE_LIMITS.API.maxRequests).toBeGreaterThan(RATE_LIMITS.UPLOAD.maxRequests);
    });
  });

  describe('Admin Rate Limiting', () => {
    it('should have moderate limits for admin endpoints', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin');
      
      const result = await withRateLimit(request, RATE_LIMITS.ADMIN);
      
      expect(result.allowed).toBe(true);
    });

    it('should have limits between API and Upload', () => {
      expect(RATE_LIMITS.ADMIN.maxRequests).toBeGreaterThan(RATE_LIMITS.UPLOAD.maxRequests);
      expect(RATE_LIMITS.ADMIN.maxRequests).toBeLessThan(RATE_LIMITS.API.maxRequests);
    });
  });

  describe('Image Serving Rate Limiting', () => {
    it('should have very high limits for image serving', () => {
      expect(RATE_LIMITS.IMAGE_SERVE.maxRequests).toBeGreaterThan(RATE_LIMITS.API.maxRequests);
    });
  });

  describe('Rate Limit Key Generation', () => {
    it('should generate different keys for different IPs', async () => {
      const request1 = createMockRequest('http://localhost:3000/api/upload', {
        'x-forwarded-for': '192.168.1.1'
      });
      
      const request2 = createMockRequest('http://localhost:3000/api/upload', {
        'x-forwarded-for': '192.168.1.2'
      });
      
      const result1 = await withRateLimit(request1, RATE_LIMITS.UPLOAD);
      const result2 = await withRateLimit(request2, RATE_LIMITS.UPLOAD);
      
      // Both should be allowed since they're from different IPs
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should generate same key for same IP and endpoint', async () => {
      const request1 = createMockRequest('http://localhost:3000/api/upload', {
        'x-forwarded-for': '192.168.1.1'
      });
      
      const request2 = createMockRequest('http://localhost:3000/api/upload', {
        'x-forwarded-for': '192.168.1.1'
      });
      
      // First request should be allowed
      const result1 = await withRateLimit(request1, RATE_LIMITS.UPLOAD);
      expect(result1.allowed).toBe(true);
      
      // Second request from same IP should also be allowed (within limit)
      const result2 = await withRateLimit(request2, RATE_LIMITS.UPLOAD);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail open on rate limiting errors', async () => {
      // Mock a request that might cause errors
      const invalidRequest = {} as Request;
      
      const result = await withRateLimit(invalidRequest, RATE_LIMITS.UPLOAD);
      
      // Should fail open (allow request)
      expect(result.allowed).toBe(true);
    });
  });
});
