import { describe, it, expect } from 'vitest';
import { ROLE_PATH_MAP, isPathAllowedForRole } from '@/lib/auth-constants';

describe('auth-constants - Booking Flow Support', () => {
  describe('ROLE_PATH_MAP', () => {
    it('allows patients to access /patient paths', () => {
      expect(ROLE_PATH_MAP.patient).toContain('/patient');
    });

    it('allows patients to access /clinic paths for booking flow redirect', () => {
      expect(ROLE_PATH_MAP.patient).toContain('/clinic');
    });
  });

  describe('isPathAllowedForRole', () => {
    it('allows patient to access /patient/dashboard', () => {
      expect(isPathAllowedForRole('/patient/dashboard', 'patient')).toBe(true);
    });

    it('allows patient to access /clinic/acme/book', () => {
      expect(isPathAllowedForRole('/clinic/acme/book', 'patient')).toBe(true);
    });

    it('allows patient to access /clinic/acme/book with booking state', () => {
      expect(isPathAllowedForRole('/clinic/acme/book?bookingState=...', 'patient')).toBe(true);
    });

    it('does not allow patient to access /company paths', () => {
      expect(isPathAllowedForRole('/company/dashboard', 'patient')).toBe(false);
    });

    it('does not allow patient to access /superadmin paths', () => {
      expect(isPathAllowedForRole('/superadmin', 'patient')).toBe(false);
    });

    it('allows provider to access /company paths', () => {
      expect(isPathAllowedForRole('/company/calendar', 'provider')).toBe(true);
    });

    it('does not allow provider to access /patient paths', () => {
      expect(isPathAllowedForRole('/patient/dashboard', 'provider')).toBe(false);
    });
  });

  describe('Booking redirect validation', () => {
    it('validates booking redirect URL for patient role', () => {
      const bookingRedirectPath = '/clinic/test-clinic/book?bookingState=%7B%22serviceId%22%3A%22svc-1%22%7D';
      expect(isPathAllowedForRole(bookingRedirectPath, 'patient')).toBe(true);
    });

    it('validates booking redirect URL without query params', () => {
      const bookingRedirectPath = '/clinic/test-clinic/book';
      expect(isPathAllowedForRole(bookingRedirectPath, 'patient')).toBe(true);
    });

    it('validates clinic landing page for patient role', () => {
      const landingPath = '/clinic/test-clinic';
      expect(isPathAllowedForRole(landingPath, 'patient')).toBe(true);
    });
  });
});

