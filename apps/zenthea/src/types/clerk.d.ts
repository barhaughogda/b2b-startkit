import { PermissionTree } from './index'

declare global {
  interface UserPublicMetadata {
    role?: string
    isSuperadmin?: boolean
    isOwner?: boolean
    tenantId?: string
  }

  interface UserPrivateMetadata {
    permissions?: PermissionTree
    departments?: string[]
    clinics?: string[]
  }

  interface OrganizationPublicMetadata {
    type?: string
    slug?: string
  }

  interface OrganizationPrivateMetadata {
    // Custom settings for the organization
  }

  interface OrganizationMembershipPublicMetadata {
    role?: string
    isOwner?: boolean
  }

  interface OrganizationMembershipPrivateMetadata {
    permissions?: PermissionTree
    departments?: string[]
    clinics?: string[]
  }
}
