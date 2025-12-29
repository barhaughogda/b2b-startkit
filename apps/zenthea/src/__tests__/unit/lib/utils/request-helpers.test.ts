/**
 * Tests for Request Helper Utilities
 * 
 * Tests IP address and user agent extraction from Next.js requests
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { extractClientIP, extractUserAgent } from '@/lib/utils/request-helpers';

describe('Request Helpers', () => {
  describe('extractClientIP', () => {
    it('should use provided IP address when available', () => {
      const request = new NextRequest('http://localhost');
      const providedIp = '192.168.1.100';

      const result = extractClientIP(request, providedIp);

      expect(result).toBe(providedIp);
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'cf-connecting-ip': '192.168.1.1',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should prefer cf-connecting-ip over x-forwarded-for', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'cf-connecting-ip': '192.168.1.1',
          'x-forwarded-for': '10.0.0.1',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from x-forwarded-for header (first IP)', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should trim whitespace from x-forwarded-for IP', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('203.0.113.1');
    });

    it('should trim whitespace from x-real-ip', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-real-ip': '  203.0.113.1  ',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('203.0.113.1');
    });

    it('should use request.ip when no headers present', () => {
      const request = new NextRequest('http://localhost');
      // Mock request.ip property
      Object.defineProperty(request, 'ip', {
        value: '127.0.0.1',
        writable: true,
        configurable: true,
      });

      const result = extractClientIP(request);

      expect(result).toBe('127.0.0.1');
    });

    it('should return "unknown" when no IP information available', () => {
      const request = new NextRequest('http://localhost');

      const result = extractClientIP(request);

      expect(result).toBe('unknown');
    });

    it('should check headers in correct priority order', () => {
      // Test that cf-connecting-ip is checked first
      const request1 = new NextRequest('http://localhost', {
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2',
          'x-real-ip': '3.3.3.3',
        },
      });
      expect(extractClientIP(request1)).toBe('1.1.1.1');

      // Test that x-forwarded-for is checked second
      const request2 = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '2.2.2.2',
          'x-real-ip': '3.3.3.3',
        },
      });
      expect(extractClientIP(request2)).toBe('2.2.2.2');

      // Test that x-real-ip is checked third
      const request3 = new NextRequest('http://localhost', {
        headers: {
          'x-real-ip': '3.3.3.3',
        },
      });
      expect(extractClientIP(request3)).toBe('3.3.3.3');
    });

    it('should handle empty x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('unknown');
    });

    it('should handle x-forwarded-for with only whitespace', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '   ,  ',
        },
      });

      const result = extractClientIP(request);

      expect(result).toBe('unknown');
    });
  });

  describe('extractUserAgent', () => {
    it('should use provided user agent when available', () => {
      const request = new NextRequest('http://localhost');
      const providedUserAgent = 'Custom User Agent String';

      const result = extractUserAgent(request, providedUserAgent);

      expect(result).toBe(providedUserAgent);
    });

    it('should extract user agent from headers', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const result = extractUserAgent(request);

      expect(result).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    });

    it('should return "unknown" when no user agent header', () => {
      const request = new NextRequest('http://localhost');

      const result = extractUserAgent(request);

      expect(result).toBe('unknown');
    });

    it('should return "unknown" when user agent header is empty', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'user-agent': '',
        },
      });

      const result = extractUserAgent(request);

      expect(result).toBe('unknown');
    });

    it('should prefer provided user agent over header', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'user-agent': 'Header User Agent',
        },
      });
      const providedUserAgent = 'Provided User Agent';

      const result = extractUserAgent(request, providedUserAgent);

      expect(result).toBe(providedUserAgent);
    });
  });
});

