/**
 * Permission Validation Utilities
 * 
 * Provides validation functions for the hierarchical permission structure.
 * Used to validate permission trees when creating or updating custom roles.
 * 
 * NOTE: viewScope has been removed from the permission system.
 * Data visibility is now controlled by user sharing settings (userSharingSettings table).
 * Roles now only control feature access (can you use this feature?).
 * ViewScope constants are kept for backward compatibility during migration.
 */

import type { PermissionTree, ViewScope, SharingScope } from '@/types'

/**
 * Valid view scope values
 * @deprecated viewScope is no longer used in roles. Use SharingScope with userSharingSettings instead.
 */
export const VALID_VIEW_SCOPES: ViewScope[] = [
  'all_clinic',
  'clinic',
  'department',
  'care_team',
  'own_only'
]

/**
 * Valid sharing scope values for user sharing settings
 */
export const VALID_SHARING_SCOPES: SharingScope[] = [
  'private',
  'care_team',
  'company'
]

/**
 * Valid section names
 */
export const VALID_SECTIONS = [
  'patients',
  'appointments',
  'messages',
  'medical_records',
  'billing',
  'settings',
  'reports',
  'ai_assistant'
] as const

export type ValidSection = typeof VALID_SECTIONS[number]

/**
 * @deprecated viewScope is no longer required. Kept for backward compatibility during migration.
 */
export const SECTIONS_WITH_VIEW_SCOPE: ValidSection[] = [
  'patients',
  'appointments',
  'messages',
  'medical_records',
  'billing',
  'reports'
]

/**
 * @deprecated viewScope is no longer used. Kept for backward compatibility during migration.
 */
export const SECTIONS_WITHOUT_VIEW_SCOPE: ValidSection[] = [
  'settings',
  'ai_assistant'
]

/**
 * Validation result interface
 */
export interface PermissionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate a view scope value
 * @deprecated viewScope is no longer used in roles. Kept for migration compatibility.
 */
export function validateViewScope(scope: unknown): scope is ViewScope {
  return typeof scope === 'string' && VALID_VIEW_SCOPES.includes(scope as ViewScope)
}

/**
 * Validate a sharing scope value
 */
export function validateSharingScope(scope: unknown): scope is SharingScope {
  return typeof scope === 'string' && VALID_SHARING_SCOPES.includes(scope as SharingScope)
}

/**
 * Validate that a section name is valid
 */
export function validateSectionName(section: string): section is ValidSection {
  return VALID_SECTIONS.includes(section as ValidSection)
}

/**
 * Validate that a section has the correct structure.
 * Note: viewScope is no longer required - data visibility is controlled by user sharing settings.
 * The function accepts viewScope for backward compatibility during migration.
 */
export function validateSectionStructure(
  sectionName: string,
  section: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!section || typeof section !== 'object') {
    errors.push(`Section ${sectionName} must be an object`)
    return { isValid: false, errors }
  }

  if (!('enabled' in section) || typeof section.enabled !== 'boolean') {
    errors.push(`Section ${sectionName} must have an 'enabled' boolean field`)
  }

  // viewScope is now optional (deprecated) - only validate format if present
  if (section.viewScope && !validateViewScope(section.viewScope)) {
    errors.push(
      `Section ${sectionName} has invalid viewScope. Must be one of: ${VALID_VIEW_SCOPES.join(', ')}`
    )
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate a complete permission tree
 */
export function validatePermissionTree(permissions: unknown): PermissionValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!permissions || typeof permissions !== 'object') {
    return {
      isValid: false,
      errors: ['Permissions must be an object'],
      warnings: []
    }
  }

  const permissionObj = permissions as Record<string, any>

  // Validate each section
  for (const [sectionName, section] of Object.entries(permissionObj)) {
    if (!validateSectionName(sectionName)) {
      warnings.push(`Unknown section: ${sectionName}. It will be ignored.`)
      continue
    }

    const sectionValidation = validateSectionStructure(sectionName, section)
    if (!sectionValidation.isValid) {
      errors.push(...sectionValidation.errors)
    }
  }

  // Warn if no sections are enabled
  const hasEnabledSection = Object.values(permissionObj).some(
    (section: any) => section && typeof section === 'object' && section.enabled === true
  )
  if (!hasEnabledSection) {
    warnings.push('No sections are enabled. This role will have no access.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate that a permission tree matches the expected structure
 * This is a stricter validation that checks for required fields
 */
export function validatePermissionTreeStructure(
  permissions: PermissionTree
): PermissionValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate each section if present
  if (permissions.patients) {
    const result = validateSectionStructure('patients', permissions.patients)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.appointments) {
    const result = validateSectionStructure('appointments', permissions.appointments)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.messages) {
    const result = validateSectionStructure('messages', permissions.messages)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.medical_records) {
    const result = validateSectionStructure('medical_records', permissions.medical_records)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.billing) {
    const result = validateSectionStructure('billing', permissions.billing)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.settings) {
    const result = validateSectionStructure('settings', permissions.settings)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.reports) {
    const result = validateSectionStructure('reports', permissions.reports)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  if (permissions.ai_assistant) {
    const result = validateSectionStructure('ai_assistant', permissions.ai_assistant)
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate PermissionChangeInfo and return validated version
 * This ensures type safety when reading permission changes from audit logs
 * 
 * @param changeInfo - PermissionChangeInfo from audit log (may have invalid permission structures)
 * @returns ValidatedPermissionChangeInfo with validated PermissionTree structures, or null if validation fails
 */
export function validatePermissionChangeInfo(
  changeInfo: {
    userId: string
    oldPermissions: unknown
    newPermissions: unknown
    changedBy: string
  }
): {
  isValid: boolean
  validated?: import('@/types').ValidatedPermissionChangeInfo
  errors: {
    oldPermissions?: string[]
    newPermissions?: string[]
  }
} {
  const oldValidation = validatePermissionTree(changeInfo.oldPermissions)
  const newValidation = validatePermissionTree(changeInfo.newPermissions)
  
  const errors: { oldPermissions?: string[]; newPermissions?: string[] } = {}
  if (!oldValidation.isValid) {
    errors.oldPermissions = oldValidation.errors
  }
  if (!newValidation.isValid) {
    errors.newPermissions = newValidation.errors
  }
  
  const isValid = oldValidation.isValid && newValidation.isValid
  
  if (isValid) {
    return {
      isValid: true,
      validated: {
        userId: changeInfo.userId,
        oldPermissions: changeInfo.oldPermissions as PermissionTree,
        newPermissions: changeInfo.newPermissions as PermissionTree,
        changedBy: changeInfo.changedBy,
      },
      errors: {}
    }
  }
  
  return {
    isValid: false,
    errors
  }
}

/**
 * Get default permission tree (all disabled)
 * Useful for creating new roles.
 * Note: viewScope is no longer included - data visibility is controlled by user sharing settings.
 */
export function getDefaultPermissionTree(): PermissionTree {
  return {
    patients: {
      enabled: false
    },
    appointments: {
      enabled: false
    },
    messages: {
      enabled: false
    },
    medical_records: {
      enabled: false
    },
    billing: {
      enabled: false
    },
    settings: {
      enabled: false
    },
    reports: {
      enabled: false
    },
    ai_assistant: {
      enabled: false
    }
  }
}

/**
 * Get full-access permission tree (all enabled)
 * Useful for creating owner/admin roles.
 * Note: viewScope is no longer included - data visibility is controlled by user sharing settings.
 */
export function getFullAccessPermissionTree(): PermissionTree {
  return {
    patients: {
      enabled: true,
      features: {
        list: { enabled: true },
        create: true,
        edit: true,
        delete: true,
        view: true
      }
    },
    appointments: {
      enabled: true,
      features: {
        calendar: true,
        schedule: true,
        create: true,
        edit: true,
        cancel: true,
        view: true
      }
    },
    messages: {
      enabled: true,
      features: {
        send: true,
        receive: true,
        view: true,
        delete: true
      }
    },
    medical_records: {
      enabled: true,
      features: {
        encounters: {
          enabled: true,
          create: true,
          edit: true,
          view: true,
          sign: true
        },
        notes: {
          enabled: true,
          create: true,
          edit: true,
          view: true
        },
        vitals: true,
        lab_results: true,
        medications: true,
        allergies: true
      }
    },
    billing: {
      enabled: true,
      features: {
        claims: {
          enabled: true,
          create: true,
          edit: true,
          submit: true,
          view: true
        },
        payments: {
          enabled: true,
          process: true,
          view: true,
          refund: true
        },
        invoices: {
          enabled: true,
          create: true,
          edit: true,
          view: true
        },
        reports: true
      }
    },
    settings: {
      enabled: true,
      features: {
        users: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true,
          invite: true
        },
        roles: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true
        },
        clinics: {
          enabled: true,
          create: true,
          edit: true,
          delete: true,
          view: true
        },
        practice: {
          enabled: true,
          edit: true,
          view: true
        },
        branding: {
          enabled: true,
          edit: true,
          view: true
        },
        security: {
          enabled: true,
          mfa: true,
          password_policy: true,
          session_management: true
        }
      }
    },
    reports: {
      enabled: true,
      features: {
        clinical: true,
        financial: true,
        custom: true,
        export: true
      }
    },
    ai_assistant: {
      enabled: true,
      features: {
        voice_commands: true,
        chat: true,
        automation: true
      }
    }
  }
}

/**
 * Get provider-level permission tree
 * Useful for creating provider roles during migration
 * 
 * Note: viewScope is no longer included - data visibility is controlled by user sharing settings.
 * 
 * Provider permissions include:
 * - Patient Records: RW (data visibility via user sharing settings)
 * - Clinical Documentation: RW
 * - Scheduling: RW
 * - Messaging: RW
 * - Billing & RCM: R (read-only)
 * - Analytics & Reporting: R (read-only)
 * - NO User Management
 * - NO Practice Settings
 */
export function getProviderPermissionTree(): PermissionTree {
  return {
    patients: {
      enabled: true,
      features: {
        list: { enabled: true },
        create: true,
        edit: true,
        delete: false, // Providers typically don't delete patients
        view: true
      }
    },
    appointments: {
      enabled: true,
      features: {
        calendar: true,
        schedule: true, // Can schedule appointments
        create: true,
        edit: true,
        cancel: true,
        view: true
      }
    },
    messages: {
      enabled: true,
      features: {
        send: true,
        receive: true,
        view: true,
        delete: true
      }
    },
    medical_records: {
      enabled: true,
      features: {
        encounters: {
          enabled: true,
          create: true,
          edit: true,
          view: true,
          sign: true
        },
        notes: {
          enabled: true,
          create: true,
          edit: true,
          view: true
        },
        vitals: true,
        lab_results: true,
        medications: true,
        allergies: true
      }
    },
    billing: {
      enabled: true,
      features: {
        claims: {
          enabled: true,
          create: false, // Read-only
          edit: false,
          submit: false,
          view: true
        },
        payments: {
          enabled: true,
          process: false, // Read-only
          view: true,
          refund: false
        },
        invoices: {
          enabled: true,
          create: false, // Read-only
          edit: false,
          view: true
        },
        reports: true // Can view billing reports
      }
    },
    settings: {
      enabled: false // Providers don't have access to settings
    },
    reports: {
      enabled: true,
      features: {
        clinical: true,
        financial: true,
        custom: true,
        export: true
      }
    },
    ai_assistant: {
      enabled: true,
      features: {
        voice_commands: true,
        chat: true,
        automation: true
      }
    }
  }
}

