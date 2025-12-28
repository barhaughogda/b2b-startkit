'use client'

/**
 * @startkit/analytics - useAnalytics Hook
 *
 * React hook for accessing analytics functions
 */

import { useCallback } from 'react'
import { track, identify, setOrganization, reset, getPostHogClient } from '../client'
import type { IdentifyProperties, OrganizationProperties, BaseEventProperties } from '../types'

/**
 * Hook for accessing analytics functions
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@startkit/analytics'
 *
 * function MyComponent() {
 *   const { track, identify } = useAnalytics()
 *
 *   const handleClick = () => {
 *     track('button_clicked', { buttonName: 'upgrade' })
 *   }
 *
 *   return <button onClick={handleClick}>Upgrade</button>
 * }
 * ```
 */
export function useAnalytics() {
  const trackEvent = useCallback(
    (eventName: string, properties?: BaseEventProperties | Record<string, unknown>) => {
      track(eventName, properties)
    },
    []
  )

  const identifyUser = useCallback(
    (userId: string, properties?: IdentifyProperties) => {
      identify(userId, properties)
    },
    []
  )

  const setOrg = useCallback(
    (organizationId: string, properties?: OrganizationProperties) => {
      setOrganization(organizationId, properties)
    },
    []
  )

  const resetAnalytics = useCallback(() => {
    reset()
  }, [])

  return {
    /** Track a custom event */
    track: trackEvent,
    /** Identify a user */
    identify: identifyUser,
    /** Set organization context */
    setOrganization: setOrg,
    /** Reset analytics (call on sign out) */
    reset: resetAnalytics,
    /** Get PostHog client instance (for advanced usage) */
    posthog: getPostHogClient(),
  }
}
