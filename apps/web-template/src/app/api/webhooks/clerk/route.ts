import { headers } from 'next/headers'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'

/**
 * Clerk webhook handler
 *
 * Syncs user and organization data from Clerk to our database.
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
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET ?? '')
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
        await handleUserCreated(evt.data)
        break

      case 'user.updated':
        await handleUserUpdated(evt.data)
        break

      case 'user.deleted':
        await handleUserDeleted(evt.data)
        break

      case 'organization.created':
        await handleOrgCreated(evt.data)
        break

      case 'organization.updated':
        await handleOrgUpdated(evt.data)
        break

      case 'organization.deleted':
        await handleOrgDeleted(evt.data)
        break

      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data)
        break

      case 'organizationMembership.deleted':
        await handleMembershipDeleted(evt.data)
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

// Event handlers - implement with your database logic

async function handleUserCreated(data: unknown) {
  console.log('User created:', data)
  // TODO: Insert user into database
  // await db.insert(users).values({
  //   clerkId: data.id,
  //   email: data.email_addresses[0].email_address,
  //   name: `${data.first_name} ${data.last_name}`.trim(),
  // })
}

async function handleUserUpdated(data: unknown) {
  console.log('User updated:', data)
  // TODO: Update user in database
}

async function handleUserDeleted(data: unknown) {
  console.log('User deleted:', data)
  // TODO: Soft delete or anonymize user
}

async function handleOrgCreated(data: unknown) {
  console.log('Organization created:', data)
  // TODO: Create organization and initial subscription
}

async function handleOrgUpdated(data: unknown) {
  console.log('Organization updated:', data)
  // TODO: Update organization
}

async function handleOrgDeleted(data: unknown) {
  console.log('Organization deleted:', data)
  // TODO: Handle organization deletion
}

async function handleMembershipCreated(data: unknown) {
  console.log('Membership created:', data)
  // TODO: Create organization member record
}

async function handleMembershipDeleted(data: unknown) {
  console.log('Membership deleted:', data)
  // TODO: Remove organization member record
}
