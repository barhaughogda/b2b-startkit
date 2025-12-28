import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import postgres from 'postgres'

/**
 * Manually sync the current user's Clerk organizations to the database
 * This is a fallback when webhooks haven't fired yet
 */
export async function POST() {
  try {
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }

    const urlObj = new URL(databaseUrl)
    const dbConfig = {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || 5432,
      database: urlObj.pathname.slice(1) || 'postgres',
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    }
    
    const sql = postgres(dbConfig)

    try {
      // Get user from database
      const [dbUser] = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `

      if (!dbUser) {
        return NextResponse.json(
          { success: false, error: 'User not synced. Please sync user first.' },
          { status: 400 }
        )
      }

      // Fetch user's organization memberships from Clerk
      const clerk = await clerkClient()
      const memberships = await clerk.users.getOrganizationMembershipList({
        userId: clerkUserId,
      })

      const syncedOrgs: Array<{ id: string; name: string; clerkOrgId: string }> = []
      const syncedMemberships: Array<{ orgId: string; role: string }> = []

      // Sync each organization
      for (const membership of memberships.data) {
        const clerkOrgId = membership.organization.id
        
        // Fetch full org details from Clerk
        const org = await clerk.organizations.get({
          organizationId: clerkOrgId,
        })

        // Check if org exists in database
        const [existingOrg] = await sql`
          SELECT id FROM organizations WHERE clerk_org_id = ${clerkOrgId}
        `

        let orgId: string
        if (existingOrg) {
          // Update existing org
          await sql`
            UPDATE organizations 
            SET name = ${org.name}, 
                slug = ${org.slug || clerkOrgId},
                updated_at = NOW()
            WHERE clerk_org_id = ${clerkOrgId}
          `
          orgId = existingOrg.id
        } else {
          // Create new org
          const [newOrg] = await sql`
            INSERT INTO organizations (clerk_org_id, name, slug)
            VALUES (${clerkOrgId}, ${org.name}, ${org.slug || clerkOrgId})
            RETURNING id
          `
          orgId = newOrg.id
        }

        syncedOrgs.push({
          id: orgId,
          name: org.name,
          clerkOrgId,
        })

        // Sync membership
        const [existingMembership] = await sql`
          SELECT id FROM organization_members 
          WHERE organization_id = ${orgId} AND user_id = ${dbUser.id}
        `

        if (existingMembership) {
          // Update role
          await sql`
            UPDATE organization_members 
            SET role = ${membership.role}, updated_at = NOW()
            WHERE id = ${existingMembership.id}
          `
        } else {
          // Create membership
          await sql`
            INSERT INTO organization_members (organization_id, user_id, role)
            VALUES (${orgId}, ${dbUser.id}, ${membership.role})
          `
        }

        syncedMemberships.push({
          orgId,
          role: membership.role,
        })
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${syncedOrgs.length} organizations and ${syncedMemberships.length} memberships`,
        organizations: syncedOrgs,
        memberships: syncedMemberships,
      })
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error syncing organizations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
