/**
 * Control Plane Webhook Hooks
 * 
 * These functions should be called after Clerk webhook handlers to emit
 * events to the control plane. They are optional - if the control plane
 * is not configured, they will silently skip.
 * 
 * Usage: Add to your clerk webhook route after the main handlers
 * 
 * @example
 * case 'organization.created':
 *   await handleOrgCreated(evt.data, svix_id)
 *   await emitOrgCreatedToControlPlane(evt.data)  // <-- Add this
 *   break
 */

import { emitOrgCreated, emitOrgUpdated } from './control-plane-client'

/**
 * Emit organization created event to control plane
 */
export async function emitOrgCreatedToControlPlane(data: {
  id: string
  name: string
  slug: string | null
}): Promise<void> {
  try {
    await emitOrgCreated({
      externalOrgId: data.id,
      name: data.name,
      slug: data.slug || undefined,
    })
  } catch (error) {
    // Don't fail the webhook if control plane emission fails
    console.error('Failed to emit org.created to control plane:', error)
  }
}

/**
 * Emit organization updated event to control plane
 */
export async function emitOrgUpdatedToControlPlane(data: {
  id: string
  name: string
  slug: string | null
}): Promise<void> {
  try {
    await emitOrgUpdated({
      externalOrgId: data.id,
      name: data.name,
      slug: data.slug || undefined,
    })
  } catch (error) {
    console.error('Failed to emit org.updated to control plane:', error)
  }
}

/**
 * Emit organization deleted event to control plane
 */
export async function emitOrgDeletedToControlPlane(data: {
  id: string
}): Promise<void> {
  try {
    await emitOrgUpdated({
      externalOrgId: data.id,
      status: 'deleted',
    })
  } catch (error) {
    console.error('Failed to emit org.deleted to control plane:', error)
  }
}
