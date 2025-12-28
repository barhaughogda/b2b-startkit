'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { organizationMembers, users, auditLogs } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Invite a new member to the organization
 * 
 * Note: In production, this would send an email via Clerk's invitation system.
 * For now, it creates a placeholder that demonstrates the pattern.
 */
export async function inviteMember(
  organizationId: string,
  email: string,
  role: 'admin' | 'member'
): Promise<ActionResult> {
  try {
    const { user, organization } = await requireRole('admin')

    // Verify the organization matches
    if (organization.organizationId !== organizationId) {
      return { success: false, error: 'Unauthorized' }
    }

    // TODO: In production, use Clerk's organization invitation API
    // await clerkClient.organizations.createOrganizationInvitation({
    //   organizationId: organization.clerkOrgId,
    //   emailAddress: email,
    //   role: role === 'admin' ? 'org:admin' : 'org:member',
    // })

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'member.invited',
      resourceType: 'invitation',
      resourceId: email,
      metadata: { email, role },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    console.error('Failed to invite member:', error)
    return { success: false, error: 'Failed to send invitation' }
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: 'admin' | 'member'
): Promise<ActionResult> {
  try {
    const { user, organization } = await requireRole('owner')

    // Verify the organization matches
    if (organization.organizationId !== organizationId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the member being updated
    const [member] = await superadminDb
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    // Can't change owner role
    if (member.role === 'owner') {
      return { success: false, error: 'Cannot change owner role' }
    }

    // Update the role
    await superadminDb
      .update(organizationMembers)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(organizationMembers.id, memberId))

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'member.role_updated',
      resourceType: 'member',
      resourceId: member.userId,
      metadata: { previousRole: member.role, newRole },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    console.error('Failed to update member role:', error)
    return { success: false, error: 'Failed to update role' }
  }
}

/**
 * Remove a member from the organization
 */
export async function removeMember(
  organizationId: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user, organization } = await requireRole('admin')

    // Verify the organization matches
    if (organization.organizationId !== organizationId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the member being removed
    const [member] = await superadminDb
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    // Can't remove the owner
    if (member.role === 'owner') {
      return { success: false, error: 'Cannot remove the organization owner' }
    }

    // Can't remove yourself
    if (member.userId === user.userId) {
      return { success: false, error: 'Cannot remove yourself' }
    }

    // Only owners can remove admins
    if (member.role === 'admin' && organization.role !== 'owner') {
      return { success: false, error: 'Only owners can remove admins' }
    }

    // Remove the member
    await superadminDb
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, memberId))

    // TODO: In production, also remove from Clerk organization
    // await clerkClient.organizations.deleteOrganizationMembership({
    //   organizationId: organization.clerkOrgId,
    //   userId: member.clerkId,
    // })

    // Log the action
    await superadminDb.insert(auditLogs).values({
      organizationId: organization.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: member.userId,
      metadata: { removedRole: member.role },
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    console.error('Failed to remove member:', error)
    return { success: false, error: 'Failed to remove member' }
  }
}
