/**
 * Security tests for audit logging functionality
 */

import { 
  logAdminAction, 
  logFileUpload, 
  logAuthEvent, 
  logSecurityEvent,
  getAuditEvents,
  getAuditEventsByUser,
  getSecurityEvents
} from '@/lib/security/audit-logger';
import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock NextRequest
const createMockRequest = (headers: Record<string, string> = {}) => {
  return new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: new Headers(headers)
  });
};

describe('Audit Logging Security Tests', () => {
  beforeEach(() => {
    // Clear audit events before each test
    vi.clearAllMocks();
  });

  describe('Admin Action Logging', () => {
    it('should log successful admin actions', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'admin@example.com',
        'x-user-role': 'admin',
        'x-forwarded-for': '192.168.1.1'
      });

      await logAdminAction(
        request,
        'image_upload',
        'hero_image',
        { fileName: 'test.jpg', fileSize: 1024 },
        true
      );

      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
      
      const event = events[0];
      expect(event.action).toBe('image_upload');
      expect(event.resource).toBe('hero_image');
      expect(event.userId).toBe('user123');
      expect(event.userEmail).toBe('admin@example.com');
      expect(event.userRole).toBe('admin');
      expect(event.success).toBe(true);
      expect(event.ipAddress).toBe('192.168.1.1');
    });

    it('should log failed admin actions', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'admin@example.com',
        'x-user-role': 'admin'
      });

      await logAdminAction(
        request,
        'image_upload',
        'hero_image',
        { fileName: 'test.jpg' },
        false,
        'File too large'
      );

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.success).toBe(false);
      expect(event.errorMessage).toBe('File too large');
    });

    it('should sanitize sensitive information', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'admin@example.com',
        'x-user-role': 'admin'
      });

      await logAdminAction(
        request,
        'user_update',
        'user_profile',
        { 
          password: 'secret123',
          token: 'abc123',
          email: 'user@example.com'
        },
        true
      );

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.details.password).toBe('[REDACTED]');
      expect(event.details.token).toBe('[REDACTED]');
      expect(event.details.email).toBe('user@example.com'); // Not redacted
    });
  });

  describe('File Upload Logging', () => {
    it('should log successful file uploads', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'user@example.com'
      });

      await logFileUpload(
        request,
        'test.jpg',
        1024,
        'image/jpeg',
        true
      );

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('file_upload');
      expect(event.resource).toBe('file');
      expect(event.resourceId).toBe('test.jpg');
      expect(event.details.fileName).toBe('test.jpg');
      expect(event.details.fileSize).toBe(1024);
      expect(event.details.fileType).toBe('image/jpeg');
      expect(event.success).toBe(true);
    });

    it('should log failed file uploads', async () => {
      const request = createMockRequest();

      await logFileUpload(
        request,
        'malicious.exe',
        2048,
        'application/x-executable',
        false,
        'Invalid file type'
      );

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.success).toBe(false);
      expect(event.errorMessage).toBe('Invalid file type');
    });
  });

  describe('Authentication Event Logging', () => {
    it('should log login events', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'user@example.com'
      });

      await logAuthEvent(request, 'login', true);

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('auth_login');
      expect(event.resource).toBe('authentication');
      expect(event.success).toBe(true);
    });

    it('should log logout events', async () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
        'x-user-email': 'user@example.com'
      });

      await logAuthEvent(request, 'logout', true);

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('auth_logout');
      expect(event.success).toBe(true);
    });

    it('should log failed authentication attempts', async () => {
      const request = createMockRequest();

      await logAuthEvent(request, 'login', false, 'Invalid credentials');

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.success).toBe(false);
      expect(event.errorMessage).toBe('Invalid credentials');
    });
  });

  describe('Security Event Logging', () => {
    it('should log rate limit exceeded events', async () => {
      const request = createMockRequest();

      await logSecurityEvent(request, 'rate_limit_exceeded', {
        endpoint: '/api/upload',
        limit: 10,
        window: 900000
      });

      const events = getSecurityEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('security_rate_limit_exceeded');
      expect(event.resource).toBe('security');
      expect(event.success).toBe(false);
      expect(event.details.endpoint).toBe('/api/upload');
    });

    it('should log CSRF validation failures', async () => {
      const request = createMockRequest();

      await logSecurityEvent(request, 'csrf_validation_failed', {
        endpoint: '/api/upload'
      });

      const events = getSecurityEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('security_csrf_validation_failed');
      expect(event.details.endpoint).toBe('/api/upload');
    });

    it('should log invalid file type events', async () => {
      const request = createMockRequest();

      await logSecurityEvent(request, 'invalid_file_type', {
        fileName: 'malicious.exe',
        providedType: 'application/x-executable',
        allowedTypes: ['image/jpeg', 'image/png']
      });

      const events = getSecurityEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('security_invalid_file_type');
      expect(event.details.fileName).toBe('malicious.exe');
    });

    it('should log suspicious content events', async () => {
      const request = createMockRequest();

      await logSecurityEvent(request, 'suspicious_content', {
        fileName: 'malicious.jpg',
        warnings: ['File contains executable signatures']
      });

      const events = getSecurityEvents(1);
      const event = events[0];
      
      expect(event.action).toBe('security_suspicious_content');
      expect(event.details.warnings).toContain('File contains executable signatures');
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      // Create some test events
      const request1 = createMockRequest({ 'x-user-id': 'user1' });
      const request2 = createMockRequest({ 'x-user-id': 'user2' });
      const request3 = createMockRequest();

      await logAdminAction(request1, 'action1', 'resource1', {}, true);
      await logAdminAction(request2, 'action2', 'resource2', {}, true);
      await logSecurityEvent(request3, 'rate_limit_exceeded', {});
    });

    it('should retrieve all audit events', () => {
      const events = getAuditEvents(10);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should retrieve events by user', () => {
      const userEvents = getAuditEventsByUser('user1', 10);
      expect(userEvents.length).toBeGreaterThan(0);
      expect(userEvents.every(event => event.userId === 'user1')).toBe(true);
    });

    it('should retrieve security events', () => {
      const securityEvents = getSecurityEvents(10);
      expect(securityEvents.length).toBeGreaterThan(0);
      expect(securityEvents.every(event => event.action.startsWith('security_'))).toBe(true);
    });

    it('should limit results correctly', () => {
      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1'
      });

      await logAdminAction(request, 'test', 'test', {}, true);

      const events = getAuditEvents(1);
      expect(events[0].ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = createMockRequest({
        'x-real-ip': '203.0.113.1'
      });

      await logAdminAction(request, 'test', 'test', {}, true);

      const events = getAuditEvents(1);
      expect(events[0].ipAddress).toBe('203.0.113.1');
    });

    it('should extract IP from cf-connecting-ip header', async () => {
      const request = createMockRequest({
        'cf-connecting-ip': '198.51.100.1'
      });

      await logAdminAction(request, 'test', 'test', {}, true);

      const events = getAuditEvents(1);
      expect(events[0].ipAddress).toBe('198.51.100.1');
    });

    it('should default to unknown for missing IP', async () => {
      const request = createMockRequest();

      await logAdminAction(request, 'test', 'test', {}, true);

      const events = getAuditEvents(1);
      expect(events[0].ipAddress).toBe('unknown');
    });
  });

  describe('Event Timestamps', () => {
    it('should include timestamps in events', async () => {
      const request = createMockRequest();
      const beforeTime = new Date();

      await logAdminAction(request, 'test', 'test', {}, true);

      const events = getAuditEvents(1);
      const event = events[0];
      
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', async () => {
      // Mock a request that might cause errors
      const invalidRequest = {} as NextRequest;

      // Should not throw
      await expect(logAdminAction(invalidRequest, 'test', 'test', {}, true))
        .resolves.not.toThrow();
    });
  });
});
