import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import postgres from 'postgres'

/**
 * Sync a single organization from Clerk to the database
 * This is used when an organization exists in Clerk but not in the database
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId, orgId: activeOrgId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clerkOrgId } = body

    if (!clerkOrgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    if (clerkOrgId !== activeOrgId) {
      return NextResponse.json(
        { success: false, error: 'Cannot sync organization you are not a member of' },
        { status: 403 }
      )
    }

    // Fetch organization details from Clerk
    const clerk = await clerkClient()
    const org = await clerk.organizations.getOrganization({ organizationId: clerkOrgId })

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found in Clerk' },
        { status: 404 }
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
    }

    const sql = postgres(dbConfig, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    })

    try {
      // Check if organization already exists
      const existingOrgs = await sql`
        SELECT id FROM organizations WHERE clerk_org_id = ${clerkOrgId}
      `

      let orgId: string

      if (existingOrgs.length > 0) {
        // Update existing organization
        orgId = existingOrgs[0].id
        await sql`
          UPDATE organizations
          SET name = ${org.name}, slug = ${org.slug || org.name.toLowerCase().replace(/\s+/g, '-')}, updated_at = NOW()
          WHERE clerk_org_id = ${clerkOrgId}
        `
      } else {
        // Create new organization
        const [newOrg] = await sql`
          INSERT INTO organizations (clerk_org_id, name, slug)
          VALUES (${clerkOrgId}, ${org.name}, ${org.slug || org.name.toLowerCase().replace(/\s+/g, '-')})
          RETURNING id
        `
        orgId = newOrg.id
      }

      // Get the user's database ID
      const [dbUser] = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `

      if (!dbUser) {
        return NextResponse.json(
          { success: false, error: 'User not found in database. Please sync user first.' },
          { status: 400 }
        )
      }

      // Check if membership exists
      const existingMemberships = await sql`
        SELECT id FROM organization_members
        WHERE organization_id = ${orgId} AND user_id = ${dbUser.id}
      `

      if (existingMemberships.length === 0) {
        // Get role from Clerk
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: clerkOrgId,
        })
        const userMembership = memberships.data.find(m => m.publicUserData?.userId === clerkUserId)
        const role = userMembership?.role === 'org:admin' ? 'owner' : 'member'

        // Create membership
        await sql`
          INSERT INTO organization_members (organization_id, user_id, role)
          VALUES (${orgId}, ${dbUser.id}, ${role})
        `
      }

      return NextResponse.json({
        success: true,
        message: 'Organization synced successfully',
        organization: {
          id: orgId,
          name: org.name,
          slug: org.slug,
        },
      })
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error syncing organization:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
