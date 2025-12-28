/**
 * Pricing Configuration Tests
 * 
 * Tests for pricing plan configuration and calculations
 */

import { describe, it, expect } from 'vitest'
import { getPlanConfig, getAvailablePlans, planToPriceConfig } from '../pricing'
import type { PlanTier } from '@startkit/config'

describe('Pricing Configuration', () => {
  describe('getPlanConfig()', () => {
    it('should return free plan config', () => {
      const plan = getPlanConfig('free')
      expect(plan.tier).toBe('free')
      expect(plan.name).toBe('Free')
      expect(plan.pricing.monthly).toBe(0)
      expect(plan.pricing.yearly).toBe(0)
      expect(plan.limits.seats).toBe(3)
    })

    it('should return starter plan config', () => {
      const plan = getPlanConfig('starter')
      expect(plan.tier).toBe('starter')
      expect(plan.name).toBe('Starter')
      expect(plan.pricing.monthly).toBe(2900)
      expect(plan.pricing.yearly).toBe(29000)
      expect(plan.limits.seats).toBe(10)
    })

    it('should return pro plan config', () => {
      const plan = getPlanConfig('pro')
      expect(plan.tier).toBe('pro')
      expect(plan.name).toBe('Pro')
      expect(plan.pricing.monthly).toBe(9900)
      expect(plan.pricing.yearly).toBe(99000)
      expect(plan.limits.seats).toBe(50)
    })

    it('should return enterprise plan config', () => {
      const plan = getPlanConfig('enterprise')
      expect(plan.tier).toBe('enterprise')
      expect(plan.name).toBe('Enterprise')
      expect(plan.pricing.monthly).toBe(29900)
      expect(plan.pricing.yearly).toBe(299000)
      expect(plan.limits.seats).toBeUndefined() // Unlimited
    })

    it('should have correct feature lists', () => {
      const freePlan = getPlanConfig('free')
      expect(freePlan.features).toContainEqual({ name: 'Up to 3 team members', included: true })

      const proPlan = getPlanConfig('pro')
      expect(proPlan.features).toContainEqual({ name: 'Up to 50 team members', included: true })
      expect(proPlan.features).toContainEqual({ name: 'Priority support', included: true })
    })

    it('should have correct limits', () => {
      const freePlan = getPlanConfig('free')
      expect(freePlan.limits.apiCallsPerMonth).toBe(1000)
      expect(freePlan.limits.storageGb).toBe(1)

      const enterprisePlan = getPlanConfig('enterprise')
      expect(enterprisePlan.limits.apiCallsPerMonth).toBeUndefined() // Unlimited
      expect(enterprisePlan.limits.storageGb).toBeUndefined() // Unlimited
    })
  })

  describe('getAvailablePlans()', () => {
    it('should return all available plans', () => {
      const plans = getAvailablePlans()
      expect(plans.length).toBeGreaterThan(0)
      expect(plans.every((plan) => plan.available)).toBe(true)
    })

    it('should include all default plan tiers', () => {
      const plans = getAvailablePlans()
      const tiers = plans.map((p) => p.tier)
      expect(tiers).toContain('free')
      expect(tiers).toContain('starter')
      expect(tiers).toContain('pro')
      expect(tiers).toContain('enterprise')
    })
  })

  describe('planToPriceConfig()', () => {
    it('should convert plan config to price config', () => {
      const plan = getPlanConfig('pro')
      const priceConfig = planToPriceConfig(plan, {
        monthly: 'price_pro_monthly',
        yearly: 'price_pro_yearly',
      })

      expect(priceConfig.id).toBe('pro')
      expect(priceConfig.plan).toBe('pro')
      expect(priceConfig.name).toBe('Pro')
      expect(priceConfig.monthlyPrice).toBe(9900)
      expect(priceConfig.yearlyPrice).toBe(99000)
    })

    it('should include plan features', () => {
      const plan = getPlanConfig('starter')
      const priceConfig = planToPriceConfig(plan, {
        monthly: 'price_starter_monthly',
      })

      expect(priceConfig.features.length).toBeGreaterThan(0)
      expect(priceConfig.features).toContain('Up to 10 team members')
    })

    it('should include plan limits', () => {
      const plan = getPlanConfig('free')
      const priceConfig = planToPriceConfig(plan, {
        monthly: 'price_free_monthly',
      })

      expect(priceConfig.limits.seats).toBe(3)
      expect(priceConfig.limits.apiCallsPerMonth).toBe(1000)
    })
  })
})
