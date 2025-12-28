'use server'

import { redirect } from 'next/navigation'
import { requireOrganization } from '@startkit/auth/server'
import { 
  createCheckoutSession, 
  createBillingPortalSession, 
  cancelSubscription as cancelStripeSubscription,
  resumeSubscription as resumeStripeSubscription,
} from '@startkit/billing'
import { superadminDb } from '@startkit/database'
import { subscriptions, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import { env } from '@startkit/config'

type ActionResult = { success: true; url?: string } | { success: false; error: string }

/**
 * Create a checkout session for upgrading to a paid plan
 */
export async function createCheckout(priceId: string): Promise<ActionResult> {
  try {
    const { user, organization } = await requireOrganization()

    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { url } = await createCheckoutSession({
      organizationId: organization.organizationId,
      priceId,
      successUrl: `${baseUrl}/billing?success=true`,
      cancelUrl: `${baseUrl}/billing?canceled=true`,
    })

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'billing.checkout_started',
      resourceType: 'subscription',
      metadata: { priceId },
    })

    return { success: true, url }
  } catch (error) {
    console.error('Failed to create checkout:', error)
    return { success: false, error: 'Failed to create checkout session' }
  }
}

/**
 * Open the Stripe billing portal
 */
export async function openBillingPortal(): Promise<ActionResult> {
  try {
    const { organization } = await requireOrganization()

    // Get the Stripe customer ID
    const [subscription] = await superadminDb
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.organizationId))
      .limit(1)

    if (!subscription?.stripeCustomerId) {
      return { success: false, error: 'No billing account found' }
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { url } = await createBillingPortalSession(
      subscription.stripeCustomerId,
      `${baseUrl}/billing`
    )

    return { success: true, url }
  } catch (error) {
    console.error('Failed to open billing portal:', error)
    return { success: false, error: 'Failed to open billing portal' }
  }
}

/**
 * Cancel the subscription at period end
 */
export async function cancelSubscription(): Promise<ActionResult> {
  try {
    const { user, organization } = await requireOrganization()

    await cancelStripeSubscription(organization.organizationId)

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'billing.subscription_canceled',
      resourceType: 'subscription',
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    return { success: false, error: 'Failed to cancel subscription' }
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(): Promise<ActionResult> {
  try {
    const { user, organization } = await requireOrganization()

    await resumeStripeSubscription(organization.organizationId)

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'billing.subscription_resumed',
      resourceType: 'subscription',
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to resume subscription:', error)
    return { success: false, error: 'Failed to resume subscription' }
  }
}
