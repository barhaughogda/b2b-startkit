import { describe, it, expect } from 'vitest';
import {
  getRequiredPermission,
  getPermissionDescription,
  COMPANY_ROUTE_PERMISSIONS,
  COMPANY_API_ROUTE_PERMISSIONS,
} from '@/lib/route-permissions';

describe('Route Permissions', () => {
  describe('getRequiredPermission', () => {
    describe('Page routes', () => {
      it('should return dashboard permission for /company', () => {
        expect(getRequiredPermission('/company')).toBe('dashboard');
      });

      it('should return dashboard permission for /company/dashboard', () => {
        expect(getRequiredPermission('/company/dashboard')).toBe('dashboard');
      });

      it('should return patients list permission for /company/patients', () => {
        expect(getRequiredPermission('/company/patients')).toBe('patients.features.list');
      });

      it('should return patients create permission for /company/patients/new', () => {
        expect(getRequiredPermission('/company/patients/new')).toBe('patients.features.create');
      });

      it('should return patients view permission for /company/patients/[id]', () => {
        expect(getRequiredPermission('/company/patients/123')).toBe('patients.features.view');
      });

      it('should return patients edit permission for /company/patients/[id]/edit', () => {
        expect(getRequiredPermission('/company/patients/123/edit')).toBe('patients.features.edit');
      });

      it('should return appointments calendar permission for /company/appointments', () => {
        expect(getRequiredPermission('/company/appointments')).toBe('appointments.features.calendar');
      });

      it('should return appointments create permission for /company/appointments/new', () => {
        expect(getRequiredPermission('/company/appointments/new')).toBe('appointments.features.create');
      });

      it('should return settings permission for /company/settings', () => {
        expect(getRequiredPermission('/company/settings')).toBe('settings.enabled');
      });

      it('should return users view permission for /company/settings/users', () => {
        expect(getRequiredPermission('/company/settings/users')).toBe('settings.features.users.view');
      });

      it('should return roles view permission for /company/settings/roles', () => {
        expect(getRequiredPermission('/company/settings/roles')).toBe('settings.features.roles.view');
      });

      it('should return departments view permission for /company/settings/departments', () => {
        expect(getRequiredPermission('/company/settings/departments')).toBe('settings.features.departments.view');
      });

      it('should return medical records permission for /company/medical-records', () => {
        expect(getRequiredPermission('/company/medical-records')).toBe('medical_records.features.encounters.view');
      });

      it('should return billing permission for /company/billing', () => {
        expect(getRequiredPermission('/company/billing')).toBe('billing.features.claims.view');
      });

      it('should return reports permission for /company/reports', () => {
        expect(getRequiredPermission('/company/reports')).toBe('reports.features.clinical');
      });

      it('should handle routes with trailing slashes', () => {
        expect(getRequiredPermission('/company/patients/')).toBe('patients.features.list');
      });

      it('should return dashboard permission for unknown company routes', () => {
        expect(getRequiredPermission('/company/unknown-route')).toBe('dashboard');
      });

      it('should return null for non-company routes', () => {
        expect(getRequiredPermission('/patient/dashboard')).toBeNull();
        expect(getRequiredPermission('/admin/dashboard')).toBeNull();
        expect(getRequiredPermission('/')).toBeNull();
      });
    });

    describe('API routes', () => {
      it('should return users view permission for GET /api/company/users', () => {
        expect(getRequiredPermission('/api/company/users', 'GET')).toBe('settings.features.users.view');
      });

      it('should return users create permission for POST /api/company/users', () => {
        expect(getRequiredPermission('/api/company/users', 'POST')).toBe('settings.features.users.create');
      });

      it('should return users edit permission for PUT /api/company/users', () => {
        expect(getRequiredPermission('/api/company/users', 'PUT')).toBe('settings.features.users.edit');
      });

      it('should return users delete permission for DELETE /api/company/users', () => {
        expect(getRequiredPermission('/api/company/users', 'DELETE')).toBe('settings.features.users.delete');
      });

      it('should return users invite permission for POST /api/company/invitations', () => {
        expect(getRequiredPermission('/api/company/invitations', 'POST')).toBe('settings.features.users.invite');
      });

      it('should return users view permission for GET /api/company/invitations', () => {
        expect(getRequiredPermission('/api/company/invitations', 'GET')).toBe('settings.features.users.view');
      });

      it('should return null for public invitation acceptance route', () => {
        expect(getRequiredPermission('/api/company/invitations/accept/abc123', 'POST')).toBeNull();
      });

      it('should return roles view permission for GET /api/company/roles', () => {
        expect(getRequiredPermission('/api/company/roles', 'GET')).toBe('settings.features.roles.view');
      });

      it('should return roles create permission for POST /api/company/roles', () => {
        expect(getRequiredPermission('/api/company/roles', 'POST')).toBe('settings.features.roles.create');
      });

      it('should return patients list permission for GET /api/company/patients', () => {
        expect(getRequiredPermission('/api/company/patients', 'GET')).toBe('patients.features.list');
      });

      it('should return patients create permission for POST /api/company/patients', () => {
        expect(getRequiredPermission('/api/company/patients', 'POST')).toBe('patients.features.create');
      });

      it('should return appointments view permission for GET /api/company/appointments', () => {
        expect(getRequiredPermission('/api/company/appointments', 'GET')).toBe('appointments.features.view');
      });

      it('should return appointments create permission for POST /api/company/appointments', () => {
        expect(getRequiredPermission('/api/company/appointments', 'POST')).toBe('appointments.features.create');
      });

      it('should handle dynamic API routes', () => {
        expect(getRequiredPermission('/api/company/patients/123', 'GET')).toBe('patients.features.list');
        expect(getRequiredPermission('/api/company/patients/123', 'PUT')).toBe('patients.features.edit');
        expect(getRequiredPermission('/api/company/patients/123', 'DELETE')).toBe('patients.features.delete');
      });
    });
  });

  describe('getPermissionDescription', () => {
    it('should return description for known page routes', () => {
      expect(getPermissionDescription('/company/patients')).toBe('Access to patients list');
      expect(getPermissionDescription('/company/settings/users')).toBe('View user management (owner only)');
      expect(getPermissionDescription('/company/settings/roles')).toBe('View custom roles (owner only)');
    });

    it('should return description for known API routes', () => {
      expect(getPermissionDescription('/api/company/users')).toBe('Access to users API (owner only)');
      expect(getPermissionDescription('/api/company/patients')).toBe('Access to patients API');
    });

    it('should return default description for unknown routes', () => {
      expect(getPermissionDescription('/company/unknown')).toBe('Access to company area');
      expect(getPermissionDescription('/api/company/unknown')).toBe('Access to company API');
    });
  });

  describe('Route permission mappings', () => {
    it('should have permission mappings for all major company routes', () => {
      expect(COMPANY_ROUTE_PERMISSIONS['/company']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/patients']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/appointments']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/settings']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/medical-records']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/billing']).toBeDefined();
      expect(COMPANY_ROUTE_PERMISSIONS['/company/reports']).toBeDefined();
    });

    it('should have permission mappings for all major company API routes', () => {
      expect(COMPANY_API_ROUTE_PERMISSIONS['/api/company/users']).toBeDefined();
      expect(COMPANY_API_ROUTE_PERMISSIONS['/api/company/roles']).toBeDefined();
      expect(COMPANY_API_ROUTE_PERMISSIONS['/api/company/departments']).toBeDefined();
      expect(COMPANY_API_ROUTE_PERMISSIONS['/api/company/patients']).toBeDefined();
      expect(COMPANY_API_ROUTE_PERMISSIONS['/api/company/appointments']).toBeDefined();
    });

    it('should have descriptions for all route permissions', () => {
      Object.values(COMPANY_ROUTE_PERMISSIONS).forEach((config) => {
        expect(config.description).toBeDefined();
        expect(config.description.length).toBeGreaterThan(0);
      });

      Object.values(COMPANY_API_ROUTE_PERMISSIONS).forEach((config) => {
        expect(config.description).toBeDefined();
        expect(config.description.length).toBeGreaterThan(0);
      });
    });
  });
});

