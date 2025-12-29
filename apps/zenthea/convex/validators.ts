import { v } from "convex/values";

/**
 * Shared validators for Convex schema and mutations
 * 
 * This file contains reusable validators to ensure consistency across the codebase.
 * Import validators from here instead of duplicating definitions.
 */

/**
 * Reusable validator for PermissionTree structure
 * Used in:
 * - customRoles.permissions (convex/schema.ts)
 * - auditLogs.permissionChanges (convex/schema.ts)
 * - auditLogs.create mutation args (convex/auditLogs.ts)
 * 
 * Ensures type safety and consistency across the application
 */
export const permissionTreeValidator = v.object({
  // Hierarchical permission structure: sections > features > components > cards > tabs
  // Each section contains features, each feature contains components, etc.
  patients: v.optional(v.object({
    enabled: v.boolean(), // Whether this section is accessible
    viewScope: v.optional(v.union(
      v.literal("all_clinic"), // Can view all patients in clinic
      v.literal("department"), // Can view patients in user's departments
      v.literal("care_team"), // Can view patients in user's care teams
      v.literal("own_only") // Can only view own patients
    )),
    features: v.optional(v.object({
      list: v.optional(v.object({
        enabled: v.boolean(),
        components: v.optional(v.object({
          patientCard: v.optional(v.object({
            enabled: v.boolean(),
            tabs: v.optional(v.object({
              overview: v.optional(v.boolean()),
              timeline: v.optional(v.boolean()),
              medications: v.optional(v.boolean()),
              documents: v.optional(v.boolean()),
              billing: v.optional(v.boolean()),
            })),
          })),
          search: v.optional(v.boolean()),
          filters: v.optional(v.boolean()),
        })),
      })),
      create: v.optional(v.boolean()),
      edit: v.optional(v.boolean()),
      delete: v.optional(v.boolean()),
      view: v.optional(v.boolean()),
    })),
  })),
  appointments: v.optional(v.object({
    enabled: v.boolean(),
    viewScope: v.optional(v.union(
      v.literal("all_clinic"),
      v.literal("department"),
      v.literal("care_team"),
      v.literal("own_only")
    )),
    features: v.optional(v.object({
      calendar: v.optional(v.boolean()),
      schedule: v.optional(v.boolean()),
      create: v.optional(v.boolean()),
      edit: v.optional(v.boolean()),
      cancel: v.optional(v.boolean()),
      view: v.optional(v.boolean()),
    })),
  })),
  messages: v.optional(v.object({
    enabled: v.boolean(),
    viewScope: v.optional(v.union(
      v.literal("all_clinic"),
      v.literal("department"),
      v.literal("care_team"),
      v.literal("own_only")
    )),
    features: v.optional(v.object({
      send: v.optional(v.boolean()),
      receive: v.optional(v.boolean()),
      view: v.optional(v.boolean()),
      delete: v.optional(v.boolean()),
    })),
  })),
  medical_records: v.optional(v.object({
    enabled: v.boolean(),
    viewScope: v.optional(v.union(
      v.literal("all_clinic"),
      v.literal("department"),
      v.literal("care_team"),
      v.literal("own_only")
    )),
    features: v.optional(v.object({
      encounters: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
        sign: v.optional(v.boolean()),
      })),
      notes: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      vitals: v.optional(v.boolean()),
      lab_results: v.optional(v.boolean()),
      medications: v.optional(v.boolean()),
      allergies: v.optional(v.boolean()),
    })),
  })),
  billing: v.optional(v.object({
    enabled: v.boolean(),
    viewScope: v.optional(v.union(
      v.literal("all_clinic"),
      v.literal("department"),
      v.literal("care_team"),
      v.literal("own_only")
    )),
    features: v.optional(v.object({
      claims: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        submit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      payments: v.optional(v.object({
        enabled: v.boolean(),
        process: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
        refund: v.optional(v.boolean()),
      })),
      invoices: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      reports: v.optional(v.boolean()),
    })),
  })),
  settings: v.optional(v.object({
    enabled: v.boolean(),
    features: v.optional(v.object({
      users: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        delete: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
        invite: v.optional(v.boolean()),
      })),
      roles: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        delete: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      departments: v.optional(v.object({
        enabled: v.boolean(),
        create: v.optional(v.boolean()),
        edit: v.optional(v.boolean()),
        delete: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      practice: v.optional(v.object({
        enabled: v.boolean(),
        edit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      branding: v.optional(v.object({
        enabled: v.boolean(),
        edit: v.optional(v.boolean()),
        view: v.optional(v.boolean()),
      })),
      security: v.optional(v.object({
        enabled: v.boolean(),
        mfa: v.optional(v.boolean()),
        password_policy: v.optional(v.boolean()),
        session_management: v.optional(v.boolean()),
      })),
    })),
  })),
  reports: v.optional(v.object({
    enabled: v.boolean(),
    viewScope: v.optional(v.union(
      v.literal("all_clinic"),
      v.literal("department"),
      v.literal("care_team"),
      v.literal("own_only")
    )),
    features: v.optional(v.object({
      clinical: v.optional(v.boolean()),
      financial: v.optional(v.boolean()),
      custom: v.optional(v.boolean()),
      export: v.optional(v.boolean()),
    })),
  })),
  ai_assistant: v.optional(v.object({
    enabled: v.boolean(),
    features: v.optional(v.object({
      voice_commands: v.optional(v.boolean()),
      chat: v.optional(v.boolean()),
      automation: v.optional(v.boolean()),
    })),
  })),
});

































