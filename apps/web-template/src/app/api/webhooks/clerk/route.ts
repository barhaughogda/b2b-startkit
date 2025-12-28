import { headers } from 'next/headers'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { env } from '@startkit/config'
import {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  handleOrgCreated,
  handleOrgUpdated,
  handleOrgDeleted,
  handleMembershipCreated,
  handleMembershipUpdated,
  handleMembershipDeleted,
} from '@startkit/auth/webhooks'

/**
 * Clerk webhook handler
 *
 * Syncs user and organization data from Clerk to our database.
 * All handlers are idempotent and safe to replay.
 *
 * @ai-no-modify Webhook handlers are critical for data sync.
 */
export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // Validate headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify the webhook signature
  const wh = new Webhook(env.server.CLERK_WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the webhook event
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data, svix_id)
        break

      case 'user.updated':
        await handleUserUpdated(evt.data, svix_id)
        break

      case 'user.deleted':
        await handleUserDeleted(evt.data, svix_id)
        break

      case 'organization.created':
        await handleOrgCreated(evt.data, svix_id)
        break

      case 'organization.updated':
        await handleOrgUpdated(evt.data, svix_id)
        break

      case 'organization.deleted':
        await handleOrgDeleted(evt.data, svix_id)
        break

      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data, svix_id)
        break

      case 'organizationMembership.updated':
        await handleMembershipUpdated(evt.data, svix_id)
        break

      case 'organizationMembership.deleted':
        await handleMembershipDeleted(evt.data, svix_id)
        break

      default:
        console.log(`Unhandled Clerk webhook event: ${eventType}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error(`Error handling Clerk webhook ${eventType}:`, error)
    return new Response('Webhook handler error', { status: 500 })
  }
}
