import 'server-only'
import { superadminDb } from '@startkit/database'
import { organizationMembers, users } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

export interface TeamMember {
  id: string
  memberId: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}

/**
 * Fetch all team members for an organization
 */
export async function getTeamMembers(organizationId: string): Promise<TeamMember[]> {
  const members = await superadminDb
    .select({
      memberId: organizationMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(organizationMembers.joinedAt)

  return members.map((m) => ({
    id: m.userId,
    memberId: m.memberId,
    name: m.name,
    email: m.email,
    avatarUrl: m.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt,
  }))
}
