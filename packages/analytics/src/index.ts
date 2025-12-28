/**
 * @startkit/analytics
 *
 * PostHog analytics integration for StartKit products.
 * Provides product analytics and event tracking.
 *
 * @ai-context This package provides:
 * - Client-side and server-side PostHog integration
 * - React hooks and providers for easy tracking
 * - Pre-defined event helpers for auth, billing, and features
 * - Type-safe event schemas
 */

// Client-side exports
export {
  initAnalytics,
  getPostHogClient,
  track,
  identify,
  setOrganization,
  reset,
} from './client'

// Server-side exports
export {
  getPostHogServer,
  trackServer,
  identifyServer,
  setOrganizationServer,
} from './server'

// React components and hooks
export { AnalyticsProvider, useAnalyticsContext } from './provider'
export { useAnalytics } from './hooks/use-analytics'

// Event helpers
export { authEvents, billingEvents, featureEvents } from './events'

// Types
export type {
  AnalyticsEvent,
  BaseEventProperties,
  AuthEventProperties,
  BillingEventProperties,
  FeatureEventProperties,
  IdentifyProperties,
  OrganizationProperties,
  AuthEventName,
  BillingEventName,
  FeatureEventName,
  AnalyticsEventName,
} from './types'
