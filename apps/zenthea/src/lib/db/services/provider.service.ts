import { eq, and } from 'drizzle-orm'
import { db } from '@startkit/database'
import { providerProfiles, providers } from '../schema'
import { AuditService } from './audit.service'

/**
 * Provider Service
 * 
 * Handles all database operations for Provider Profiles and Provider metadata using Drizzle ORM.
 * All operations are tenant-isolated via organization_id.
 */
export class ProviderService {
  /**
   * Get provider profile by user ID
   */
  static async getProviderProfileByUserId(userId: string, organizationId: string) {
    const [profile] = await db.select()
      .from(providerProfiles)
      .where(
        and(
          eq(providerProfiles.userId, userId),
          eq(providerProfiles.organizationId, organizationId)
        )
      )
      .limit(1)
    
    return profile || null
  }

  /**
   * Create or update provider profile
   */
  static async upsertProviderProfile(userId: string, organizationId: string, data: any) {
    const existing = await this.getProviderProfileByUserId(userId, organizationId)

    if (existing) {
      const [updated] = await db.update(providerProfiles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providerProfiles.userId, userId),
            eq(providerProfiles.organizationId, organizationId)
          )
        )
        .returning()
      
      await AuditService.log({
        organizationId,
        userId,
        action: 'update',
        resource: 'provider_profile',
        resourceId: updated.id,
        details: { updates: data },
      })

      return updated
    } else {
      const [created] = await db.insert(providerProfiles)
        .values({
          ...data,
          userId,
          organizationId,
        })
        .returning()
      
      await AuditService.log({
        organizationId,
        userId,
        action: 'create',
        resource: 'provider_profile',
        resourceId: created.id,
        details: { profileData: data },
      })

      return created
    }
  }

  /**
   * Get core provider info (specialty, license, etc)
   */
  static async getProviderInfoByUserId(userId: string, organizationId: string) {
    const [info] = await db.select()
      .from(providers)
      .where(
        and(
          eq(providers.userId, userId),
          eq(providers.organizationId, organizationId)
        )
      )
      .limit(1)
    
    return info || null
  }

  /**
   * Upsert core provider info
   */
  static async upsertProviderInfo(userId: string, organizationId: string, data: any) {
    const existing = await this.getProviderInfoByUserId(userId, organizationId)

    if (existing) {
      const [updated] = await db.update(providers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providers.userId, userId),
            eq(providers.organizationId, organizationId)
          )
        )
        .returning()
      
      return updated
    } else {
      const [created] = await db.insert(providers)
        .values({
          ...data,
          userId,
          organizationId,
        })
        .returning()
      
      return created
    }
  }
}
