import { createStartKitMiddleware } from '@startkit/auth/middleware'

/**
 * Auth middleware configuration for Zenthea
 *
 * Add product-specific public routes here
 */
export default createStartKitMiddleware({
  publicRoutes: [
    '/',
    // Add more public routes as needed
  ],
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
