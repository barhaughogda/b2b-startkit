import type { PermissionTree } from '@/types';

/**
 * Route-to-permission mapping for granular access control
 * Maps company routes to their required permission paths
 * 
 * Permission paths follow the format: section.features.featureName
 * or section.features.featureName.components.componentName.tabs.tabName
 */
export interface RoutePermission {
  /** The permission path required for this route (e.g., "patients.features.list") */
  permissionPath: string;
  /** Optional: More specific permission path for sub-routes */
  subRoutes?: Record<string, string>;
  /** Human-readable description of what this permission grants */
  description: string;
}

/**
 * Route-to-permission mapping for company routes
 * Routes are matched in order (most specific first)
 */
export const COMPANY_ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Dashboard - requires any company access
  '/company': {
    permissionPath: 'dashboard',
    description: 'Access to company dashboard',
  },
  '/company/dashboard': {
    permissionPath: 'dashboard',
    description: 'Access to company dashboard',
  },
  '/company/today': {
    permissionPath: 'dashboard',
    description: 'Access to today\'s schedule and tasks',
  },

  // Patients section
  '/company/patients': {
    permissionPath: 'patients.features.list',
    description: 'Access to patients list',
    subRoutes: {
      '/company/patients/new': 'patients.features.create',
      '/company/patients/[id]': 'patients.features.view',
      '/company/patients/[id]/edit': 'patients.features.edit',
    },
  },
  '/company/patients/new': {
    permissionPath: 'patients.features.create',
    description: 'Create new patients',
  },
  '/company/patients/[id]': {
    permissionPath: 'patients.features.view',
    description: 'View patient details',
  },
  '/company/patients/[id]/edit': {
    permissionPath: 'patients.features.edit',
    description: 'Edit patient information',
  },

  // Appointments section
  '/company/appointments': {
    permissionPath: 'appointments.features.calendar',
    description: 'Access to appointments calendar',
    subRoutes: {
      '/company/appointments/new': 'appointments.features.create',
      '/company/appointments/[id]': 'appointments.features.view',
      '/company/appointments/[id]/edit': 'appointments.features.edit',
    },
  },
  '/company/calendar': {
    permissionPath: 'appointments.features.calendar',
    description: 'Access to calendar view',
  },
  '/company/appointments/new': {
    permissionPath: 'appointments.features.create',
    description: 'Create new appointments',
  },
  '/company/appointments/[id]': {
    permissionPath: 'appointments.features.view',
    description: 'View appointment details',
  },
  '/company/appointments/[id]/edit': {
    permissionPath: 'appointments.features.edit',
    description: 'Edit appointment details',
  },

  // Messages section
  '/company/messages': {
    permissionPath: 'messages.features.view',
    description: 'Access to messages inbox',
    subRoutes: {
      '/company/messages/new': 'messages.features.send',
    },
  },
  '/company/messages/new': {
    permissionPath: 'messages.features.send',
    description: 'Send messages',
  },

  // Profile and preferences - accessible to all company users
  '/company/user/profile': {
    permissionPath: 'dashboard',
    description: 'Access to user profile',
  },
  '/company/profile': {
    permissionPath: 'dashboard',
    description: 'Access to company business profile',
  },
  '/company/user/settings': {
    permissionPath: 'dashboard',
    description: 'Access to user settings',
  },
  '/company/ai-assistant': {
    permissionPath: 'ai_assistant.enabled',
    description: 'Access to AI assistant',
  },

  // Medical records section
  '/company/medical-records': {
    permissionPath: 'medical_records.features.encounters.view',
    description: 'Access to medical records',
    subRoutes: {
      '/company/medical-records/encounters/new': 'medical_records.features.encounters.create',
      '/company/medical-records/encounters/[id]': 'medical_records.features.encounters.view',
      '/company/medical-records/encounters/[id]/edit': 'medical_records.features.encounters.edit',
      '/company/medical-records/notes/new': 'medical_records.features.notes.create',
      '/company/medical-records/vitals': 'medical_records.features.vitals',
      '/company/medical-records/lab-results': 'medical_records.features.lab_results',
    },
  },
  '/company/medical-records/encounters/new': {
    permissionPath: 'medical_records.features.encounters.create',
    description: 'Create medical encounters',
  },
  '/company/medical-records/encounters/[id]': {
    permissionPath: 'medical_records.features.encounters.view',
    description: 'View medical encounters',
  },
  '/company/medical-records/encounters/[id]/edit': {
    permissionPath: 'medical_records.features.encounters.edit',
    description: 'Edit medical encounters',
  },
  '/company/medical-records/notes/new': {
    permissionPath: 'medical_records.features.notes.create',
    description: 'Create medical notes',
  },
  '/company/medical-records/vitals': {
    permissionPath: 'medical_records.features.vitals',
    description: 'Access to vital signs',
  },
  '/company/medical-records/lab-results': {
    permissionPath: 'medical_records.features.lab_results',
    description: 'Access to lab results',
  },

  // Billing section
  '/company/billing': {
    permissionPath: 'billing.features.claims.view',
    description: 'Access to billing',
    subRoutes: {
      '/company/billing/claims/new': 'billing.features.claims.create',
      '/company/billing/claims/[id]': 'billing.features.claims.view',
      '/company/billing/payments': 'billing.features.payments.view',
      '/company/billing/invoices': 'billing.features.invoices.view',
    },
  },
  '/company/billing/claims/new': {
    permissionPath: 'billing.features.claims.create',
    description: 'Create billing claims',
  },
  '/company/billing/claims/[id]': {
    permissionPath: 'billing.features.claims.view',
    description: 'View billing claims',
  },
  '/company/billing/payments': {
    permissionPath: 'billing.features.payments.view',
    description: 'Access to payments',
  },
  '/company/billing/invoices': {
    permissionPath: 'billing.features.invoices.view',
    description: 'Access to invoices',
  },

  // Reports section
  '/company/reports': {
    permissionPath: 'reports.features.clinical',
    description: 'Access to reports',
    subRoutes: {
      '/company/reports/clinical': 'reports.features.clinical',
      '/company/reports/financial': 'reports.features.financial',
      '/company/reports/custom': 'reports.features.custom',
    },
  },
  '/company/reports/clinical': {
    permissionPath: 'reports.features.clinical',
    description: 'Access to clinical reports',
  },
  '/company/reports/financial': {
    permissionPath: 'reports.features.financial',
    description: 'Access to financial reports',
  },
  '/company/reports/custom': {
    permissionPath: 'reports.features.custom',
    description: 'Access to custom reports',
  },

  // Settings section - Owner only
  '/company/settings': {
    permissionPath: 'settings.enabled',
    description: 'Access to settings (owner only)',
    subRoutes: {
      '/company/settings/users': 'settings.features.users.view',
      '/company/settings/users/invite': 'settings.features.users.invite',
      '/company/settings/roles': 'settings.features.roles.view',
      '/company/settings/roles/new': 'settings.features.roles.create',
      '/company/settings/roles/[id]': 'settings.features.roles.view',
      '/company/settings/departments': 'settings.features.departments.view',
      '/company/settings/clinics': 'settings.features.clinics.view',
      '/company/settings/clinics/new': 'settings.features.clinics.create',
      '/company/settings/practice': 'settings.features.practice.view',
      '/company/settings/security': 'settings.features.security',
      '/company/settings/analytics': 'settings.enabled',
      '/company/settings/reports': 'settings.enabled',
    },
  },
  '/company/settings/users': {
    permissionPath: 'settings.features.users.view',
    description: 'View user management (owner only)',
  },
  '/company/settings/users/invite': {
    permissionPath: 'settings.features.users.invite',
    description: 'Invite users (owner only)',
  },
  '/company/settings/roles': {
    permissionPath: 'settings.features.roles.view',
    description: 'View custom roles (owner only)',
  },
  '/company/settings/roles/new': {
    permissionPath: 'settings.features.roles.create',
    description: 'Create custom roles (owner only)',
  },
  '/company/settings/roles/[id]': {
    permissionPath: 'settings.features.roles.view',
    description: 'View/edit custom roles (owner only)',
  },
  '/company/settings/departments': {
    permissionPath: 'settings.features.departments.view',
    description: 'View departments (owner only)',
  },
  '/company/settings/clinics': {
    permissionPath: 'settings.features.clinics.view',
    description: 'View clinics (owner only)',
  },
  '/company/settings/clinics/new': {
    permissionPath: 'settings.features.clinics.create',
    description: 'Create clinics (owner only)',
  },
  '/company/settings/practice': {
    permissionPath: 'settings.features.practice.view',
    description: 'View practice settings (owner only)',
  },
  '/company/settings/security': {
    permissionPath: 'settings.features.security',
    description: 'Access security settings (owner only)',
  },
  '/company/settings/analytics': {
    permissionPath: 'settings.enabled',
    description: 'Access to analytics (owner only)',
  },
  '/company/settings/reports': {
    permissionPath: 'settings.enabled',
    description: 'Access to reports (owner only)',
  },
};

/**
 * API route-to-permission mapping
 */
export const COMPANY_API_ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Users API
  '/api/company/users': {
    permissionPath: 'settings.features.users.view',
    description: 'Access to users API (owner only)',
    subRoutes: {
      'POST': 'settings.features.users.create',
      'PUT': 'settings.features.users.edit',
      'DELETE': 'settings.features.users.delete',
    },
  },
  '/api/company/users/[id]': {
    permissionPath: 'settings.features.users.view',
    description: 'Access to user details API (owner only)',
    subRoutes: {
      'PUT': 'settings.features.users.edit',
      'DELETE': 'settings.features.users.delete',
    },
  },
  '/api/company/users/[id]/unlock': {
    permissionPath: 'settings.features.users.edit',
    description: 'Unlock user account API (owner only)',
  },
  '/api/company/users/[id]/change-password': {
    permissionPath: 'settings.features.users.edit',
    description: 'Change user password API (owner or self)',
  },

  // Roles API
  '/api/company/roles': {
    permissionPath: 'settings.features.roles.view',
    description: 'Access to roles API (owner only)',
    subRoutes: {
      'POST': 'settings.features.roles.create',
      'PUT': 'settings.features.roles.edit',
      'DELETE': 'settings.features.roles.delete',
    },
  },
  '/api/company/roles/[id]': {
    permissionPath: 'settings.features.roles.view',
    description: 'Access to role details API (owner only)',
    subRoutes: {
      'PUT': 'settings.features.roles.edit',
      'DELETE': 'settings.features.roles.delete',
    },
  },

  // Clinics API
  '/api/company/clinics': {
    permissionPath: 'settings.features.clinics.view',
    description: 'Access to clinics API (owner only)',
    subRoutes: {
      'POST': 'settings.features.clinics.create',
      'PUT': 'settings.features.clinics.edit',
      'DELETE': 'settings.features.clinics.delete',
    },
  },
  '/api/company/clinics/[id]': {
    permissionPath: 'settings.features.clinics.view',
    description: 'Access to clinic details API (owner only)',
    subRoutes: {
      'PUT': 'settings.features.clinics.edit',
      'DELETE': 'settings.features.clinics.delete',
    },
  },

  // Permissions API
  '/api/company/permissions': {
    permissionPath: 'settings.features.roles.view',
    description: 'Access to permissions API (owner only)',
    subRoutes: {
      'PUT': 'settings.features.roles.edit',
    },
  },

  // Owners API
  '/api/company/owners': {
    permissionPath: 'settings.enabled',
    description: 'Access to owners API (owner only)',
    subRoutes: {
      'POST': 'settings.enabled',
      'DELETE': 'settings.enabled',
    },
  },

  // Departments API
  '/api/company/departments': {
    permissionPath: 'settings.features.departments.view',
    description: 'Access to departments API (owner only)',
    subRoutes: {
      'POST': 'settings.features.departments.create',
      'PUT': 'settings.features.departments.edit',
      'DELETE': 'settings.features.departments.delete',
    },
  },

  // Patients API
  '/api/company/patients': {
    permissionPath: 'patients.features.list',
    description: 'Access to patients API',
    subRoutes: {
      'POST': 'patients.features.create',
      'PUT': 'patients.features.edit',
      'DELETE': 'patients.features.delete',
    },
  },

  // Appointments API
  '/api/company/appointments': {
    permissionPath: 'appointments.features.view',
    description: 'Access to appointments API',
    subRoutes: {
      'POST': 'appointments.features.create',
      'PUT': 'appointments.features.edit',
      'DELETE': 'appointments.features.cancel',
    },
  },

  // Messages API
  '/api/company/messages': {
    permissionPath: 'messages.features.view',
    description: 'Access to messages API',
    subRoutes: {
      'POST': 'messages.features.send',
    },
  },

  // Analytics API
  '/api/company/analytics': {
    permissionPath: 'settings.enabled',
    description: 'Access to analytics API (owner only)',
  },

  // Reports API
  '/api/company/reports': {
    permissionPath: 'settings.enabled',
    description: 'Access to reports API (owner only)',
    subRoutes: {
      'POST': 'settings.enabled',
    },
  },

  // MFA API
  '/api/company/mfa/setup': {
    permissionPath: 'dashboard',
    description: 'Setup MFA API (user can set up for themselves)',
  },
  '/api/company/mfa/verify': {
    permissionPath: 'dashboard',
    description: 'Verify MFA setup API (user can verify for themselves)',
  },
  '/api/company/mfa/regenerate-backup-codes': {
    permissionPath: 'dashboard',
    description: 'Regenerate MFA backup codes API (user can regenerate for themselves)',
  },

  // Invitations API
  '/api/company/invitations': {
    permissionPath: 'settings.features.users.invite',
    description: 'Access to invitations API (owner only)',
    subRoutes: {
      'POST': 'settings.features.users.invite',
      'GET': 'settings.features.users.view',
    },
  },
  '/api/company/invitations/[id]': {
    permissionPath: 'settings.features.users.view',
    description: 'Access to invitation details API (owner only)',
    subRoutes: {
      'PUT': 'settings.features.users.invite',
      'DELETE': 'settings.features.users.invite',
    },
  },
  '/api/company/invitations/accept/[token]': {
    permissionPath: 'public', // Public route - no permission required (handled specially in getRequiredPermission)
    description: 'Accept invitation API (public - no authentication required)',
  },

  // Settings API
  '/api/company/settings/session-timeout': {
    permissionPath: 'settings.enabled',
    description: 'Access to session timeout settings API (owner only)',
    subRoutes: {
      'PUT': 'settings.enabled',
    },
  },
};

/**
 * Routes that are accessible to all company users without specific permission checks
 * These routes only require the user to be a company_user (checked in middleware)
 */
const PUBLIC_COMPANY_ROUTES = [
  '/company/user/profile',
  '/company/profile',
  '/company/user/settings',
  '/company/today',
];

/**
 * Find the permission required for a given route
 * 
 * @param pathname - The route pathname (e.g., "/clinic/patients/new")
 * @param method - Optional HTTP method for API routes (e.g., "POST", "GET")
 * @returns The permission path required, or null if no specific permission is required
 */
export function getRequiredPermission(
  pathname: string,
  method?: string
): string | null {
  // Normalize pathname (remove trailing slashes, handle dynamic segments)
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  // Check if this is a public company route (accessible to all company users)
  if (PUBLIC_COMPANY_ROUTES.includes(normalizedPath)) {
    return null;
  }

  // Check exact match first
  if (normalizedPath.startsWith('/api/company')) {
    // API route
    const routeConfig = COMPANY_API_ROUTE_PERMISSIONS[normalizedPath];
    if (routeConfig) {
      // Handle public routes (no permission required)
      if (routeConfig.permissionPath === 'public') {
        return null;
      }
      // Check for method-specific permission
      if (method && routeConfig.subRoutes?.[method]) {
        return routeConfig.subRoutes[method];
      }
      return routeConfig.permissionPath;
    }

    // Check for dynamic routes (e.g., /api/company/patients/[id])
    // Sort routes by length (most specific first) to match more specific routes before less specific ones
    const sortedRoutes = Object.entries(COMPANY_API_ROUTE_PERMISSIONS).sort(
      (a, b) => b[0].length - a[0].length
    );
    
    for (const [route, config] of sortedRoutes) {
      // Convert dynamic route to regex pattern
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
      const routeRegex = new RegExp(`^${routePattern}`);
      
      if (routeRegex.test(normalizedPath)) {
        // Handle public routes (no permission required)
        if (config.permissionPath === 'public') {
          return null;
        }
        if (method && config.subRoutes?.[method]) {
          return config.subRoutes[method];
        }
        return config.permissionPath;
      }
    }
  } else {
    // Page route
    const routeConfig = COMPANY_ROUTE_PERMISSIONS[normalizedPath];
    if (routeConfig) {
      return routeConfig.permissionPath;
    }

    // Check for dynamic routes (e.g., /company/patients/[id])
    // Match by prefix
    for (const [route, config] of Object.entries(COMPANY_ROUTE_PERMISSIONS)) {
      // Convert dynamic route to regex pattern
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
      const routeRegex = new RegExp(`^${routePattern}$`);
      
      if (routeRegex.test(normalizedPath)) {
        // Check for sub-route match
        if (config.subRoutes) {
          for (const [subRoute, subPermission] of Object.entries(config.subRoutes)) {
            const subRoutePattern = subRoute.replace(/\[.*?\]/g, '[^/]+');
            const subRouteRegex = new RegExp(`^${subRoutePattern}$`);
            if (subRouteRegex.test(normalizedPath)) {
              return subPermission;
            }
          }
        }
        return config.permissionPath;
      }
    }
  }

  // Default: if route starts with /company, require dashboard permission
  // This allows access to company area but may restrict specific features
  if (normalizedPath.startsWith('/company')) {
    return 'dashboard';
  }

  // No specific permission required
  return null;
}

/**
 * Get human-readable description for a permission path
 * 
 * @param pathname - The route pathname
 * @returns Description of what the permission grants
 */
export function getPermissionDescription(pathname: string): string {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  
  if (normalizedPath.startsWith('/api/company')) {
    const config = COMPANY_API_ROUTE_PERMISSIONS[normalizedPath];
    return config?.description || 'Access to company API';
  } else {
    // Check exact match first
    const config = COMPANY_ROUTE_PERMISSIONS[normalizedPath];
    if (config) {
      return config.description;
    }

    // Check for dynamic routes (e.g., /company/patients/[id])
    for (const [route, routeConfig] of Object.entries(COMPANY_ROUTE_PERMISSIONS)) {
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
      const routeRegex = new RegExp(`^${routePattern}$`);
      
      if (routeRegex.test(normalizedPath)) {
        // Check for sub-route match
        if (routeConfig.subRoutes) {
          for (const [subRoute, subPermission] of Object.entries(routeConfig.subRoutes)) {
            const subRoutePattern = subRoute.replace(/\[.*?\]/g, '[^/]+');
            const subRouteRegex = new RegExp(`^${subRoutePattern}$`);
            if (subRouteRegex.test(normalizedPath)) {
              // Find the sub-route config for description
              const subRouteConfig = COMPANY_ROUTE_PERMISSIONS[subRoute];
              return subRouteConfig?.description || routeConfig.description;
            }
          }
        }
        return routeConfig.description;
      }
    }

    return 'Access to company area';
  }
}

