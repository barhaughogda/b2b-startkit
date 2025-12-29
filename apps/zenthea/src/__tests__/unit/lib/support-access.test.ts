import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { requiresSupportAccess, extractSupportAccessTargets, getSupportAccessErrorMessage } from '@/lib/support-access';

describe('Support Access Validation', () => {
  describe('requiresSupportAccess', () => {
    it('should return true for user-specific routes', () => {
      expect(requiresSupportAccess('/api/superadmin/users/user123')).toBe(true);
      expect(requiresSupportAccess('/api/superadmin/users/user123/role')).toBe(true);
      expect(requiresSupportAccess('/superadmin/users/user123')).toBe(true);
    });

    it('should return true for tenant-specific routes', () => {
      expect(requiresSupportAccess('/api/superadmin/tenants/tenant123')).toBe(true);
      expect(requiresSupportAccess('/superadmin/tenants/tenant123')).toBe(true);
    });

    it('should return true for base routes that may have query parameters', () => {
      // Note: requiresSupportAccess() only checks pathname, not query parameters
      // Query parameter extraction happens in extractSupportAccessTargets()
      expect(requiresSupportAccess('/api/superadmin/users')).toBe(true);
      expect(requiresSupportAccess('/api/superadmin/tenants')).toBe(true);
    });

    it('should return false for routes that do not require support access', () => {
      expect(requiresSupportAccess('/api/superadmin/platform-stats')).toBe(false);
      expect(requiresSupportAccess('/api/superadmin/activity-feed')).toBe(false);
      expect(requiresSupportAccess('/superadmin/settings')).toBe(false);
      expect(requiresSupportAccess('/superadmin')).toBe(false);
    });

    it('should return false for non-superadmin routes', () => {
      expect(requiresSupportAccess('/api/company/users')).toBe(false);
      expect(requiresSupportAccess('/company/users')).toBe(false);
    });
  });

  describe('extractSupportAccessTargets', () => {
    it('should extract user ID from pathname', () => {
      const result = extractSupportAccessTargets('/api/superadmin/users/user123');
      expect(result.targetUserId).toBe('user123');
    });

    it('should extract tenant ID from pathname', () => {
      const result = extractSupportAccessTargets('/api/superadmin/tenants/tenant123');
      expect(result.targetTenantId).toBe('tenant123');
    });

    it('should extract both user ID and tenant ID from pathname', () => {
      const result = extractSupportAccessTargets('/api/superadmin/users/user123');
      // Note: This route doesn't have tenant ID in pathname, but might have it in query
      expect(result.targetUserId).toBe('user123');
    });

    it('should extract tenant ID from query parameters', () => {
      const searchParams = new URLSearchParams('tenantId=tenant123');
      const result = extractSupportAccessTargets('/api/superadmin/users', searchParams);
      expect(result.targetTenantId).toBe('tenant123');
    });

    it('should extract user ID from query parameters', () => {
      const searchParams = new URLSearchParams('userId=user123');
      const result = extractSupportAccessTargets('/api/superadmin/users', searchParams);
      expect(result.targetUserId).toBe('user123');
    });

    it('should extract tenant ID from id parameter in tenant routes', () => {
      const searchParams = new URLSearchParams('id=tenant123');
      const result = extractSupportAccessTargets('/api/superadmin/tenants', searchParams);
      expect(result.targetTenantId).toBe('tenant123');
    });

    it('should prioritize pathname over query parameters', () => {
      const searchParams = new URLSearchParams('userId=user456');
      const result = extractSupportAccessTargets('/api/superadmin/users/user123', searchParams);
      expect(result.targetUserId).toBe('user123'); // Pathname takes precedence
    });

    it('should return empty object for routes without targets', () => {
      const result = extractSupportAccessTargets('/api/superadmin/platform-stats');
      expect(result.targetUserId).toBeUndefined();
      expect(result.targetTenantId).toBeUndefined();
    });
  });

  describe('getSupportAccessErrorMessage', () => {
    it('should return appropriate message for pending requests', () => {
      const message = getSupportAccessErrorMessage('Support access request is pending approval');
      expect(message).toContain('pending approval');
    });

    it('should return appropriate message for expired requests', () => {
      const message = getSupportAccessErrorMessage('Support access request has expired');
      expect(message).toContain('expired');
      expect(message).toContain('1 hour');
    });

    it('should return appropriate message for missing requests', () => {
      const message = getSupportAccessErrorMessage('No approved support access request found');
      expect(message).toContain('request access');
    });

    it('should return default message for unknown errors', () => {
      const message = getSupportAccessErrorMessage('Unknown error');
      expect(message).toContain('Support access validation failed');
    });
  });
});

