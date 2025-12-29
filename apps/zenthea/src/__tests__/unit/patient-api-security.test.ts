import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { PatientAPISecurity } from '@/lib/patient-api-security';

describe('Patient API Security', () => {
  let security: PatientAPISecurity;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Set up environment variable for JWT verification
    process.env.NEXTAUTH_SECRET = 'test-secret-key';
    
    security = new PatientAPISecurity({
      rateLimits: {
        auth: { limit: 5, windowMs: 60000 },
        general: { limit: 100, windowMs: 60000 },
        fileUpload: { limit: 10, windowMs: 60000 }
      },
      tenantIsolation: true,
      hipaaCompliance: true
    });

    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoicGF0aWVudEBleGFtcGxlLmNvbSIsInJvbGUiOiJwYXRpZW50IiwidGVuYW50SWQiOiJ0ZW5hbnQtMTIzIn0.test',
        'x-tenant-id': 'test-tenant',
        'user-agent': 'test-agent'
      }
    });
  });

  describe('Authentication', () => {
    it.skip('should extract valid auth context from JWT token', () => {
      // TODO: Fix JWT mocking issue
      const authContext = security.extractAuthContext(mockRequest);
      
      expect(authContext).toEqual({
        userId: 'user-123',
        email: 'patient@example.com',
        role: 'patient',
        tenantId: 'tenant-123'
      });
    });

    it.skip('should return null for invalid token', async () => {
      // TODO: Fix JWT mocking issue
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const authContext = security.extractAuthContext(mockRequest);
      expect(authContext).toBeNull();
    });

    it('should return null for missing authorization header', () => {
      const requestWithoutAuth = new NextRequest('http://localhost:3000/api/test');
      const authContext = security.extractAuthContext(requestWithoutAuth);
      expect(authContext).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    const authContext = {
      userId: 'user-123',
      email: 'patient@example.com',
      role: 'patient',
      tenantId: 'tenant-123'
    };

    it('should allow access when tenant IDs match', () => {
      const isValid = security.validateTenantAccess(authContext, 'tenant-123');
      expect(isValid).toBe(true);
    });

    it('should deny access when tenant IDs do not match', () => {
      const isValid = security.validateTenantAccess(authContext, 'different-tenant');
      expect(isValid).toBe(false);
    });

    it('should allow access when using token tenant ID', () => {
      const isValid = security.validateTenantAccess(authContext, null);
      expect(isValid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const identifier = 'test-user';
      const limit = 5;
      const windowMs = 60000;

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const allowed = security.checkRateLimit(identifier, limit, windowMs);
        expect(allowed).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-user-2';
      const limit = 3;
      const windowMs = 60000;

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const allowed = security.checkRateLimit(identifier, limit, windowMs);
        expect(allowed).toBe(true);
      }

      // 4th request should be blocked
      const allowed = security.checkRateLimit(identifier, limit, windowMs);
      expect(allowed).toBe(false);
    });
  });

  describe('Role Validation', () => {
    it('should validate patient role', () => {
      const authContext = {
        userId: 'user-123',
        email: 'patient@example.com',
        role: 'patient',
        tenantId: 'tenant-123'
      };

      const isValid = security.validatePatientRole(authContext);
      expect(isValid).toBe(true);
    });

    it('should reject non-patient roles', () => {
      const authContext = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        tenantId: 'tenant-123'
      };

      const isValid = security.validatePatientRole(authContext);
      expect(isValid).toBe(false);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should sanitize sensitive data', () => {
      const sensitiveData = {
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        medicalRecord: 'Normal blood pressure'
      };

      const sanitized = security.sanitizeForHIPAA(sensitiveData);
      
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.lastName).toBe('Doe');
      expect(sanitized.medicalRecord).toBe('Normal blood pressure');
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.creditCard).toBeUndefined();
    });

    it('should preserve non-sensitive data when HIPAA compliance is disabled', () => {
      const securityNoHIPAA = new PatientAPISecurity({
        rateLimits: {
          auth: { limit: 5, windowMs: 60000 },
          general: { limit: 100, windowMs: 60000 },
          fileUpload: { limit: 10, windowMs: 60000 }
        },
        tenantIsolation: true,
        hipaaCompliance: false
      });

      const sensitiveData = {
        firstName: 'John',
        ssn: '123-45-6789'
      };

      const sanitized = securityNoHIPAA.sanitizeForHIPAA(sensitiveData);
      expect(sanitized.ssn).toBe('123-45-6789');
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const data = { email: 'test@example.com' };
      const rules = {
        email: { required: true, type: 'email' as const },
        firstName: { required: true, type: 'string' as const }
      };

      const result = security.validateInput(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('should validate email format', () => {
      const data = { email: 'invalid-email' };
      const rules = {
        email: { required: true, type: 'email' as const }
      };

      const result = security.validateInput(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('should validate phone format', () => {
      const data = { phone: 'invalid-phone' };
      const rules = {
        phone: { required: true, type: 'phone' as const }
      };

      const result = security.validateInput(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('phone must be a valid phone number');
    });

    it('should validate string length', () => {
      const data = { password: '123' };
      const rules = {
        password: { required: true, minLength: 8 }
      };

      const result = security.validateInput(data, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('password must be at least 8 characters');
    });

    it('should pass validation for valid data', () => {
      const data = {
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'password123'
      };
      const rules = {
        email: { required: true, type: 'email' as const },
        phone: { required: true, type: 'phone' as const },
        password: { required: true, minLength: 8 }
      };

      const result = security.validateInput(data, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Audit Logging', () => {
    it('should generate audit log entry', () => {
      const authContext = {
        userId: 'user-123',
        email: 'patient@example.com',
        role: 'patient',
        tenantId: 'tenant-123'
      };

      const auditLog = security.generateAuditLog(
        'VIEW_RECORD',
        'health_record',
        'record-123',
        authContext,
        mockRequest,
        { recordType: 'vitals' }
      );

      expect(auditLog).toEqual({
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'VIEW_RECORD',
        resource: 'health_record',
        resourceId: 'record-123',
        details: { recordType: 'vitals' },
        ipAddress: 'unknown',
        userAgent: 'test-agent',
        timestamp: expect.any(String)
      });
    });
  });
});
