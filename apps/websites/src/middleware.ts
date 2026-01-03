import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Public routes that do not require authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/[slug](.*)',
  '/api/public/(.*)',
  '/website-preview(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  // Handle public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect the route using Clerk
  const authObject = await auth()
  if (!authObject.userId && !pathname.startsWith('/api/')) {
    return authObject.redirectToSignIn()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
