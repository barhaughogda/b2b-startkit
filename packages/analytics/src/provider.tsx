'use client'

/**
 * @startkit/analytics - Analytics Provider
 *
 * React context provider for analytics
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { initAnalytics, identify as identifyUser, setOrganization as setOrg, reset as resetAnalytics, getPostHogClient, track as trackEvent } from './client'
import type { IdentifyProperties, OrganizationProperties } from './types'

interface AnalyticsContextValue {
  /** PostHog client instance (null if not initialized) */
  posthog: ReturnType<typeof getPostHogClient>
  /** Track an event */
  track: (eventName: string, properties?: Record<string, unknown>) => void
  /** Identify a user */
  identify: (userId: string, properties?: IdentifyProperties) => void
  /** Set organization context */
  setOrganization: (organizationId: string, properties?: OrganizationProperties) => void
  /** Reset analytics (call on sign out) */
  reset: () => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

/**
 * Analytics Provider Component
 * Wrap your app with this to enable analytics tracking
 *
 * @example
 * ```tsx
 * import { AnalyticsProvider } from '@startkit/analytics'
 *
 * function RootLayout({ children }) {
 *   return (
 *     <AnalyticsProvider>
 *       {children}
 *     </AnalyticsProvider>
 *   )
 * }
 * ```
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false)

  useEffect(() => {
    // Initialize PostHog once
    if (!initializedRef.current) {
      initAnalytics()
      initializedRef.current = true
    }
  }, [])

  const value: AnalyticsContextValue = {
    posthog: getPostHogClient(),
    track: trackEvent,
    identify: identifyUser,
    setOrganization: setOrg,
    reset: resetAnalytics,
  }

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}

/**
 * Hook to access analytics context
 * Prefer using useAnalytics hook for better type safety
 */
export function useAnalyticsContext(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)
  if (!context) {
    // Return no-op functions if provider is not mounted
    return {
      posthog: null,
      track: () => {},
      identify: () => {},
      setOrganization: () => {},
      reset: () => {},
    }
  }
  return context
}
