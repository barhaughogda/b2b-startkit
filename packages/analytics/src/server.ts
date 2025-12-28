/**
 * @startkit/analytics - Server-side Analytics
 *
 * Server-side PostHog integration for API route tracking
 */

import { PostHog } from 'posthog-node'
import { env } from '@startkit/config'
import type {
  BaseEventProperties,
  IdentifyProperties,
  OrganizationProperties,
} from './types'

let posthog: PostHog | null = null

/**
 * Initialize PostHog server client
 * Call this once at server startup
 */
function initServerAnalytics(): PostHog | null {
  // Skip if not configured
  if (!env.server.POSTHOG_API_KEY || !env.client.NEXT_PUBLIC_POSTHOG_HOST) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ PostHog server not configured - server-side analytics disabled')
    }
    return null
  }

  // Skip if already initialized
  if (posthog) {
    return posthog
  }

  try {
    posthog = new PostHog(env.server.POSTHOG_API_KEY, {
      host: env.client.NEXT_PUBLIC_POSTHOG_HOST,
    })

    // Graceful shutdown
    if (typeof process !== 'undefined') {
      process.on('SIGTERM', () => {
        posthog?.shutdown()
      })
      process.on('SIGINT', () => {
        posthog?.shutdown()
      })
    }

    return posthog
  } catch (error) {
    console.error('Failed to initialize PostHog server:', error)
    return null
  }
}

/**
 * Get the PostHog server client instance
 */
export function getPostHogServer(): PostHog | null {
  if (!posthog) {
    return initServerAnalytics()
  }
  return posthog
}

/**
 * Track a server-side event
 *
 * @example
 * ```ts
 * import { trackServer } from '@startkit/analytics/server'
 *
 * export async function POST(req: Request) {
 *   trackServer('api_endpoint_called', {
 *     endpoint: '/api/users',
 *     userId: user.id
 *   })
 * }
 * ```
 */
export function trackServer(
  eventName: string,
  properties?: BaseEventProperties | Record<string, unknown>,
  distinctId?: string
): void {
  const client = getPostHogServer()
  if (!client) return

  try {
    client.capture({
      distinctId: distinctId || 'server',
      event: eventName,
      properties,
    })
  } catch (error) {
    console.error('Failed to track server event:', error)
  }
}

/**
 * Identify a user server-side
 */
export function identifyServer(userId: string, properties?: IdentifyProperties): void {
  const client = getPostHogServer()
  if (!client) return

  try {
    client.identify({
      distinctId: userId,
      properties,
    })
  } catch (error) {
    console.error('Failed to identify user server-side:', error)
  }
}

/**
 * Set organization context server-side
 */
export function setOrganizationServer(
  organizationId: string,
  properties?: OrganizationProperties
): void {
  const client = getPostHogServer()
  if (!client) return

  try {
    client.groupIdentify({
      groupType: 'organization',
      groupKey: organizationId,
      properties,
    })
  } catch (error) {
    console.error('Failed to set organization server-side:', error)
  }
}
