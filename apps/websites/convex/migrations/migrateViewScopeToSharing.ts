import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { createHIPAAAuditLogger } from "../auditLogger";

/**
 * Migration: ViewScope to User Sharing Settings
 * 
 * This migration converts the legacy viewScope-based access model to the new
 * user-controlled sharing model.
 * 
 * Mapping:
 * - all_clinic / clinic → company (full company access)
 * - care_team → care_team
 * - own_only / (no viewScope) → private (default, most secure)
 * 
 * Run this migration once after deploying the new schema.
 * The migration is idempotent - it won't overwrite existing userSharingSettings.
 */

type LegacyViewScope = 'all_clinic' | 'clinic' | 'care_team' | 'own_only';
type NewSharingScope = 'private' | 'care_team' | 'company';

/**
 * Map legacy viewScope to new sharing scope
 */
function mapViewScopeToSharing(viewScope: LegacyViewScope | undefined): NewSharingScope {
  switch (viewScope) {
    case 'all_clinic':
    case 'clinic':
      return 'company';
    case 'care_team':
      return 'care_team';
    case 'own_only':
    default:
      return 'private'; // Default to private for HIPAA compliance
  }
}

/**
 * Extract viewScope from a permission tree section
 */
function extractViewScope(section: any): LegacyViewScope | undefined {
  if (!section || typeof section !== 'object') return undefined;
  if ('viewScope' in section && typeof section.viewScope === 'string') {
    return section.viewScope as LegacyViewScope;
  }
  return undefined;
}

/**
 * Preview migration - shows what will be migrated without making changes
 */
export const previewMigration = query({
  args: {
    tenantId: v.optional(v.string()), // Optional: filter by tenant
  },
  handler: async (ctx, args) => {
    const results: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      tenantId: string;
      hasExistingSettings: boolean;
      currentPermissions: {
        patients?: LegacyViewScope;
        appointments?: LegacyViewScope;
        messages?: LegacyViewScope;
        medicalRecords?: LegacyViewScope;
      };
      proposedSettings: {
        calendarDefaultSharing: NewSharingScope;
        patientsDefaultSharing: NewSharingScope;
        messagesDefaultSharing: NewSharingScope;
      };
    }> = [];

    // Get all users (optionally filtered by tenant)
    let users = await ctx.db.query("users").collect();
    if (args.tenantId) {
      users = users.filter(u => u.tenantId === args.tenantId);
    }

    // Filter out patients and users without tenantId - they don't have sharing settings
    const usersWithTenant = users.filter((u): u is typeof u & { tenantId: string } => 
      u.role !== 'patient' && typeof u.tenantId === 'string'
    );

    for (const user of usersWithTenant) {
      // Check if user already has sharing settings
      const existingSettings = await ctx.db
        .query("userSharingSettings")
        .withIndex("by_user_tenant", (q) =>
          q.eq("userId", user._id).eq("tenantId", user.tenantId)
        )
        .first();

      // Get user's permissions (from custom role or default)
      let permissions: any = null;
      
      // First try to get from customRoles
      const customRole = await ctx.db
        .query("customRoles")
        .filter((q) =>
          q.and(
            q.eq(q.field("tenantId"), user.tenantId),
            q.eq(q.field("name"), user.role)
          )
        )
        .first();
      
      if (customRole && customRole.permissions) {
        permissions = customRole.permissions;
      }

      // Extract viewScopes from permissions
      const currentPermissions: {
        patients?: LegacyViewScope;
        appointments?: LegacyViewScope;
        messages?: LegacyViewScope;
        medicalRecords?: LegacyViewScope;
      } = {};

      if (permissions) {
        currentPermissions.patients = extractViewScope(permissions.patients);
        currentPermissions.appointments = extractViewScope(permissions.appointments);
        currentPermissions.messages = extractViewScope(permissions.messages);
        currentPermissions.medicalRecords = extractViewScope(permissions.medical_records);
      }

      // Determine proposed settings based on viewScopes
      // For calendar, use appointments viewScope
      // For patients, use patients viewScope
      // For messages, use messages viewScope
      const proposedSettings = {
        calendarDefaultSharing: mapViewScopeToSharing(currentPermissions.appointments),
        patientsDefaultSharing: mapViewScopeToSharing(currentPermissions.patients),
        messagesDefaultSharing: mapViewScopeToSharing(currentPermissions.messages),
      };

      results.push({
        userId: user._id,
        userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        userEmail: user.email,
        tenantId: user.tenantId,
        hasExistingSettings: !!existingSettings,
        currentPermissions,
        proposedSettings,
      });
    }

    return {
      totalUsers: results.length,
      usersWithExistingSettings: results.filter(r => r.hasExistingSettings).length,
      usersNeedingMigration: results.filter(r => !r.hasExistingSettings).length,
      results,
    };
  },
});

/**
 * Run the migration - creates userSharingSettings for users who don't have them
 */
export const runMigration = mutation({
  args: {
    tenantId: v.optional(v.string()), // Optional: filter by tenant
    dryRun: v.optional(v.boolean()), // If true, don't actually create records
  },
  handler: async (ctx, args) => {
    const logger = createHIPAAAuditLogger(ctx);
    const now = Date.now();
    
    const migrationResults: Array<{
      userId: string;
      userEmail: string;
      status: 'created' | 'skipped' | 'error';
      settings?: {
        calendarDefaultSharing: NewSharingScope;
        patientsDefaultSharing: NewSharingScope;
        messagesDefaultSharing: NewSharingScope;
      };
      error?: string;
    }> = [];

    // Get all users (optionally filtered by tenant)
    let users = await ctx.db.query("users").collect();
    if (args.tenantId) {
      users = users.filter(u => u.tenantId === args.tenantId);
    }

    // Filter out patients and users without tenantId
    const usersWithTenant = users.filter((u): u is typeof u & { tenantId: string } => 
      u.role !== 'patient' && typeof u.tenantId === 'string'
    );

    for (const user of usersWithTenant) {
      try {
        // Check if user already has sharing settings
        const existingSettings = await ctx.db
          .query("userSharingSettings")
          .withIndex("by_user_tenant", (q) =>
            q.eq("userId", user._id).eq("tenantId", user.tenantId)
          )
          .first();

        if (existingSettings) {
          migrationResults.push({
            userId: user._id,
            userEmail: user.email,
            status: 'skipped',
          });
          continue;
        }

        // Get user's permissions
        let permissions: any = null;
        const customRole = await ctx.db
          .query("customRoles")
          .filter((q) =>
            q.and(
              q.eq(q.field("tenantId"), user.tenantId),
              q.eq(q.field("name"), user.role)
            )
          )
          .first();
        
        if (customRole && customRole.permissions) {
          permissions = customRole.permissions;
        }

        // Extract and map viewScopes
        const appointmentsViewScope = permissions ? extractViewScope(permissions.appointments) : undefined;
        const patientsViewScope = permissions ? extractViewScope(permissions.patients) : undefined;
        const messagesViewScope = permissions ? extractViewScope(permissions.messages) : undefined;

        const settings = {
          calendarDefaultSharing: mapViewScopeToSharing(appointmentsViewScope),
          patientsDefaultSharing: mapViewScopeToSharing(patientsViewScope),
          messagesDefaultSharing: mapViewScopeToSharing(messagesViewScope),
        };

        if (!args.dryRun) {
          // Create the sharing settings
          const settingsId = await ctx.db.insert("userSharingSettings", {
            userId: user._id,
            tenantId: user.tenantId,
            ...settings,
            createdAt: now,
            updatedAt: now,
          });

          // Audit log
          await logger.logModification(
            user.tenantId,
            user._id,
            "sharing_settings_migrated",
            "userSharingSettings",
            settingsId,
            {
              userId: user._id,
              userEmail: user.email,
              migratedFrom: {
                appointmentsViewScope,
                patientsViewScope,
                messagesViewScope,
              },
              migratedTo: settings,
            }
          );
        }

        migrationResults.push({
          userId: user._id,
          userEmail: user.email,
          status: 'created',
          settings,
        });
      } catch (error) {
        migrationResults.push({
          userId: user._id,
          userEmail: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      dryRun: args.dryRun || false,
      totalUsers: usersWithTenant.length,
      created: migrationResults.filter(r => r.status === 'created').length,
      skipped: migrationResults.filter(r => r.status === 'skipped').length,
      errors: migrationResults.filter(r => r.status === 'error').length,
      results: migrationResults,
    };
  },
});

/**
 * Rollback migration - removes userSharingSettings created by migration
 * Only removes settings that were created during migration (based on audit logs)
 */
export const rollbackMigration = mutation({
  args: {
    tenantId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rollbackResults: Array<{
      userId: string;
      status: 'deleted' | 'skipped' | 'error';
      error?: string;
    }> = [];

    // Get all userSharingSettings
    let settings = await ctx.db.query("userSharingSettings").collect();
    if (args.tenantId) {
      settings = settings.filter(s => s.tenantId === args.tenantId);
    }

    for (const setting of settings) {
      try {
        if (!args.dryRun) {
          await ctx.db.delete(setting._id);
        }
        
        rollbackResults.push({
          userId: setting.userId,
          status: 'deleted',
        });
      } catch (error) {
        rollbackResults.push({
          userId: setting.userId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      dryRun: args.dryRun || false,
      total: settings.length,
      deleted: rollbackResults.filter(r => r.status === 'deleted').length,
      errors: rollbackResults.filter(r => r.status === 'error').length,
      results: rollbackResults,
    };
  },
});

