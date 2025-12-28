/**
 * @startkit/analytics - Event Tracking Helpers
 *
 * Pre-defined event tracking functions for common actions
 */

import { track } from './client'
import { trackServer } from './server'
import type {
  AuthEventProperties,
  BillingEventProperties,
  FeatureEventProperties,
  AuthEventName,
  BillingEventName,
  FeatureEventName,
} from './types'

/**
 * Track authentication events
 */
export const authEvents = {
  /**
   * Track user sign in
   */
  signedIn(properties?: AuthEventProperties, serverSide = false): void {
    const eventProperties: AuthEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('user_signed_in', eventProperties, properties?.userId)
    } else {
      track('user_signed_in', eventProperties)
    }
  },

  /**
   * Track user sign out
   */
  signedOut(properties?: AuthEventProperties, serverSide = false): void {
    const eventProperties: AuthEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('user_signed_out', eventProperties, properties?.userId)
    } else {
      track('user_signed_out', eventProperties)
    }
  },

  /**
   * Track user sign up
   */
  signedUp(properties?: AuthEventProperties, serverSide = false): void {
    const eventProperties: AuthEventProperties = {
      ...properties,
      isNewUser: true,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('user_signed_up', eventProperties, properties?.userId)
    } else {
      track('user_signed_up', eventProperties)
    }
  },

  /**
   * Track email verification
   */
  emailVerified(properties?: AuthEventProperties, serverSide = false): void {
    const eventProperties: AuthEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('user_verified_email', eventProperties, properties?.userId)
    } else {
      track('user_verified_email', eventProperties)
    }
  },
}

/**
 * Track billing events
 */
export const billingEvents = {
  /**
   * Track checkout started
   */
  checkoutStarted(properties?: BillingEventProperties, serverSide = false): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('checkout_started', eventProperties, properties?.userId)
    } else {
      track('checkout_started', eventProperties)
    }
  },

  /**
   * Track checkout completed
   */
  checkoutCompleted(properties?: BillingEventProperties, serverSide = false): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('checkout_completed', eventProperties, properties?.userId)
    } else {
      track('checkout_completed', eventProperties)
    }
  },

  /**
   * Track subscription created
   */
  subscriptionCreated(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('subscription_created', eventProperties, properties?.userId)
    } else {
      track('subscription_created', eventProperties)
    }
  },

  /**
   * Track subscription updated (upgrade/downgrade)
   */
  subscriptionUpdated(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('subscription_updated', eventProperties, properties?.userId)
    } else {
      track('subscription_updated', eventProperties)
    }
  },

  /**
   * Track subscription canceled
   */
  subscriptionCanceled(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('subscription_canceled', eventProperties, properties?.userId)
    } else {
      track('subscription_canceled', eventProperties)
    }
  },

  /**
   * Track subscription resumed
   */
  subscriptionResumed(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('subscription_resumed', eventProperties, properties?.userId)
    } else {
      track('subscription_resumed', eventProperties)
    }
  },

  /**
   * Track invoice paid
   */
  invoicePaid(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('invoice_paid', eventProperties, properties?.userId)
    } else {
      track('invoice_paid', eventProperties)
    }
  },

  /**
   * Track invoice payment failed
   */
  invoicePaymentFailed(properties?: BillingEventProperties, serverSide = true): void {
    const eventProperties: BillingEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('invoice_payment_failed', eventProperties, properties?.userId)
    } else {
      track('invoice_payment_failed', eventProperties)
    }
  },
}

/**
 * Track feature usage events
 */
export const featureEvents = {
  /**
   * Track feature usage
   */
  used(properties: FeatureEventProperties, serverSide = false): void {
    const eventProperties: FeatureEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('feature_used', eventProperties, properties.userId)
    } else {
      track('feature_used', eventProperties)
    }
  },

  /**
   * Track feature access (page view, modal opened, etc.)
   */
  accessed(properties: FeatureEventProperties, serverSide = false): void {
    const eventProperties: FeatureEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('feature_accessed', eventProperties, properties.userId)
    } else {
      track('feature_accessed', eventProperties)
    }
  },

  /**
   * Track feature limit reached
   */
  limited(properties: FeatureEventProperties, serverSide = false): void {
    const eventProperties: FeatureEventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    if (serverSide) {
      trackServer('feature_limited', eventProperties, properties.userId)
    } else {
      track('feature_limited', eventProperties)
    }
  },
}
