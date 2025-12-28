import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import postgres from 'postgres'

/**
 * Manually sync the current Clerk user to the database
 * This is a fallback when webhooks haven't fired yet
 * 
 * Uses direct database connection to bypass RLS issues
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

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch user data' },
        { status: 400 }
      )
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'User has no email address' },
        { status: 400 }
      )
    }

    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

    // Connect directly to database
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }

    // Parse URL and pass parameters explicitly to avoid URL parsing issues
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
    
    console.log('DB Config for sync-user:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      passwordPrefix: dbConfig.password.substring(0, 5),
    })
    
    const sql = postgres(dbConfig)

    try {
      // Check if user exists
      const existingUsers = await sql`
        SELECT id, email, name FROM users WHERE clerk_id = ${clerkUserId}
      `

      if (existingUsers.length > 0) {
        // Update existing user
        await sql`
          UPDATE users 
          SET email = ${email}, name = ${name}, avatar_url = ${clerkUser.imageUrl}, updated_at = NOW()
          WHERE clerk_id = ${clerkUserId}
        `

        // Also sync organizations for existing user
        let orgsSynced = 0
        try {
          const clerk = await clerkClient()
          const memberships = await clerk.users.getOrganizationMembershipList({
            userId: clerkUserId,
          })

          for (const membership of memberships.data) {
            const clerkOrgId = membership.organization.id
            const org = await clerk.organizations.get({
              organizationId: clerkOrgId,
            })

            // Check if org exists
            const [existingOrg] = await sql`
              SELECT id FROM organizations WHERE clerk_org_id = ${clerkOrgId}
            `

            let orgId: string
            if (existingOrg) {
              orgId = existingOrg.id
            } else {
              const [createdOrg] = await sql`
                INSERT INTO organizations (clerk_org_id, name, slug)
                VALUES (${clerkOrgId}, ${org.name}, ${org.slug || clerkOrgId})
                RETURNING id
              `
              orgId = createdOrg.id
            }

            // Sync membership
            const [existingMembership] = await sql`
              SELECT id FROM organization_members 
              WHERE organization_id = ${orgId} AND user_id = ${existingUsers[0].id}
            `

            if (!existingMembership) {
              await sql`
                INSERT INTO organization_members (organization_id, user_id, role)
                VALUES (${orgId}, ${existingUsers[0].id}, ${membership.role})
              `
              orgsSynced++
            }
          }
        } catch (orgError) {
          console.error('Error syncing organizations:', orgError)
          // Don't fail the whole request if org sync fails
        }

        return NextResponse.json({
          success: true,
          message: orgsSynced > 0 
            ? `User updated and ${orgsSynced} organization(s) synced`
            : 'User updated',
          user: { ...existingUsers[0], email, name },
          organizationsSynced: orgsSynced,
        })
      }

      // Create new user
      const [newUser] = await sql`
        INSERT INTO users (clerk_id, email, name, avatar_url)
        VALUES (${clerkUserId}, ${email}, ${name}, ${clerkUser.imageUrl})
        RETURNING id, email, name
      `

      // Also sync organizations for this user
      let orgsSynced = 0
      try {
        const clerk = await clerkClient()
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId: clerkUserId,
        })

        for (const membership of memberships.data) {
          const clerkOrgId = membership.organization.id
          const org = await clerk.organizations.get({
            organizationId: clerkOrgId,
          })

          // Check if org exists
          const [existingOrg] = await sql`
            SELECT id FROM organizations WHERE clerk_org_id = ${clerkOrgId}
          `

          let orgId: string
          if (existingOrg) {
            orgId = existingOrg.id
          } else {
            const [createdOrg] = await sql`
              INSERT INTO organizations (clerk_org_id, name, slug)
              VALUES (${clerkOrgId}, ${org.name}, ${org.slug || clerkOrgId})
              RETURNING id
            `
            orgId = createdOrg.id
          }

          // Sync membership
          const [existingMembership] = await sql`
            SELECT id FROM organization_members 
            WHERE organization_id = ${orgId} AND user_id = ${newUser.id}
          `

          if (!existingMembership) {
            await sql`
              INSERT INTO organization_members (organization_id, user_id, role)
              VALUES (${orgId}, ${newUser.id}, ${membership.role})
            `
            orgsSynced++
          }
        }
      } catch (orgError) {
        console.error('Error syncing organizations:', orgError)
        // Don't fail the whole request if org sync fails
      }

      return NextResponse.json({
        success: true,
        message: orgsSynced > 0 
          ? `User created and ${orgsSynced} organization(s) synced`
          : 'User created',
        user: newUser,
        organizationsSynced: orgsSynced,
      })
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error syncing user:', error)
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

/**
 * GET - Check if user is synced
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, synced: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, synced: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }

    // Parse URL and pass parameters explicitly to avoid URL parsing issues
    const urlObj = new URL(databaseUrl)
    const sql = postgres({
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || 5432,
      database: urlObj.pathname.slice(1) || 'postgres',
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    })

    try {
      const users = await sql`
        SELECT id, email, name, clerk_id FROM users WHERE clerk_id = ${clerkUserId}
      `

      if (users.length > 0) {
        return NextResponse.json({
          success: true,
          synced: true,
          user: users[0]
        })
      }

      return NextResponse.json({
        success: true,
        synced: false,
        message: 'User not synced yet'
      })
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error checking user sync:', error)
    return NextResponse.json(
      { 
        success: false, 
        synced: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
