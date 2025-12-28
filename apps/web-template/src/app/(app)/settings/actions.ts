'use server'

import { revalidatePath } from 'next/cache'
import { requireRole, requireOrganization } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { organizations, organizationMembers, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

type ActionResult<T = void> = 
  | { success: true; data?: T } 
  | { success: false; error: string }

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, organization } = await requireRole('admin')

    const name = formData.get('name') as string
    const timezone = formData.get('timezone') as string

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Organization name is required' }
    }

    if (name.length > 100) {
      return { success: false, error: 'Organization name must be less than 100 characters' }
    }

    // Update organization
    await superadminDb
      .update(organizations)
      .set({
        name: name.trim(),
        settings: {
          timezone: timezone || undefined,
        },
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.organizationId))

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: organization.organizationId,
      metadata: { name, timezone },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Failed to update organization:', error)
    return { success: false, error: 'Failed to update organization settings' }
  }
}

/**
 * Delete an organization (owner only)
 * This is a destructive action that removes all data.
 */
export async function deleteOrganization(
  confirmationText: string
): Promise<ActionResult> {
  try {
    const { user, organization } = await requireRole('owner')

    // Verify confirmation text matches organization name
    if (confirmationText !== organization.name) {
      return { 
        success: false, 
        error: 'Confirmation text does not match organization name' 
      }
    }

    // Log the action before deletion
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'organization.deleted',
      resourceType: 'organization',
      resourceId: organization.organizationId,
      metadata: { name: organization.name },
    })

    // Delete organization (cascade deletes members, subscriptions, etc.)
    await superadminDb
      .delete(organizations)
      .where(eq(organizations.id, organization.organizationId))

    // TODO: Also delete from Clerk
    // await clerkClient.organizations.deleteOrganization(organization.clerkOrgId)

    return { success: true }
  } catch (error) {
    console.error('Failed to delete organization:', error)
    return { success: false, error: 'Failed to delete organization' }
  }
}

/**
 * Leave an organization (non-owners only)
 */
export async function leaveOrganization(): Promise<ActionResult> {
  try {
    const { user, organization } = await requireOrganization()

    // Owners cannot leave - they must transfer ownership first
    if (organization.role === 'owner') {
      return { 
        success: false, 
        error: 'Organization owners cannot leave. Transfer ownership first.' 
      }
    }

    // Remove membership
    await superadminDb
      .delete(organizationMembers)
      .where(
        eq(organizationMembers.userId, user.userId)
      )

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'member.left',
      resourceType: 'member',
      resourceId: user.userId,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to leave organization:', error)
    return { success: false, error: 'Failed to leave organization' }
  }
}
