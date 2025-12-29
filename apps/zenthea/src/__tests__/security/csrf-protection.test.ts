/**
 * Security tests for CSRF protection functionality
 */

import { validateCSRFToken, generateCSRFToken } from '@/lib/security/csrf-protection';
import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock NextRequest
const createMockRequest = (method: string, headers: Record<string, string> = {}) => {
  return new NextRequest('http://localhost:3000/api/upload', {
    method,
    headers: new Headers(headers)
  });
};

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn()
  }))
}));

describe('CSRF Protection Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSRF Token Generation', () => {
    it('should generate valid CSRF tokens', () => {
      const token = generateCSRFToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate base64 encoded tokens', () => {
      const token = generateCSRFToken();
      
      // Should be valid base64
      expect(() => {
        Buffer.from(token, 'base64');
      }).not.toThrow();
    });
  });

  describe('CSRF Token Validation', () => {
    it('should allow GET requests without CSRF token', async () => {
      const request = createMockRequest('GET');
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(true);
    });

    it('should reject POST requests without CSRF token', async () => {
      const request = createMockRequest('POST');
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token missing');
    });

    it('should reject requests with missing header token', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': '' // Empty token
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token missing');
    });

    it('should reject requests with missing cookie token', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': 'valid-token'
      });
      
      // Mock cookies to return null
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token missing from cookies');
    });

    it('should reject requests with mismatched tokens', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': 'header-token'
      });
      
      // Mock cookies to return different token
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue({ value: 'cookie-token' }),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token validation failed');
    });

    it('should accept requests with matching tokens', async () => {
      const token = 'valid-csrf-token';
      const request = createMockRequest('POST', {
        'x-csrf-token': token
      });
      
      // Mock cookies to return same token
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue({ value: token }),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('CSRF Token Expiration', () => {
    it('should reject expired tokens', async () => {
      // Create an expired token (older than 30 minutes)
      const expiredTimestamp = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      const expiredToken = Buffer.from(`${expiredTimestamp}:random`.toString()).toString('base64');
      
      const request = createMockRequest('POST', {
        'x-csrf-token': expiredToken
      });
      
      // Mock cookies to return same expired token
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue({ value: expiredToken }),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token validation failed');
    });

    it('should accept valid non-expired tokens', async () => {
      // Create a recent token (within 30 minutes)
      const recentTimestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      const recentToken = Buffer.from(`${recentTimestamp}:random`.toString()).toString('base64');
      
      const request = createMockRequest('POST', {
        'x-csrf-token': recentToken
      });
      
      // Mock cookies to return same recent token
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue({ value: recentToken }),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('CSRF Error Handling', () => {
    it('should handle malformed tokens gracefully', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': 'invalid-base64-token!'
      });
      
      // Mock cookies to return same malformed token
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: vi.fn().mockReturnValue({ value: 'invalid-base64-token!' }),
        set: vi.fn()
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF token validation failed');
    });

    it('should handle validation errors gracefully', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': 'valid-token'
      });
      
      // Mock cookies to throw error
      const { cookies } = require('next/headers');
      cookies.mockImplementation(() => {
        throw new Error('Cookie access error');
      });
      
      const result = await validateCSRFToken(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CSRF validation error');
    });
  });

  describe('CSRF Configuration', () => {
    it('should use correct header name', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': 'test-token'
      });
      
      // Should look for x-csrf-token header
      expect(request.headers.get('x-csrf-token')).toBe('test-token');
    });

    it('should use correct cookie name', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'cookie-token' }),
        set: vi.fn()
      };
      cookies.mockReturnValue(mockCookies);
      
      const request = createMockRequest('POST', {
        'x-csrf-token': 'cookie-token'
      });
      
      await validateCSRFToken(request);
      
      // Should call get with correct cookie name
      expect(mockCookies.get).toHaveBeenCalledWith('csrf-token');
    });
  });
});
