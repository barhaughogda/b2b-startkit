import { describe, it, expect } from 'vitest'
import {
  hasFeature,
  getFeatureFlags,
  evaluateFeatureFlag,
  getPlanDefaultFlags,
  planMeetsMinimum,
} from '../flags'
import type { PermissionContext, FeatureFlagContext } from '../types'

describe('Feature Flags', () => {
  describe('getPlanDefaultFlags()', () => {
    it('should return empty array for free plan', () => {
      const flags = getPlanDefaultFlags('free')
      expect(flags).toEqual([])
    })

    it('should return flags for starter plan', () => {
      const flags = getPlanDefaultFlags('starter')
      expect(flags).toContain('basic_analytics')
      expect(flags).toContain('email_support')
    })

    it('should return flags for pro plan', () => {
      const flags = getPlanDefaultFlags('pro')
      expect(flags).toContain('basic_analytics')
      expect(flags).toContain('advanced_analytics')
      expect(flags).toContain('api_access')
    })

    it('should return flags for enterprise plan', () => {
      const flags = getPlanDefaultFlags('enterprise')
      expect(flags).toContain('sso')
      expect(flags).toContain('audit_logs')
      expect(flags).toContain('dedicated_support')
    })
  })

  describe('hasFeature()', () => {
    it('should return true for superadmins', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: true,
        featureFlags: new Map(),
      }

      expect(hasFeature(ctx, 'any_feature')).toBe(true)
    })

    it('should check explicit feature flags first', () => {
      const flags = new Map<string, boolean>()
      flags.set('ai_assistant', true)
      flags.set('beta_feature', false)

      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: flags,
      }

      expect(hasFeature(ctx, 'ai_assistant')).toBe(true)
      expect(hasFeature(ctx, 'beta_feature')).toBe(false)
    })

    it('should fall back to plan-based defaults', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'pro',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      expect(hasFeature(ctx, 'basic_analytics')).toBe(true)
      expect(hasFeature(ctx, 'advanced_analytics')).toBe(true)
      expect(hasFeature(ctx, 'sso')).toBe(false) // Enterprise only
    })

    it('should prioritize explicit flags over plan defaults', () => {
      const flags = new Map<string, boolean>()
      flags.set('basic_analytics', false) // Override plan default

      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'pro',
        isSuperadmin: false,
        featureFlags: flags,
      }

      expect(hasFeature(ctx, 'basic_analytics')).toBe(false)
    })
  })

  describe('getFeatureFlags()', () => {
    it('should return all flags for superadmins', () => {
      const flags = new Map<string, boolean>()
      flags.set('flag1', true)
      flags.set('flag2', false)
      flags.set('flag3', true)

      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: true,
        featureFlags: flags,
      }

      const result = getFeatureFlags(ctx)
      expect(result).toEqual(['flag1', 'flag2', 'flag3'])
    })

    it('should return only enabled flags for regular users', () => {
      const flags = new Map<string, boolean>()
      flags.set('flag1', true)
      flags.set('flag2', false)
      flags.set('flag3', true)

      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: flags,
      }

      const result = getFeatureFlags(ctx)
      expect(result).toEqual(['flag1', 'flag3'])
    })
  })

  describe('evaluateFeatureFlag()', () => {
    it('should return false if flag is disabled', () => {
      const ctx: FeatureFlagContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        plan: 'pro',
        role: 'admin',
      }

      const result = evaluateFeatureFlag(ctx, {
        key: 'test_flag',
        enabled: false,
      })

      expect(result).toBe(false)
    })

    it('should check plan requirements', () => {
      const freeCtx: FeatureFlagContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        plan: 'free',
        role: 'admin',
      }

      const proCtx: FeatureFlagContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        plan: 'pro',
        role: 'admin',
      }

      const flag = {
        key: 'premium_feature',
        enabled: true,
        minimumPlan: 'pro' as const,
      }

      expect(evaluateFeatureFlag(freeCtx, flag)).toBe(false)
      expect(evaluateFeatureFlag(proCtx, flag)).toBe(true)
    })

    it('should check user-specific overrides', () => {
      const ctx: FeatureFlagContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        plan: 'free',
        role: 'member',
      }

      const flag = {
        key: 'beta_feature',
        enabled: true,
        minimumPlan: 'pro' as const,
        conditions: {
          userIds: ['user-1'],
        },
      }

      expect(evaluateFeatureFlag(ctx, flag)).toBe(true) // Override applies
    })

    it('should check percentage rollout', () => {
      const ctx: FeatureFlagContext = {
        organizationId: 'org-1',
        userId: 'user-1',
        plan: 'free',
        role: 'member',
      }

      const flag = {
        key: 'gradual_rollout',
        enabled: true,
        conditions: {
          percentage: 50,
        },
      }

      // This is deterministic based on org ID + flag key hash
      const result = evaluateFeatureFlag(ctx, flag)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('planMeetsMinimum()', () => {
    it('should correctly compare plan tiers', () => {
      expect(planMeetsMinimum('free', 'free')).toBe(true)
      expect(planMeetsMinimum('pro', 'free')).toBe(true)
      expect(planMeetsMinimum('free', 'pro')).toBe(false)
      expect(planMeetsMinimum('enterprise', 'pro')).toBe(true)
    })
  })
})
