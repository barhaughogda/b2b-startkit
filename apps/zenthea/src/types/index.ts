// Global type definitions for Zenthea

export interface MfaSettings {
  enabled: boolean // Whether MFA is enabled for this user
  method?: 'totp' | 'sms' // MFA method: TOTP (Time-based One-Time Password) or SMS
  secret?: string // Encrypted TOTP secret (encrypted at rest using AES-256-GCM)
  backupCodes?: string[] // Array of hashed backup codes (one-way hashed using bcrypt)
  setupCompletedAt?: Date // Timestamp when MFA setup was completed
  lastVerifiedAt?: Date // Timestamp of last successful MFA verification
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'provider' | 'clinic_user' | 'demo' | 'super_admin' // clinic_user replaces admin/provider in Phase 4 migration
  isActive: boolean
  isOwner?: boolean // Clinic ownership flag - defaults to false for existing users
  clinics?: string[] // Array of clinic IDs - defaults to empty array for existing users
  departments?: string[] // Array of department IDs - defaults to empty array for existing users
  customRoleId?: string // Reference to custom role ID - optional, undefined if user has no custom role assigned
  mfaSettings?: MfaSettings // Multi-factor authentication settings
  lastPasswordChange?: number // Timestamp of last password change for password rotation tracking
  lastLogin?: Date
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | Date // Support both string and Date for compatibility
  email?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
  } | string // Support both object and string formats
  insurance?: {
    provider: string
    policyNumber: string
    groupNumber?: string
  }
  conditions?: string[] // Healthcare-specific field
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  } | string // Support both object and string formats
  tenantId: string
  createdAt: Date
  updatedAt: Date
  // Additional fields for patient list functionality
  status?: 'active' | 'inactive' | 'discharged'
  clinic?: string
  lastVisit?: Date
  medicalHistory?: string[]
  allergies?: string[]
  currentMedications?: string[]
  insuranceProvider?: string
  insuranceNumber?: string
  preferredLanguage?: string
}

export interface Provider {
  id: string
  firstName: string
  lastName: string
  email: string
  specialty: string
  location: string
  availability: 'Available' | 'Busy' | 'Unavailable'
  rating: number
  experience: number
  languages: string[]
  insurance: string[]
  phone?: string
  bio?: string
  education?: string
  certifications?: string[]
  hospitalAffiliations?: string[]
  licenseNumber?: string
  npi?: string
  createdAt: Date
  updatedAt: Date
}

// Permission System Types

/**
 * View scope determines what data a user can access within a section
 * @deprecated Use userSharingSettings instead. This type is kept for migration purposes only.
 * Data visibility is now controlled by user sharing settings, not role permissions.
 */
export type ViewScope = 'all_clinic' | 'clinic' | 'department' | 'care_team' | 'own_only'

/**
 * Sharing scope options for user-controlled sharing settings.
 * Replaces ViewScope in the new access control model.
 */
export type SharingScope = 'private' | 'care_team' | 'company'

/**
 * Base permission structure for hierarchical permissions.
 * Note: viewScope has been removed - data visibility is now controlled
 * by user sharing settings (userSharingSettings table), not role permissions.
 * Roles now only control feature access (can you use this feature?).
 */
export interface BasePermission {
  enabled: boolean
}

/**
 * Patient card tabs permission structure
 */
export interface PatientCardTabs {
  overview?: boolean
  timeline?: boolean
  medications?: boolean
  documents?: boolean
  billing?: boolean
}

/**
 * Patient card component permissions
 */
export interface PatientCardComponent {
  enabled: boolean
  tabs?: PatientCardTabs
}

/**
 * Component-level permissions
 */
export interface ComponentPermissions {
  patientCard?: PatientCardComponent
  search?: boolean
  filters?: boolean
}

/**
 * Feature-level permissions for patients section
 */
export interface PatientsFeatures {
  list?: {
    enabled: boolean
    components?: ComponentPermissions
  }
  create?: boolean
  edit?: boolean
  delete?: boolean
  view?: boolean
}

/**
 * Patients section permissions
 */
export interface PatientsPermissions extends BasePermission {
  features?: PatientsFeatures
}

/**
 * Appointments section permissions
 */
export interface AppointmentsPermissions extends BasePermission {
  features?: {
    calendar?: boolean
    schedule?: boolean
    create?: boolean
    edit?: boolean
    cancel?: boolean
    view?: boolean
  }
}

/**
 * Messages section permissions
 */
export interface MessagesPermissions extends BasePermission {
  features?: {
    send?: boolean
    receive?: boolean
    view?: boolean
    delete?: boolean
  }
}

/**
 * Medical records section permissions
 */
export interface MedicalRecordsPermissions extends BasePermission {
  features?: {
    encounters?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      view?: boolean
      sign?: boolean
    }
    notes?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      view?: boolean
    }
    vitals?: boolean
    lab_results?: boolean
    medications?: boolean
    allergies?: boolean
  }
}

/**
 * Billing section permissions
 */
export interface BillingPermissions extends BasePermission {
  features?: {
    claims?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      submit?: boolean
      view?: boolean
    }
    payments?: {
      enabled: boolean
      process?: boolean
      view?: boolean
      refund?: boolean
    }
    invoices?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      view?: boolean
    }
    reports?: boolean
  }
}

/**
 * Settings section permissions (admin only features)
 */
export interface SettingsPermissions {
  enabled: boolean
  features?: {
    users?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      delete?: boolean
      view?: boolean
      invite?: boolean
    }
    roles?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      delete?: boolean
      view?: boolean
    }
    clinics?: {
      enabled: boolean
      create?: boolean
      edit?: boolean
      delete?: boolean
      view?: boolean
    }
    practice?: {
      enabled: boolean
      edit?: boolean
      view?: boolean
    }
    branding?: {
      enabled: boolean
      edit?: boolean
      view?: boolean
    }
    security?: {
      enabled: boolean
      mfa?: boolean
      password_policy?: boolean
      session_management?: boolean
    }
  }
}

/**
 * Reports section permissions
 */
export interface ReportsPermissions extends BasePermission {
  features?: {
    clinical?: boolean
    financial?: boolean
    custom?: boolean
    export?: boolean
  }
}

/**
 * AI Assistant section permissions
 */
export interface AIAssistantPermissions {
  enabled: boolean
  features?: {
    voice_commands?: boolean
    chat?: boolean
    automation?: boolean
  }
}

/**
 * Complete hierarchical permission structure
 */
export interface PermissionTree {
  patients?: PatientsPermissions
  appointments?: AppointmentsPermissions
  messages?: MessagesPermissions
  medical_records?: MedicalRecordsPermissions
  billing?: BillingPermissions
  settings?: SettingsPermissions
  reports?: ReportsPermissions
  ai_assistant?: AIAssistantPermissions
}

export interface CustomRole {
  _id: string // Convex document ID
  tenantId: string // Required for tenant isolation
  name: string // Role name (e.g., "Nurse", "Receptionist", "Billing Specialist")
  description?: string // Optional description of the role
  permissions: PermissionTree // Hierarchical permission structure
  isTemplate: boolean // Whether this role is a template that can be reused
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
}

export interface Clinic {
  _id: string // Convex document ID
  tenantId: string // Required for tenant isolation
  name: string // Clinic name (e.g., "Cardiology", "Pediatrics", "General Practice")
  description?: string // Optional description of the clinic
  address?: string // Optional address information (single field with Google Maps lookup)
  isActive: boolean // Whether the clinic is active
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
}

// Support Access Request Types

/**
 * Status of a support access request
 */
export type SupportAccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired'

/**
 * Actions that can be logged in the audit trail
 */
export type SupportAccessAuditAction = 'requested' | 'approved' | 'denied' | 'accessed' | 'expired' | 'revoked'

/**
 * Digital signature information for support access approval
 */
export interface DigitalSignature {
  signatureData: string // Base64 encoded signature image/data
  signedAt: number // Timestamp when signature was provided
  ipAddress?: string // IP address at time of signature
  userAgent?: string // User agent at time of signature
  consentText: string // The consent text that was agreed to
}

/**
 * Audit trail entry for support access requests
 */
export interface SupportAccessAuditEntry {
  action: SupportAccessAuditAction // Type of action performed
  timestamp: number // When the action occurred
  userId: string // User ID who performed the action
  details?: any // Additional details about the action
  ipAddress?: string // IP address at time of action
  userAgent?: string // User agent at time of action
}

/**
 * Support access request for superadmin to access user/tenant data
 */
export interface SupportAccessRequest {
  _id: string // Convex document ID
  superadminId: string // Superadmin requesting access
  targetUserId?: string // User account to access (optional - can be tenant-level access)
  targetTenantId: string // Tenant to access
  purpose: string // Reason for access request
  status: SupportAccessRequestStatus // Current status of the request
  digitalSignature?: DigitalSignature // Digital signature if approved
  expirationTimestamp?: number // Timestamp when access expires (1 hour after approval)
  approvedBy?: string // User ID who approved the request
  deniedBy?: string // User ID who denied the request
  deniedReason?: string // Reason for denial if denied
  auditTrail: SupportAccessAuditEntry[] // Array of audit trail entries
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
}

/**
 * PHI access tracking information for HIPAA compliance
 */
export interface PHIAccessInfo {
  patientId: string // Patient whose PHI was accessed
  dataElements: string[] // Specific PHI elements accessed (e.g., ["name", "dateOfBirth", "medicalHistory", "labResults"])
  purpose: string // Purpose for accessing PHI (e.g., "treatment", "payment", "healthcare_operations", "patient_request", "legal_requirement")
}

/**
 * Permission change tracking information
 * Tracks changes to user permissions for audit and compliance purposes
 * 
 * IMPORTANT: oldPermissions and newPermissions are validated at write time by Convex schema
 * (using permissionTreeValidator), ensuring they match PermissionTree structure. However,
 * when reading from audit logs, you should use validatePermissionChangeInfo() to ensure
 * runtime type safety, especially if reading legacy data or handling potential corruption.
 * 
 * @see validatePermissionChangeInfo in src/lib/permissions/validation.ts
 */
export interface PermissionChangeInfo {
  userId: string // User whose permissions were changed
  oldPermissions: PermissionTree // Previous permission structure before the change (validated by schema at write time)
  newPermissions: PermissionTree // New permission structure after the change (validated by schema at write time)
  changedBy: string // User ID who made the permission change
}

/**
 * Validated permission change information with runtime validation
 * Use this type after validating PermissionChangeInfo with validatePermissionChangeInfo()
 * when reading from audit logs to ensure runtime type safety.
 */
export interface ValidatedPermissionChangeInfo {
  userId: string
  oldPermissions: PermissionTree
  newPermissions: PermissionTree
  changedBy: string
  validationErrors?: {
    oldPermissions?: string[]
    newPermissions?: string[]
  }
}

/**
 * Audit log entry for tracking system actions and PHI access
 */
export interface AuditLog {
  _id: string // Convex document ID
  tenantId: string // Tenant ID for multi-tenancy
  userId?: string // User ID who performed the action (optional for system actions)
  action: string // Action performed (e.g., "view_patient", "update_record", "export_data")
  resource: string // Resource type (e.g., "patient", "medicalRecord", "appointment")
  resourceId: string // ID of the resource accessed
  details?: any // Additional details about the action
  ipAddress?: string // IP address from which the action was performed
  userAgent?: string // User agent string
  timestamp: number // Unix timestamp when the action occurred
  phiAccessed?: PHIAccessInfo // PHI access tracking information (only present when PHI was accessed)
  permissionChanges?: PermissionChangeInfo // Permission change tracking information (only present when permissions were changed)
}

// Provider Profile Types
export type ProfileVisibility = 'public' | 'portal' | 'private'

export interface ProfileVisibilitySettings {
  // Identity fields
  npi: ProfileVisibility
  licenseNumber: ProfileVisibility
  specialties: ProfileVisibility
  
  // Credentials
  boardCertifications: ProfileVisibility
  education: ProfileVisibility
  certifications: ProfileVisibility
  
  // Personal content
  bio: ProfileVisibility
  detailedBio: ProfileVisibility
  philosophyOfCare: ProfileVisibility
  communicationStyle: ProfileVisibility
  whyIBecameADoctor: ProfileVisibility
  languages: ProfileVisibility
  
  // Humanizing elements
  personalInterests: ProfileVisibility
  communityInvolvement: ProfileVisibility
  
  // Multimedia
  professionalPhoto: ProfileVisibility
  introductionVideo: ProfileVisibility
  
  // Practice details
  hospitalAffiliations: ProfileVisibility
  insuranceAccepted: ProfileVisibility
  conditionsTreated: ProfileVisibility
  proceduresPerformed: ProfileVisibility
  researchInterests: ProfileVisibility
  publications: ProfileVisibility
  
  // Testimonials
  testimonials: ProfileVisibility
}

export interface ProviderCredential {
  board?: {
    board: string
    specialty: string
    certificationNumber?: string
    issueDate?: string
    expirationDate?: string
    verified: boolean
    digitalBadgeUrl?: string
  }
  education?: {
    degree: string
    institution: string
    field?: string
    graduationYear?: number
    verified: boolean
  }
  certification?: {
    name: string
    issuingOrganization: string
    issueDate?: string
    expirationDate?: string
    credentialId?: string
    verified: boolean
  }
}

export interface BoardCertification {
  board: string
  specialty: string
  certificationNumber?: string
  issueDate?: string
  expirationDate?: string
  verified: boolean
  digitalBadgeUrl?: string
}

export interface Education {
  degree: string
  institution: string
  field?: string
  graduationYear?: number
  verified: boolean
}

export interface Certification {
  name: string
  issuingOrganization: string
  issueDate?: string
  expirationDate?: string
  credentialId?: string
  verified: boolean
}

export interface HospitalAffiliation {
  name: string
  role?: string
  clinic?: string
  startDate?: string
  endDate?: string
  current: boolean
}

export interface Publication {
  title: string
  journal?: string
  year?: number
  url?: string
}

export interface PatientTestimonial {
  id: string
  providerProfileId: string
  tenantId: string
  patientId?: string
  patientFirstName: string
  patientLastNameInitial?: string
  rating: number // 1-5 stars
  comment: string
  consentGiven: boolean
  isVerified: boolean
  isApproved: boolean
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProviderProfile {
  _id: string
  userId: string
  providerId?: string
  tenantId: string
  
  // Identity & Credentials
  title?: 'Dr.' | 'Mr.' | 'Ms.' | 'Mrs.' | 'Prof.'
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
  npi?: string
  licenseNumber?: string
  licenseState?: string
  specialties: string[]
  boardCertifications?: BoardCertification[]
  education?: Education[]
  certifications?: Certification[]
  
  // Personal Content
  bio?: string
  detailedBio?: string
  philosophyOfCare?: string
  communicationStyle?: string
  whyIBecameADoctor?: string
  languages: string[]
  
  // Humanizing Elements
  personalInterests?: string[]
  communityInvolvement?: string
  volunteerWork?: string
  
  // Multimedia Assets
  professionalPhotoUrl?: string
  professionalPhotoAltText?: string
  introductionVideoUrl?: string
  introductionVideoThumbnail?: string
  introductionVideoTranscript?: string
  introductionVideoCaptions?: string
  
  // Practice Details
  hospitalAffiliations?: HospitalAffiliation[]
  insuranceAccepted?: string[]
  conditionsTreated?: string[]
  proceduresPerformed?: string[]
  clinicalInterests?: string[]
  researchInterests?: string[]
  publications?: Publication[]
  
  // Patient Testimonials
  testimonials?: string[] // Array of testimonial IDs
  
  // Visibility Controls
  visibility: ProfileVisibilitySettings
  
  // Metadata
  completionPercentage: number
  isVerified: boolean
  isPublished: boolean
  lastReviewedAt?: number
  createdAt: number
  updatedAt: number
}

export interface ProfileSection {
  id: string
  title: string
  description?: string
  fields: string[]
  isRequired: boolean
  isComplete: boolean
}

export interface Appointment {
  id: string
  patientId: string
  providerId: string
  scheduledAt: Date
  duration: number // in minutes
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency'
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface MedicalRecord {
  id: string
  patientId: string
  providerId: string
  appointmentId?: string
  diagnosis: string
  treatment: string
  medications?: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// NextAuth type extensions
// Import types to ensure module is available for augmentation
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    tenantId?: string;
    isOwner?: boolean;
    clinics?: string[];
    permissions?: PermissionTree;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId?: string;
      image?: string;
      isOwner?: boolean;
      clinics?: string[];
      permissions?: PermissionTree;
      originalRole?: string; // Original role (admin/provider) for backward compatibility
    };
  }
}

import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    tenantId?: string;
    isOwner?: boolean;
    clinics?: string[];
    permissions?: PermissionTree;
    originalRole?: string; // Original role (admin/provider) for backward compatibility
  }
}

// Re-export billing domain types
export * from "./billing";
