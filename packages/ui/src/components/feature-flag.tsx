'use client'

import { type ReactNode } from 'react'
import { hasFeature } from '@startkit/rbac'
import type { PermissionContext, FeatureFlagKey } from '@startkit/rbac'

/**
 * FeatureFlag component
 * Conditionally renders children based on feature flag status
 *
 * @example
 * ```tsx
 * <FeatureFlag ctx={permissionContext} flag="ai_assistant">
 *   <AIAssistant />
 * </FeatureFlag>
 * ```
 */
export interface FeatureFlagProps {
  /** Permission context for checking feature flags */
  ctx: PermissionContext
  /** Feature flag key to check */
  flag: FeatureFlagKey
  /** Content to render if feature is enabled */
  children: ReactNode
  /** Optional fallback content when feature is disabled */
  fallback?: ReactNode
}

export function FeatureFlag({ ctx, flag, children, fallback = null }: FeatureFlagProps) {
  if (hasFeature(ctx, flag)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * FeatureFlagGate component
 * Shows upgrade prompt when feature is disabled
 *
 * @example
 * ```tsx
 * <FeatureFlagGate ctx={permissionContext} flag="advanced_analytics" plan="pro">
 *   <AdvancedAnalytics />
 * </FeatureFlagGate>
 * ```
 */
export interface FeatureFlagGateProps {
  /** Permission context for checking feature flags */
  ctx: PermissionContext
  /** Feature flag key to check */
  flag: FeatureFlagKey
  /** Minimum plan required (for upgrade prompt) */
  plan?: string
  /** Feature name for upgrade prompt */
  featureName?: string
  /** Content to render if feature is enabled */
  children: ReactNode
}

export function FeatureFlagGate({
  ctx,
  flag,
  plan,
  featureName,
  children,
}: FeatureFlagGateProps) {
  if (hasFeature(ctx, flag)) {
    return <>{children}</>
  }

  // Show upgrade prompt
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">
        {featureName || flag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} is not available
      </h3>
      <p className="text-muted-foreground mb-4">
        {plan ? `Upgrade to ${plan} plan to access this feature.` : 'This feature is not available for your plan.'}
      </p>
      <a
        href="/billing"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Upgrade Plan
      </a>
    </div>
  )
}
