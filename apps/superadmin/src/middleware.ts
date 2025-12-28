import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ['/sign-in(.*)', '/sign-up(.*)']

const isPublicRoute = createRouteMatcher(publicRoutes)

/**
 * Superadmin-only middleware
 * 
 * This middleware ensures that only superadmins can access the dashboard.
 * The actual superadmin check happens in the layout after auth is resolved.
 * 
 * @ai-no-modify Core middleware - changes require security review
 */
export default clerkMiddleware(async (auth, req) => {
  // Allow public routes (sign-in, sign-up)
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect all other routes - require authentication
  await auth.protect()

  // Note: Superadmin check is done in the layout component
  // because we need to query the database for the isSuperadmin flag
  // Middleware runs at the edge and can't easily access our database
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
