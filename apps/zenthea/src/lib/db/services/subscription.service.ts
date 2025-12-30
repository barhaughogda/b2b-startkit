import { eq, sql, and, count, not } from 'drizzle-orm';
import { db } from '@startkit/database';
import { subscriptions, users } from '@startkit/database/schema';
import { patients } from '../schema';
import { productConfig } from '@/config/product.config';
import type { PlanTier } from '@startkit/config';

/**
 * Subscription Service for Zenthea
 *
 * Manages subscription state and usage tracking for HIPAA compliance
 * and monetization triggers.
 */
export class SubscriptionService {
  /**
   * Get the current subscription for an organization
   */
  static async getSubscription(organizationId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    return sub || null;
  }

  /**
   * Get current usage metrics for an organization
   */
  static async getUsageStatus(organizationId: string) {
    const sub = await this.getSubscription(organizationId);
    const planTier = (sub?.plan as PlanTier) || 'free';
    const planConfig = productConfig.plans[planTier];

    // 1. Count active providers (non-patient users)
    const [providerCountResult] = await db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.tenantId, organizationId),
          not(eq(users.role, 'patient'))
        )
      );
    const activeProviders = Number(providerCountResult.value);

    // 2. Count active patients
    const [patientCountResult] = await db
      .select({ value: count() })
      .from(patients)
      .where(eq(patients.tenantId, organizationId));
    const activePatients = Number(patientCountResult.value);

    // 3. Check against limits
    const providerLimit = planConfig.limits.seats || Infinity;
    const patientLimit = planConfig.limits.patients || Infinity;

    const needsUpgrade = 
      activeProviders >= providerLimit || 
      activePatients >= patientLimit;

    return {
      plan: planTier,
      activeProviders,
      providerLimit,
      activePatients,
      patientLimit,
      needsUpgrade,
      isNearLimit: 
        (activeProviders >= providerLimit * 0.8) || 
        (activePatients >= patientLimit * 0.8),
    };
  }

  /**
   * Check if a feature is enabled for the current plan
   */
  static async isFeatureEnabled(organizationId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getSubscription(organizationId);
    const planTier = (sub?.plan as PlanTier) || 'free';
    const planConfig = productConfig.plans[planTier];

    return planConfig.features.includes(featureKey);
  }
}
