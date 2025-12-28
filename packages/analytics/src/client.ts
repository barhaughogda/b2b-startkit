'use client'

/**
 * @startkit/analytics - Client-side Analytics
 *
 * Client-side PostHog integration for browser tracking
 */

import posthog from 'posthog-js'
import { env } from '@startkit/config'
import type {
  AnalyticsEvent,
  IdentifyProperties,
  OrganizationProperties,
  BaseEventProperties,
} from './types'

let posthogClient: typeof posthog | null = null

/**
 * Initialize PostHog client
 * Call this once in your app's root layout or provider
 *
 * @example
 * ```tsx
 * import { initAnalytics } from '@startkit/analytics/client'
 *
 * function RootLayout() {
 *   useEffect(() => {
 *     initAnalytics()
 *   }, [])
 *   return <div>...</div>
 * }
 * ```
 */
export function initAnalytics(): typeof posthog | null {
  // Skip initialization if PostHog is not configured
  if (!env.client.NEXT_PUBLIC_POSTHOG_KEY || !env.client.NEXT_PUBLIC_POSTHOG_HOST) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ PostHog not configured - analytics disabled')
    }
    return null
  }

  // Skip if already initialized
  if (posthogClient) {
    return posthogClient
  }

  // Only initialize in browser
  if (typeof window === 'undefined') {
    return null
  }

  try {
    posthog.init(env.client.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.client.NEXT_PUBLIC_POSTHOG_HOST,
      // Enable autocapture for common events
      autocapture: true,
      // Capture pageviews automatically
      capture_pageview: true,
      // Capture pageleaves
      capture_pageleave: true,
      // Callback when PostHog is loaded
      loaded: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ PostHog initialized')
        }
      },
    })

    posthogClient = posthog
    return posthogClient
  } catch (error) {
    console.error('Failed to initialize PostHog:', error)
    return null
  }
}

/**
 * Get the PostHog client instance
 * Returns null if not initialized or not configured
 */
export function getPostHogClient(): typeof posthog | null {
  if (!posthogClient) {
    return initAnalytics()
  }
  return posthogClient
}

/**
 * Track a custom event
 *
 * @example
 * ```tsx
 * import { track } from '@startkit/analytics/client'
 *
 * function handleClick() {
 *   track('button_clicked', { buttonName: 'upgrade' })
 * }
 * ```
 */
export function track(
  eventName: string,
  properties?: BaseEventProperties | Record<string, unknown>
): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.capture(eventName, properties)
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}

/**
 * Identify a user
 * Call this when a user signs in or their profile is updated
 *
 * @example
 * ```tsx
 * import { identify } from '@startkit/analytics/client'
 *
 * identify(userId, {
 *   email: user.email,
 *   name: user.name,
 *   isSuperadmin: user.isSuperadmin
 * })
 * ```
 */
export function identify(userId: string, properties?: IdentifyProperties): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.identify(userId, properties)
  } catch (error) {
    console.error('Failed to identify user:', error)
  }
}

/**
 * Set organization context
 * Call this when a user switches organizations
 *
 * @example
 * ```tsx
 * import { setOrganization } from '@startkit/analytics/client'
 *
 * setOrganization(orgId, {
 *   name: org.name,
 *   plan: org.plan,
 *   memberCount: org.memberCount
 * })
 * ```
 */
export function setOrganization(
  organizationId: string,
  properties?: OrganizationProperties
): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    // PostHog uses groups for organization tracking
    client.group('organization', organizationId, properties)
  } catch (error) {
    console.error('Failed to set organization:', error)
  }
}

/**
 * Reset analytics (call on sign out)
 */
export function reset(): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.reset()
  } catch (error) {
    console.error('Failed to reset analytics:', error)
  }
}
