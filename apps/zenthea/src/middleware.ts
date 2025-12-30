import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import {
  createEdgeAuditLogger,
  AuditAction,
  AuditResource,
} from '@/lib/security/auditLogger.edge'
import { hasPermission } from '@/lib/auth-utils'
import { getRequiredPermission, getPermissionDescription } from '@/lib/route-permissions'
import type { PermissionTree } from '@/types'
import { requiresSupportAccess, extractSupportAccessTargets } from '@/lib/support-access'
import { extractTenantFromHost, isPublicTenantRoute, isTenantDomain } from '@/lib/tenant-routing'

/**
 * Public routes that do not require authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/health',
  '/api/security/csp-report(.*)',
  '/api/public/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || 'localhost'
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'

  // ===========================================
  // TENANT ROUTING (Multi-tenant support)
  // ===========================================
  const tenantContext = extractTenantFromHost(hostname, pathname)
  
  if (tenantContext.type !== 'none') {
    if (tenantContext.type === 'custom_domain' || tenantContext.type === 'subdomain') {
      const isPublicPath = 
        pathname === '/' || 
        pathname === '/login' ||
        pathname.startsWith('/book') ||
        pathname.startsWith('/providers') ||
        pathname.startsWith('/locations') ||
        pathname.startsWith('/api/public');
      
      if (isPublicPath) {
        const response = NextResponse.next()
        response.headers.set('x-tenant-type', tenantContext.type)
        if (tenantContext.customDomain) {
          response.headers.set('x-tenant-custom-domain', tenantContext.customDomain)
        }
        if (tenantContext.subdomain) {
          response.headers.set('x-tenant-subdomain', tenantContext.subdomain)
        }
        return response
      }
    }
    
    if (tenantContext.type === 'path' && tenantContext.slug) {
      if (isPublicTenantRoute(pathname)) {
        const response = NextResponse.next()
        response.headers.set('x-tenant-type', 'path')
        response.headers.set('x-tenant-slug', tenantContext.slug)
        return response
      }
    }
  }

  // Handle public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // ===========================================
  // PROTECTED ROUTES
  // ===========================================
  
  // Protect the route using Clerk
  const authObject = await auth()
  if (!authObject.userId) {
    return authObject.redirectToSignIn()
  }

  const { userId, orgId, orgRole, sessionClaims } = authObject
  const userRole = (sessionClaims?.role as string) || (orgRole === 'org:admin' ? 'admin' : 'clinic_user')
  const tenantId = orgId || 'default'

  // HIPAA compliance: Log all access attempts
  const auditLogger = createEdgeAuditLogger(
    tenantId,
    userId,
    ipAddress,
    userAgent
  )

  const logAuditNonBlocking = (
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    details?: Record<string, unknown>
  ) => {
    auditLogger.log(action, resource, resourceId, details).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Audit logging failed:', error)
      }
    })
  }

  // Superadmin route protection
  if (pathname.startsWith('/superadmin')) {
    const isSuperAdmin = sessionClaims?.isSuperadmin === true || userRole === 'super_admin'
    if (!isSuperAdmin) {
      logAuditNonBlocking(
        AuditAction.UnauthorizedAccess,
        AuditResource.Security,
        'superadmin_access_denied',
        {
          attemptedPath: pathname,
          userRole,
          timestamp: Date.now(),
          severity: 'critical',
        }
      )
      return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
    }
    
    if (requiresSupportAccess(pathname)) {
      const searchParams = new URL(req.url).searchParams
      const targets = extractSupportAccessTargets(pathname, searchParams)
      
      logAuditNonBlocking(
        AuditAction.AuthorizedAccess,
        AuditResource.Security,
        'superadmin_support_access_validation_required',
        {
          attemptedPath: pathname,
          userRole,
          userId,
          targetUserId: targets.targetUserId,
          targetTenantId: targets.targetTenantId,
          timestamp: Date.now(),
          note: 'Support access validation required - will be verified in API route handler',
        }
      )
    }
  }

  // Redirect old /admin and /provider routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/provider')) {
    const remainingPath = pathname.startsWith('/admin')
      ? pathname.replace('/admin', '')
      : pathname.replace('/provider', '')
    
    const redirectUrl = `/company${remainingPath || '/dashboard'}`
    
    logAuditNonBlocking(
      AuditAction.AuthorizedAccess,
      AuditResource.Security,
      'route_redirect',
      {
        oldPath: pathname,
        newPath: redirectUrl,
        userRole,
        timestamp: Date.now(),
      }
    )
    
    return NextResponse.redirect(new URL(redirectUrl, req.url))
  }

  // Clinic route protection
  if (pathname.startsWith('/company') || pathname.startsWith('/clinic')) {
    const isClinicUser = 
      userRole === 'clinic_user' ||
      userRole === 'admin' ||
      userRole === 'provider' ||
      userRole === 'super_admin'
    
    if (!isClinicUser) {
      logAuditNonBlocking(
        AuditAction.UnauthorizedAccess,
        AuditResource.Security,
        'clinic_access_denied',
        {
          attemptedPath: pathname,
          userRole,
          timestamp: Date.now(),
        }
      )
      return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
    }

    // Permission checks
    const normalizedPathname = pathname.replace(/^\/clinic/, '/company')
    const requiredPermission = getRequiredPermission(normalizedPathname)
    
    if (requiredPermission) {
      // For now, we'll assume permissions are in privateMetadata and accessed via auth()
      // But in the middleware, we only have sessionClaims.
      // We'll need to update sessionClaims to include permissions or fetch them.
      const userPermissions = sessionClaims?.permissions as PermissionTree | undefined
      const userIsOwner = sessionClaims?.isOwner === true || userRole === 'admin' // Defaulting admin to owner for now

      const permissionResult = hasPermission(
        userPermissions,
        requiredPermission,
        { isOwner: userIsOwner },
        { returnDetails: true }
      )

      const hasAccess = typeof permissionResult === 'boolean' 
        ? permissionResult 
        : (permissionResult as any).hasPermission

      if (!hasAccess) {
        const errorMessage = typeof permissionResult === 'object' 
          ? (permissionResult as any).error || 'Permission denied'
          : 'Permission denied'

        const permissionDescription = getPermissionDescription(normalizedPathname)

        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'clinic_permission_denied',
          {
            attemptedPath: pathname,
            userRole,
            userId,
            requiredPermission,
            permissionDescription,
            errorMessage,
            timestamp: Date.now(),
            severity: 'high',
          }
        )

        return NextResponse.redirect(new URL(`/company/dashboard?error=${encodeURIComponent(errorMessage)}`, req.url))
      }
    }
  }

  // API protection
  if (pathname.startsWith('/api/')) {
    // Already handled webhooks and auth in isPublicRoute
    
    if (pathname.startsWith('/api/superadmin')) {
      const isSuperAdmin = sessionClaims?.isSuperadmin === true || userRole === 'super_admin'
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (pathname.startsWith('/api/company') || pathname.startsWith('/api/clinic')) {
      // Permission checks for API could be added here
    }
  }

  // HIPAA Headers
  const response = NextResponse.next()
  response.headers.set('X-HIPAA-Compliant', 'true')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Cache control
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/patient') ||
    pathname.startsWith('/company') ||
    pathname.startsWith('/clinic') ||
    pathname.startsWith('/superadmin')
  ) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
