import { withAuth } from 'next-auth/middleware'
import { NextResponse, NextRequest } from 'next/server'
import {
  createEdgeAuditLogger,
  AuditAction,
  AuditResource,
} from '@/lib/security/auditLogger.edge'
import { hasPermission, isOwner } from '@/lib/auth-utils'
import { getRequiredPermission, getPermissionDescription } from '@/lib/route-permissions'
import type { PermissionTree } from '@/types'
import { requiresSupportAccess, extractSupportAccessTargets } from '@/lib/support-access'
import { extractTenantFromHost, isPublicTenantRoute, isTenantDomain } from '@/lib/tenant-routing'

/**
 * Check if the just-logged-in cookie flag is present.
 * This helper allows the middleware to handle post-login redirect race conditions
 * where the session cookie hasn't propagated to Edge Runtime yet.
 *
 * Security: The just-logged-in cookie is only set after successful authentication
 * and expires after 10 minutes (600 seconds), providing a grace period for Vercel Edge Runtime
 * cookie propagation. Once the session token is available, it takes precedence.
 *
 * @param req - The Next.js request object
 * @returns true if just-logged-in flag is present, false otherwise
 */
function checkJustLoggedIn(req: NextRequest): boolean {
  const justLoggedIn = req.cookies.get('just-logged-in')?.value === 'true'
  // Note: We don't require session cookie here because the whole point is to handle
  // the case where session cookie hasn't propagated to Edge Runtime yet.
  // Security is maintained because:
  // 1. just-logged-in cookie is only set after successful login
  // 2. It expires after 10 minutes (600 seconds)
  // 3. It's only honored when token is null (session not yet available)
  return justLoggedIn
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const hostname = req.headers.get('host') || 'localhost'
    const token = req.nextauth.token
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // ===========================================
    // TENANT ROUTING (Multi-tenant support)
    // ===========================================
    // Extract tenant context from hostname (custom domain, subdomain) or pathname
    const tenantContext = extractTenantFromHost(hostname, pathname)
    
    // Handle tenant-specific routing
    if (tenantContext.type !== 'none') {
      // For custom domains or subdomains, check if this is a public landing page
      if (tenantContext.type === 'custom_domain' || tenantContext.type === 'subdomain') {
        // Public routes on tenant domains (landing page, booking, providers, login)
        const isPublicPath = 
          pathname === '/' || 
          pathname === '/login' ||
          pathname.startsWith('/book') ||
          pathname.startsWith('/providers') ||
          pathname.startsWith('/locations') ||
          pathname.startsWith('/api/public');
        
        if (isPublicPath) {
          // Allow public access, add tenant context to headers for downstream use
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
      
      // For path-based tenant routes
      if (tenantContext.type === 'path' && tenantContext.slug) {
        // Check if this is a public tenant route
        if (isPublicTenantRoute(pathname)) {
          // Allow public access, add tenant context to headers
          const response = NextResponse.next()
          response.headers.set('x-tenant-type', 'path')
          response.headers.set('x-tenant-slug', tenantContext.slug)
          return response
        }
      }
    }

    // Check for just-logged-in flag to handle post-login redirect race condition
    // If user just logged in, allow them through without role checks
    // The session token will be available on the next request after propagation
    if (checkJustLoggedIn(req) && token === null) {
      // Allow through during the grace period while session cookie propagates to Edge Runtime
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '🔐 Just-logged-in flag detected, allowing through for session propagation'
        )
      }
      // Do NOT delete the cookie - let it expire naturally after 10 minutes
      // This allows subsequent navigation (like clicking profile menu) to also benefit from the grace period
      // Extended timeout (10 minutes) accounts for Vercel Edge Runtime session propagation delays
      // Once the session token is available in Edge Runtime, it will be used instead
      return NextResponse.next()
    }

    // HIPAA compliance: Log all access attempts
    const auditLogger = createEdgeAuditLogger(
      token?.tenantId || 'default',
      token?.id as string | undefined,
      ipAddress,
      userAgent
    )

    // Helper function for non-blocking audit logging
    // Fire-and-forget audit logging - errors are logged but don't block request
    const logAuditNonBlocking = (
      action: AuditAction,
      resource: AuditResource,
      resourceId: string,
      details?: Record<string, unknown>
    ) => {
      auditLogger.log(action, resource, resourceId, details).catch((error) => {
        // Log error but don't throw - audit logging failures shouldn't block requests
        // Only log in development to avoid production console noise
        if (process.env.NODE_ENV === 'development') {
          console.error('Audit logging failed:', error)
        }
        // In production, consider sending to error tracking service
      })
    }

    // Superadmin route protection - highest priority
    if (pathname.startsWith('/superadmin')) {
      if (token?.role !== 'super_admin') {
        // Log unauthorized access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'superadmin_access_denied',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            timestamp: Date.now(),
            severity: 'critical',
          }
        )
        return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
      } else {
        // Check if this route requires support access validation
        if (requiresSupportAccess(pathname)) {
          // Extract target user ID and tenant ID from the request
          const searchParams = new URL(req.url).searchParams
          const targets = extractSupportAccessTargets(pathname, searchParams)
          
          // Log support access validation requirement
          // Note: Actual verification will happen in API route handlers
          // Middleware cannot call Convex directly, so we log here and let API routes verify
          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'superadmin_support_access_validation_required',
            {
              attemptedPath: pathname,
              userRole: token.role,
              userId: token.id,
              targetUserId: targets.targetUserId,
              targetTenantId: targets.targetTenantId,
              timestamp: Date.now(),
              note: 'Support access validation required - will be verified in API route handler',
            }
          )
        } else {
          // Log authorized access attempt (no support access required)
          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'superadmin_access_granted',
            {
              attemptedPath: pathname,
              userRole: token.role,
              userId: token.id,
              timestamp: Date.now(),
              success: true,
            }
          )
        }
      }
    }

    // Redirect old /admin and /provider routes to /company for backward compatibility
    if (pathname.startsWith('/admin') || pathname.startsWith('/provider')) {
      // Extract the path after /admin or /provider
      const remainingPath = pathname.startsWith('/admin')
        ? pathname.replace('/admin', '')
        : pathname.replace('/provider', '')
      
      // Redirect to /company with the same path
      const redirectUrl = `/company${remainingPath || '/dashboard'}`
      
      // Log the redirect for audit purposes
      logAuditNonBlocking(
        AuditAction.AuthorizedAccess,
        AuditResource.Security,
        'route_redirect',
        {
          oldPath: pathname,
          newPath: redirectUrl,
          userRole: token?.role,
          timestamp: Date.now(),
        }
      )
      
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }

    // Enhanced role-based access control with HIPAA compliance for company routes
    if (pathname.startsWith('/company')) {
      // Check for clinic_user role (with backward compatibility for admin/provider)
      const isClinicUser = 
        token?.role === 'clinic_user' ||
        token?.role === 'admin' ||
        token?.role === 'provider'
      
      if (!isClinicUser && token?.role !== 'super_admin') {
        // Log unauthorized access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'clinic_access_denied',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            timestamp: Date.now(),
          }
        )
        return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
      }

      // Check if password has expired (unless already on password change page)
      if (token?.passwordExpired === true && !pathname.startsWith('/company/settings/security/change-password')) {
        // Log password expiration redirect
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'password_expired_redirect',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            timestamp: Date.now(),
          }
        )
        // Redirect to password change page
        return NextResponse.redirect(new URL('/auth/change-password?expired=true', req.url))
      }

      // NOTE: Session timeout validation
      // ================================
      // Session timeout is primarily enforced client-side via useSessionTimeout hook
      // for better UX (showing warnings, countdown, etc.). However, critical operations
      // should also validate session timeout server-side in API route handlers.
      //
      // Server-side validation can be done by:
      // 1. Checking the session's lastActivity timestamp from Convex sessions table
      // 2. Using validateSessionTimeoutServer() utility from @/lib/session
      // 3. Rejecting requests if session has expired
      //
      // The client-side enforcement provides immediate feedback, while server-side
      // validation ensures security even if client-side code is bypassed.

      // Permission-based route protection
      // Check if this route requires a specific permission
      const requiredPermission = getRequiredPermission(pathname)
      
      // Superadmins have full access - skip permission checks
      if (token?.role === 'super_admin') {
        // Log superadmin access (informational)
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'superadmin_clinic_access',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            note: 'Superadmin accessing clinic route - full access granted',
            timestamp: Date.now(),
          }
        )
        // Allow access without permission checks
        return NextResponse.next()
      }
      
      // Get user permissions from token
      const userPermissions = token?.permissions as PermissionTree | null | undefined
      const userIsOwner = token?.isOwner === true
      const hasNoPermissions = !userPermissions

      // Allow /company/dashboard without permissions as a fallback for users without permissions
      // This prevents redirect loops and provides a safe landing page
      if (pathname === '/company/dashboard' && hasNoPermissions && !userIsOwner) {
        // Log access to dashboard without permissions (informational, not an error)
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_dashboard_no_permissions',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            note: 'User accessing dashboard without permissions - fallback access granted',
            timestamp: Date.now(),
          }
        )
        // Allow access to dashboard without permissions
        return NextResponse.next()
      }
      
      if (requiredPermission) {
        // Check permission (owners have full access via hasPermission function)
        const permissionResult = hasPermission(
          userPermissions,
          requiredPermission,
          { isOwner: userIsOwner },
          { returnDetails: true }
        )

        // Type guard to check if result is detailed
        const hasAccess = typeof permissionResult === 'boolean' 
          ? permissionResult 
          : permissionResult.hasPermission

        if (!hasAccess) {
          // Get error message from permission check
          const errorMessage = typeof permissionResult === 'object' 
            ? permissionResult.error || 'Permission denied'
            : 'Permission denied'

          const permissionDescription = getPermissionDescription(pathname)

          // Log unauthorized access attempt with permission details
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'clinic_permission_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              userId: token?.id,
              requiredPermission,
              permissionDescription,
              errorMessage,
              userHasPermissions: !!userPermissions,
              userIsOwner,
              hasNoPermissions,
              timestamp: Date.now(),
              severity: 'high',
            }
          )

          // If user has no permissions at all, redirect to dashboard with helpful message
          // This prevents redirect loops and provides a better UX
          if (hasNoPermissions) {
            const setupMessage = encodeURIComponent(
              'Your account has not been assigned permissions yet. Please contact your administrator to set up your access.'
            )
            return NextResponse.redirect(new URL(`/company/dashboard?message=${setupMessage}`, req.url))
          }

          // If user has permissions but doesn't have this specific permission, show error
          const errorParam = encodeURIComponent(
            `You don't have permission to access ${permissionDescription}. ${errorMessage}`
          )
          return NextResponse.redirect(new URL(`/?error=${errorParam}`, req.url))
        }

        // Log authorized access with permission details
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_permission_granted',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            requiredPermission,
            permissionDescription: getPermissionDescription(pathname),
            userIsOwner,
            timestamp: Date.now(),
            success: true,
          }
        )
      } else {
        // No specific permission required, just log general access
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_access_granted',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            timestamp: Date.now(),
            success: true,
          }
        )
      }
    }

    // Legacy /clinic route protection (backward compatibility until Phase 7 redirects)
    // Uses same protection logic as /company routes
    if (pathname.startsWith('/clinic')) {
      // IMPORTANT: Check if this is a public tenant route FIRST
      // Public routes like /clinic/[slug], /clinic/[slug]/services, etc. should not require auth
      if (isPublicTenantRoute(pathname)) {
        // Allow public access to tenant landing pages, booking, providers, locations, login
        return NextResponse.next()
      }
      
      // Check for clinic_user role (with backward compatibility for admin/provider)
      const isClinicUser = 
        token?.role === 'clinic_user' ||
        token?.role === 'admin' ||
        token?.role === 'provider'
      
      if (!isClinicUser && token?.role !== 'super_admin') {
        // Log unauthorized access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'clinic_access_denied',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            timestamp: Date.now(),
          }
        )
        return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
      }

      // Check if password has expired (unless already on password change page)
      if (token?.passwordExpired === true && !pathname.startsWith('/clinic/settings/security/change-password')) {
        // Log password expiration redirect
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'password_expired_redirect',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            timestamp: Date.now(),
          }
        )
        // Redirect to password change page
        return NextResponse.redirect(new URL('/auth/change-password?expired=true', req.url))
      }

      // Permission-based route protection
      // Normalize /clinic paths to /company for permission checking
      const normalizedPathname = pathname.replace(/^\/clinic/, '/company')
      const requiredPermission = getRequiredPermission(normalizedPathname)
      
      // Superadmins have full access - skip permission checks
      if (token?.role === 'super_admin') {
        // Log superadmin access (informational)
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'superadmin_clinic_access',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            note: 'Superadmin accessing clinic route - full access granted',
            timestamp: Date.now(),
          }
        )
        // Allow access without permission checks
        return NextResponse.next()
      }
      
      const userPermissions = token?.permissions as PermissionTree | null | undefined
      const userIsOwner = token?.isOwner === true
      const hasNoPermissions = !userPermissions

      // Allow /clinic/dashboard without permissions as a fallback
      if (pathname === '/clinic/dashboard' && hasNoPermissions && !userIsOwner) {
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_dashboard_no_permissions',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            note: 'User accessing dashboard without permissions - fallback access granted',
            timestamp: Date.now(),
          }
        )
        return NextResponse.next()
      }
      
      if (requiredPermission) {
        const permissionResult = hasPermission(
          userPermissions,
          requiredPermission,
          { isOwner: userIsOwner },
          { returnDetails: true }
        )

        const hasAccess = typeof permissionResult === 'boolean' 
          ? permissionResult 
          : permissionResult.hasPermission

        if (!hasAccess) {
          const errorMessage = typeof permissionResult === 'object' 
            ? permissionResult.error || 'Permission denied'
            : 'Permission denied'

          const permissionDescription = getPermissionDescription(normalizedPathname)

          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'clinic_permission_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              userId: token?.id,
              requiredPermission,
              permissionDescription,
              errorMessage,
              userHasPermissions: !!userPermissions,
              userIsOwner,
              hasNoPermissions,
              timestamp: Date.now(),
              severity: 'high',
            }
          )

          if (hasNoPermissions) {
            const setupMessage = encodeURIComponent(
              'Your account has not been assigned permissions yet. Please contact your administrator to set up your access.'
            )
            return NextResponse.redirect(new URL(`/clinic/dashboard?message=${setupMessage}`, req.url))
          }

          const errorParam = encodeURIComponent(
            `You don't have permission to access ${permissionDescription}. ${errorMessage}`
          )
          return NextResponse.redirect(new URL(`/?error=${errorParam}`, req.url))
        }

        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_permission_granted',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            requiredPermission,
            permissionDescription: getPermissionDescription(normalizedPathname),
            userIsOwner,
            timestamp: Date.now(),
            success: true,
          }
        )
      } else {
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'clinic_access_granted',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            userId: token?.id,
            timestamp: Date.now(),
            success: true,
          }
        )
      }
    }

    if (pathname.startsWith('/demo')) {
      if (
        token?.role !== 'demo' &&
        token?.role !== 'admin' &&
        token?.role !== 'super_admin'
      ) {
        // Log unauthorized access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'demo_access_denied',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            timestamp: Date.now(),
          }
        )
        return NextResponse.redirect(new URL('/?error=AccessDenied', req.url))
      }
    }

    if (pathname.startsWith('/patient')) {
      // Allow demo mode for patient portal in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.next()
      }
      if (
        token?.role !== 'patient' &&
        token?.role !== 'admin' &&
        token?.role !== 'super_admin'
      ) {
        // Log unauthorized patient portal access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'patient_access_denied',
          {
            attemptedPath: pathname,
            userRole: token?.role,
            timestamp: Date.now(),
            severity: 'high', // Patient portal access is high security
          }
        )
        return NextResponse.redirect(
          new URL('/patient/login?error=AccessDenied', req.url)
        )
      }
    }

    // Enhanced API route protection with HIPAA compliance
    if (pathname.startsWith('/api/')) {
      // Allow auth API routes
      if (pathname.startsWith('/api/auth')) {
        return NextResponse.next()
      }

      // Allow patient API routes in development
      if (
        pathname.startsWith('/api/patient') &&
        process.env.NODE_ENV === 'development'
      ) {
        return NextResponse.next()
      }

      // Require authentication for all other API routes (except in development)
      if (!token && process.env.NODE_ENV !== 'development') {
        // Log unauthorized API access attempt
        logAuditNonBlocking(
          AuditAction.UnauthorizedAccess,
          AuditResource.Security,
          'api_access_denied',
          {
            attemptedPath: pathname,
            timestamp: Date.now(),
            severity: 'high',
          }
        )
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Superadmin API route protection - highest priority
      if (pathname.startsWith('/api/superadmin')) {
        if (token?.role !== 'super_admin') {
          // Log unauthorized superadmin API access
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'superadmin_api_access_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              timestamp: Date.now(),
              severity: 'critical',
            }
          )
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        } else {
          // Check if this API route requires support access validation
          if (requiresSupportAccess(pathname)) {
            // Extract target user ID and tenant ID from the request
            const searchParams = new URL(req.url).searchParams
            const targets = extractSupportAccessTargets(pathname, searchParams)
            
            // Log support access validation requirement
            // Note: Actual verification will happen in API route handlers
            // Middleware cannot call Convex directly, so we log here and let API routes verify
            logAuditNonBlocking(
              AuditAction.AuthorizedAccess,
              AuditResource.Security,
              'superadmin_api_support_access_validation_required',
              {
                attemptedPath: pathname,
                method: req.method,
                userRole: token.role,
                userId: token.id,
                targetUserId: targets.targetUserId,
                targetTenantId: targets.targetTenantId,
                timestamp: Date.now(),
                note: 'Support access validation required - API route handler will verify via Convex action',
              }
            )
          } else {
            // Log authorized superadmin API access (no support access required)
            logAuditNonBlocking(
              AuditAction.AuthorizedAccess,
              AuditResource.Security,
              'superadmin_api_access_granted',
              {
                attemptedPath: pathname,
                userRole: token.role,
                userId: token.id,
                timestamp: Date.now(),
                success: true,
              }
            )
          }
        }
      }

      // Redirect old /api/admin and /api/provider routes to /api/company for backward compatibility
      if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/provider')) {
        // Extract the path after /api/admin or /api/provider
        const remainingPath = pathname.startsWith('/api/admin')
          ? pathname.replace('/api/admin', '')
          : pathname.replace('/api/provider', '')
        
        // Redirect to /api/company with the same path
        const redirectUrl = `/api/company${remainingPath}`
        
        // Log the redirect for audit purposes
        logAuditNonBlocking(
          AuditAction.AuthorizedAccess,
          AuditResource.Security,
          'api_route_redirect',
          {
            oldPath: pathname,
            newPath: redirectUrl,
            userRole: token?.role,
            timestamp: Date.now(),
          }
        )
        
        return NextResponse.redirect(new URL(redirectUrl, req.url))
      }

      // Enhanced role-based API access with audit logging for company API routes
      if (pathname.startsWith('/api/company')) {
        // Check for clinic_user role (with backward compatibility for admin/provider)
        const isClinicUser = 
          token?.role === 'clinic_user' ||
          token?.role === 'admin' ||
          token?.role === 'provider'
        
        if (!isClinicUser && token?.role !== 'super_admin') {
          // Log unauthorized clinic API access
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'clinic_api_access_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              timestamp: Date.now(),
              severity: 'critical',
            }
          )
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Permission-based API route protection
        // Check if this API route requires a specific permission
        const requiredPermission = getRequiredPermission(pathname, req.method)
        
        if (requiredPermission) {
          // Get user permissions from token
          const userPermissions = token?.permissions as PermissionTree | null | undefined
          const userIsOwner = token?.isOwner === true

          // Check permission (owners have full access via hasPermission function)
          const permissionResult = hasPermission(
            userPermissions,
            requiredPermission,
            { isOwner: userIsOwner },
            { returnDetails: true }
          )

          // Type guard to check if result is detailed
          const hasAccess = typeof permissionResult === 'boolean' 
            ? permissionResult 
            : permissionResult.hasPermission

          if (!hasAccess) {
            // Get error message from permission check
            const errorMessage = typeof permissionResult === 'object' 
              ? permissionResult.error || 'Permission denied'
              : 'Permission denied'

            const permissionDescription = getPermissionDescription(pathname)

            // Log unauthorized API access attempt with permission details
            logAuditNonBlocking(
              AuditAction.UnauthorizedAccess,
              AuditResource.Security,
              'clinic_api_permission_denied',
              {
                attemptedPath: pathname,
                method: req.method,
                userRole: token?.role,
                userId: token?.id,
                requiredPermission,
                permissionDescription,
                errorMessage,
                userHasPermissions: !!userPermissions,
                userIsOwner,
                timestamp: Date.now(),
                severity: 'critical',
              }
            )

            // Return clear error message
            return NextResponse.json(
              { 
                error: 'Forbidden',
                message: `You don't have permission to ${permissionDescription}. ${errorMessage}`,
                requiredPermission,
              },
              { status: 403 }
            )
          }

          // Log authorized API access with permission details
          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'clinic_api_permission_granted',
            {
              attemptedPath: pathname,
              method: req.method,
              userRole: token?.role,
              userId: token?.id,
              requiredPermission,
              permissionDescription: getPermissionDescription(pathname),
              userIsOwner,
              timestamp: Date.now(),
              success: true,
            }
          )
        } else {
          // No specific permission required, just log general API access
          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'clinic_api_access_granted',
            {
              attemptedPath: pathname,
              method: req.method,
              userRole: token?.role,
              userId: token?.id,
              timestamp: Date.now(),
              success: true,
            }
          )
        }
      }

      // Legacy /api/clinic route protection (backward compatibility until Phase 7 redirects)
      // Uses same protection logic as /api/company routes
      if (pathname.startsWith('/api/clinic')) {
        // Check for clinic_user role (with backward compatibility for admin/provider)
        const isClinicUser = 
          token?.role === 'clinic_user' ||
          token?.role === 'admin' ||
          token?.role === 'provider'
        
        if (!isClinicUser && token?.role !== 'super_admin') {
          // Log unauthorized clinic API access
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'clinic_api_access_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              timestamp: Date.now(),
              severity: 'critical',
            }
          )
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Permission-based API route protection
        // Normalize /api/clinic paths to /api/company for permission checking
        const normalizedApiPathname = pathname.replace(/^\/api\/clinic/, '/api/company')
        const requiredPermission = getRequiredPermission(normalizedApiPathname, req.method)
        
        if (requiredPermission) {
          const userPermissions = token?.permissions as PermissionTree | null | undefined
          const userIsOwner = token?.isOwner === true

          const permissionResult = hasPermission(
            userPermissions,
            requiredPermission,
            { isOwner: userIsOwner },
            { returnDetails: true }
          )

          const hasAccess = typeof permissionResult === 'boolean' 
            ? permissionResult 
            : permissionResult.hasPermission

          if (!hasAccess) {
            const errorMessage = typeof permissionResult === 'object' 
              ? permissionResult.error || 'Permission denied'
              : 'Permission denied'

            const permissionDescription = getPermissionDescription(normalizedApiPathname)

            logAuditNonBlocking(
              AuditAction.UnauthorizedAccess,
              AuditResource.Security,
              'clinic_api_permission_denied',
              {
                attemptedPath: pathname,
                method: req.method,
                userRole: token?.role,
                userId: token?.id,
                requiredPermission,
                permissionDescription,
                errorMessage,
                userHasPermissions: !!userPermissions,
                userIsOwner,
                timestamp: Date.now(),
                severity: 'critical',
              }
            )

            return NextResponse.json(
              { 
                error: 'Forbidden',
                message: `You don't have permission to ${permissionDescription}. ${errorMessage}`,
                requiredPermission,
              },
              { status: 403 }
            )
          }

          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'clinic_api_permission_granted',
            {
              attemptedPath: pathname,
              method: req.method,
              userRole: token?.role,
              userId: token?.id,
              requiredPermission,
              permissionDescription: getPermissionDescription(normalizedApiPathname),
              userIsOwner,
              timestamp: Date.now(),
              success: true,
            }
          )
        } else {
          logAuditNonBlocking(
            AuditAction.AuthorizedAccess,
            AuditResource.Security,
            'clinic_api_access_granted',
            {
              attemptedPath: pathname,
              method: req.method,
              userRole: token?.role,
              userId: token?.id,
              timestamp: Date.now(),
              success: true,
            }
          )
        }
      }

      // Patient API route protection - HIPAA compliance
      if (pathname.startsWith('/api/patient')) {
        if (
          token?.role !== 'patient' &&
          token?.role !== 'admin' &&
          token?.role !== 'super_admin'
        ) {
          // Log unauthorized patient API access
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'patient_api_access_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              timestamp: Date.now(),
              severity: 'high',
            }
          )
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        // HIPAA compliance: Log all PHI data access
        logAuditNonBlocking(
          AuditAction.PatientAccessed,
          AuditResource.Patient,
          'patient_api_access',
          {
            endpoint: pathname,
            method: req.method,
            timestamp: Date.now(),
          }
        )
      }

      // Demo API route protection
      if (pathname.startsWith('/api/demo')) {
        if (
          token?.role !== 'demo' &&
          token?.role !== 'admin' &&
          token?.role !== 'super_admin'
        ) {
          // Log unauthorized demo API access
          logAuditNonBlocking(
            AuditAction.UnauthorizedAccess,
            AuditResource.Security,
            'demo_api_access_denied',
            {
              attemptedPath: pathname,
              userRole: token?.role,
              timestamp: Date.now(),
            }
          )
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      // HIPAA compliance: Log all PHI data access for medical endpoints
      if (pathname.startsWith('/api/medical')) {
        logAuditNonBlocking(
          AuditAction.PatientAccessed,
          AuditResource.Patient,
          'medical_api_access',
          {
            endpoint: pathname,
            method: req.method,
            timestamp: Date.now(),
          }
        )
      }
    }

    // Add security headers for HIPAA compliance
    const response = NextResponse.next()

    // HIPAA compliance headers
    response.headers.set('X-HIPAA-Compliant', 'true')
    response.headers.set('X-Content-Security-Policy', "default-src 'self'")
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')

    // Cache control for sensitive data
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/patient') ||
      pathname.startsWith('/company') ||
      pathname.startsWith('/clinic') || // Keep for legacy redirects (Phase 7)
      pathname.startsWith('/admin') || // Keep for redirects
      pathname.startsWith('/provider') || // Keep for redirects
      pathname.startsWith('/superadmin')
    ) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      )
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        const hostname = req.headers.get('host') || 'localhost'

        // Allow access to public routes
        if (
          pathname.startsWith('/auth') ||
          pathname === '/' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/security/csp-report')
        ) {
          return true
        }

        // Allow public tenant routes (landing pages, booking, etc.)
        // Path-based: /clinic/[slug], /clinic/[slug]/book, etc.
        if (isPublicTenantRoute(pathname)) {
          return true
        }

        // Allow public routes on tenant domains (custom domain or subdomain)
        if (isTenantDomain(hostname)) {
          const isPublicPath = 
            pathname === '/' || 
            pathname === '/login' ||
            pathname.startsWith('/book') ||
            pathname.startsWith('/providers') ||
            pathname.startsWith('/locations') ||
            pathname.startsWith('/api/public');
          
          if (isPublicPath) {
            return true
          }
        }

        // Allow public API routes for booking
        if (pathname.startsWith('/api/public/')) {
          return true
        }

        // Check for just-logged-in flag to handle post-login redirect race condition
        // This allows the initial redirect to proceed while session cookie propagates to Edge Runtime
        // Use shared helper function for consistency
        const justLoggedIn = checkJustLoggedIn(req)

        // Require authentication for all other routes
        // Allow if token exists OR if just logged in (grace period for cookie propagation)
        // Security: just-logged-in cookie is only set after successful login and expires after 10 minutes
        // Once session token is available in Edge Runtime, it will be used instead of just-logged-in flag
        return !!token || justLoggedIn
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match protected routes and public tenant routes:
     * 
     * PROTECTED ROUTES (require authentication):
     * - Company routes (/company/*) - unified company access (replaces clinic routes)
     * - Admin routes (/admin/*) - legacy routes, redirect to /company/*
     * - Provider routes (/provider/*) - legacy routes, redirect to /company/*
     * - Patient routes (/patient/*) - HIPAA compliance
     * - Demo routes (/demo/*)
     * - Superadmin routes (/superadmin/*)
     * - Protected API routes (/api/company/*, /api/clinic/*, etc.)
     * - Medical API routes (/api/medical/*) - HIPAA compliance
     *
     * PUBLIC TENANT ROUTES (allow unauthenticated):
     * - /clinic/[slug] - Public landing pages
     * - /clinic/[slug]/book/* - Public booking
     * - /clinic/[slug]/providers/* - Care team pages
     * - /clinic/[slug]/locations/* - Clinic location pages
     * - /clinic/[slug]/login - Tenant-specific login
     * - /api/public/* - Public API for booking, etc.
     *
     * Note: Tenant domains (subdomains/custom domains) are handled in the middleware
     * by checking the hostname and allowing public paths.
     *
     * Public routes (/, /auth/*, /api/auth/*) are excluded from matcher
     * but still handled by the authorized callback if they somehow match.
     */
    '/company/:path*',
    '/clinic/:path*', // Now includes public tenant landing pages
    '/admin/:path*', // Legacy routes - redirect to /company/*
    '/provider/:path*', // Legacy routes - redirect to /company/*
    '/patient/:path*',
    '/demo/:path*',
    '/superadmin/:path*',
    '/api/company/:path*',
    '/api/clinic/:path*', // Legacy API routes
    '/api/admin/:path*', // Legacy API routes - redirect to /api/company/*
    '/api/provider/:path*', // Legacy API routes - redirect to /api/company/*
    '/api/patient/:path*',
    '/api/demo/:path*',
    '/api/superadmin/:path*',
    '/api/medical/:path*',
    '/api/public/:path*', // Public API for booking requests, etc.
  ],
}
