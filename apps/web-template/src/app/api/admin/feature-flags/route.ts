import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@startkit/auth/server'
import { requirePermission } from '@startkit/rbac'
import {
  getAllFeatureFlagDefinitions,
  loadOrganizationFeatureFlags,
  setOrganizationFeatureFlag,
  removeOrganizationFeatureFlag,
} from '@startkit/rbac/server'
import { z } from 'zod'
import { requireOrganization } from '@startkit/auth/server'
import { db } from '@startkit/database'
import { subscriptions } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import type { PlanTier } from '@startkit/config'

/**
 * Get all feature flag definitions
 * GET /api/admin/feature-flags
 *
 * Returns all available feature flags with their definitions
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await requireAuth()

    // Check permission - admins and owners can view feature flags
    const orgContext = await requireOrganization()

    // Fetch plan from subscription table
    const [subscription] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgContext.organization.id))
      .limit(1)

    const plan: PlanTier = (subscription?.plan as PlanTier) || 'free'

    requirePermission(
      {
        role: orgContext.organization.role,
        customPermissions: [],
        plan,
        isSuperadmin: authContext.user.isSuperadmin,
        featureFlags: new Map(),
      },
      'read:settings'
    )

    const definitions = await getAllFeatureFlagDefinitions()

    // Load current organization's feature flags
    const orgFlags = await loadOrganizationFeatureFlags(orgContext.organization.id, plan)

    // Combine definitions with current values
    const flagsWithValues = definitions.map((def) => ({
      ...def,
      enabled: orgFlags.get(def.key) ?? def.defaultEnabled,
      isOverride: orgFlags.has(def.key) && orgFlags.get(def.key) !== def.defaultEnabled,
    }))

    return NextResponse.json({
      success: true,
      data: {
        flags: flagsWithValues,
        plan,
      },
    })
  } catch (error) {
    console.error('Error fetching feature flags:', error)
    if (error instanceof Error && error.name === 'PermissionDeniedError') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch feature flags' } },
      { status: 500 }
    )
  }
}

/**
 * Update a feature flag for the organization
 * POST /api/admin/feature-flags
 *
 * Body: { flagKey: string, enabled: boolean, reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await requireAuth()
    const orgContext = await requireOrganization()

    // Fetch plan from subscription table
    const [subscription] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgContext.organization.id))
      .limit(1)

    const plan: PlanTier = (subscription?.plan as PlanTier) || 'free'

    // Only owners and admins can modify feature flags
    requirePermission(
      {
        role: orgContext.organization.role,
        customPermissions: [],
        plan,
        isSuperadmin: authContext.user.isSuperadmin,
        featureFlags: new Map(),
      },
      'update:settings'
    )

    const body = await req.json()
    const schema = z.object({
      flagKey: z.string().min(1),
      enabled: z.boolean(),
      reason: z.string().optional(),
    })

    const { flagKey, enabled, reason } = schema.parse(body)

    // Verify the flag exists
    const definitions = await getAllFeatureFlagDefinitions()
    const flagExists = definitions.some((def) => def.key === flagKey)

    if (!flagExists) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } },
        { status: 404 }
      )
    }

    // Set the override
    const result = await setOrganizationFeatureFlag(
      orgContext.organization.id,
      flagKey,
      enabled,
      authContext.user.userId,
      reason
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error updating feature flag:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message } },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.name === 'PermissionDeniedError') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update feature flag' } },
      { status: 500 }
    )
  }
}

/**
 * Remove a feature flag override (revert to default)
 * DELETE /api/admin/feature-flags?flagKey=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const authContext = await requireAuth()
    const orgContext = await requireOrganization()

    // Fetch plan from subscription table
    const [subscription] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgContext.organization.id))
      .limit(1)

    const plan: PlanTier = (subscription?.plan as PlanTier) || 'free'

    // Only owners and admins can modify feature flags
    requirePermission(
      {
        role: orgContext.organization.role,
        customPermissions: [],
        plan,
        isSuperadmin: authContext.user.isSuperadmin,
        featureFlags: new Map(),
      },
      'update:settings'
    )

    const { searchParams } = new URL(req.url)
    const flagKey = searchParams.get('flagKey')

    if (!flagKey) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'flagKey query parameter is required' } },
        { status: 400 }
      )
    }

    await removeOrganizationFeatureFlag(orgContext.organization.id, flagKey)

    return NextResponse.json({
      success: true,
      data: { message: 'Feature flag override removed' },
    })
  } catch (error) {
    console.error('Error removing feature flag override:', error)
    if (error instanceof Error && error.name === 'PermissionDeniedError') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove feature flag override' } },
      { status: 500 }
    )
  }
}
