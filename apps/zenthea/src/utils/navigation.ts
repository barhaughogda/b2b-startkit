import { NavigationItem, BreadcrumbItem } from '@/types/navigation';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Navigation utility functions
 */

/**
 * Get the current page title from the pathname
 */
export function getPageTitle(pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) return 'Dashboard';
  
  const lastSegment = pathSegments[pathSegments.length - 1];
  
  // Convert kebab-case to Title Case
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate breadcrumb items from pathname
 */
export function generateBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbItems: BreadcrumbItem[] = [];
  
  // Always start with Company Portal
  breadcrumbItems.push({
    label: 'Company Portal',
    href: '/company',
  });
  
  // Build breadcrumb from path segments
  let currentPath = '/company';
  for (let i = 1; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;
    
    const isLast = i === pathSegments.length - 1;
    const label = getPageTitle(segment);
    
    breadcrumbItems.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrentPage: isLast,
    });
  }
  
  return breadcrumbItems;
}

/**
 * Check if a navigation item is active based on current pathname
 */
export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  // Exact match
  if (item.url === pathname) return true;
  
  // Check if current path starts with item URL (for parent items)
  if (pathname.startsWith(item.url) && item.url !== '/company') return true;
  
  // Check sub-items
  if (item.items) {
    return item.items.some(subItem => isNavigationItemActive(subItem, pathname));
  }
  
  return false;
}

/**
 * Find the active navigation item from a list of items
 */
export function findActiveNavigationItem(
  items: NavigationItem[], 
  pathname: string
): NavigationItem | null {
  for (const item of items) {
    if (isNavigationItemActive(item, pathname)) {
      return item;
    }
    
    // Check sub-items
    if (item.items) {
      const activeSubItem = findActiveNavigationItem(
        item.items, 
        pathname
      );
      if (activeSubItem) return activeSubItem;
    }
  }
  
  return null;
}

/**
 * Get navigation configuration for a specific page
 */
export function getNavigationConfig(pathname: string) {
  const pageTitle = getPageTitle(pathname);
  const breadcrumbItems = generateBreadcrumbItems(pathname);
  
  return {
    pageTitle,
    pagePath: pathname,
    breadcrumbItems,
  };
}

/**
 * Navigation route constants
 */
export const PROVIDER_ROUTES = {
  DASHBOARD: '/provider/dashboard',
  TODAY: '/provider/today',
  APPOINTMENTS: '/provider/appointments',
  PATIENTS: '/provider/patients',
  PATIENT_PROFILE: (patientId: string) => `/provider/patients/${patientId}`,
  MESSAGES: '/provider/messages',
  PROFILE: '/provider/profile',
  SETTINGS: '/provider/settings',
  BILLING: '/provider/billing',
  RECORDS: '/provider/records',
  CLINICAL: '/provider/clinical',
  SCHEDULE: '/provider/schedule',
  REPORTS: '/provider/reports',
  ANALYTICS: '/provider/analytics',
} as const;

/**
 * Company route constants (unified access system)
 */
export const COMPANY_ROUTES = {
  DASHBOARD: '/company/dashboard',
  TODAY: '/company/today',
  APPOINTMENTS: '/company/appointments',
  PATIENTS: '/company/patients',
  PATIENT_PROFILE: (patientId: string) => `/company/patients/${patientId}`,
  MESSAGES: '/company/messages',
  PROFILE: '/company/user/profile',
  CLINIC_PROFILE: '/company/profile',
  SETTINGS: '/company/settings',
  USER_SETTINGS: '/company/user/settings',
  BILLING: '/company/billing',
  CALENDAR: '/company/calendar',
  AI_ASSISTANT: '/company/ai-assistant',
  REPORTS: '/company/reports',
  ANALYTICS: '/company/analytics',
} as const;

/**
 * @deprecated Use COMPANY_ROUTES instead. Kept for backward compatibility during migration.
 */
export const CLINIC_ROUTES = COMPANY_ROUTES;

/**
 * Check if a route is a provider route
 */
export function isProviderRoute(pathname: string): boolean {
  return pathname.startsWith('/provider');
}

/**
 * Check if a route is a company route
 */
export function isCompanyRoute(pathname: string): boolean {
  return pathname.startsWith('/company');
}

/**
 * @deprecated Use isCompanyRoute instead. Kept for backward compatibility during migration.
 */
export function isClinicRoute(pathname: string): boolean {
  return isCompanyRoute(pathname) || pathname.startsWith('/clinic');
}

/**
 * Get the route type from pathname
 */
export function getRouteType(pathname: string): string {
  if (isCompanyRoute(pathname) || isProviderRoute(pathname)) {
    const pathSegments = pathname.split('/').filter(Boolean);
    return pathSegments[1] || 'dashboard';
  }
  
  return 'unknown';
}

/**
 * Navigation helper functions for common actions
 */
export const navigationHelpers = {
  /**
   * Navigate to dashboard
   */
  goToDashboard: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.DASHBOARD),
  
  /**
   * Navigate to today's schedule
   */
  goToToday: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.TODAY),
  
  /**
   * Navigate to patients
   */
  goToPatients: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.PATIENTS),
  
  /**
   * Navigate to messages
   */
  goToMessages: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.MESSAGES),
  
  /**
   * Navigate to profile
   */
  goToProfile: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.PROFILE),
  
  /**
   * Navigate to settings
   */
  goToSettings: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.SETTINGS),
  
  /**
   * Navigate to billing
   */
  goToBilling: (router: AppRouterInstance) => router.push(COMPANY_ROUTES.BILLING),
  
  /**
   * Navigate to patient profile
   * Uses company routes for unified access system
   */
  goToPatientProfile: (router: AppRouterInstance, patientId: string) => router.push(COMPANY_ROUTES.PATIENT_PROFILE(patientId)),
} as const;
