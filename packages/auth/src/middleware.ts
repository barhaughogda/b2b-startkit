import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes that don't require authentication
 * Products should extend this list in their middleware.ts
 */
const defaultPublicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/pricing',
  '/about',
  '/blog(.*)',
  '/docs(.*)',
]

/**
 * Creates StartKit auth middleware with sensible defaults
 *
 * @example
 * // In your app's middleware.ts
 * import { createStartKitMiddleware } from '@startkit/auth/middleware'
 *
 * export default createStartKitMiddleware({
 *   publicRoutes: ['/custom-public-route'],
 *   afterAuth: async (auth, req) => {
 *     // Custom logic after auth
 *   }
 * })
 *
 * @ai-no-modify Core middleware - changes require security review
 */
export function createStartKitMiddleware(options?: {
  publicRoutes?: string[]
  afterAuth?: (auth: unknown, req: Request) => Promise<Response | void>
}) {
  const publicRoutes = [...defaultPublicRoutes, ...(options?.publicRoutes ?? [])]
  const isPublicRoute = createRouteMatcher(publicRoutes)

  return clerkMiddleware(async (auth, req) => {
    // Allow public routes
    if (isPublicRoute(req)) {
      return options?.afterAuth?.(auth, req)
    }

    // Protect all other routes
    await auth.protect()

    // Run custom afterAuth if provided
    return options?.afterAuth?.(auth, req)
  })
}

/**
 * Default middleware export for simple use cases
 */
export const middleware = createStartKitMiddleware()

/**
 * Default config for Next.js middleware
 */
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
