import { describe, it, expect, beforeEach } from 'vitest'
import { ROLES, getRolePermissions, isRoleAtLeast, clearRolePermissionsCache } from '../roles'
import type { OrganizationRole } from '@startkit/config'

describe('Role System', () => {
  beforeEach(() => {
    clearRolePermissionsCache()
  })

  describe('ROLES', () => {
    it('should define all required roles', () => {
      expect(ROLES.viewer).toBeDefined()
      expect(ROLES.member).toBeDefined()
      expect(ROLES.admin).toBeDefined()
      expect(ROLES.owner).toBeDefined()
    })

    it('should have correct role hierarchy levels', () => {
      expect(ROLES.viewer.level).toBe(1)
      expect(ROLES.member.level).toBe(10)
      expect(ROLES.admin.level).toBe(50)
      expect(ROLES.owner.level).toBe(100)
    })

    it('should have viewer as read-only', () => {
      const viewerPerms = ROLES.viewer.permissions
      expect(viewerPerms).toContain('read:project')
      expect(viewerPerms).toContain('read:team')
      expect(viewerPerms).toContain('read:settings')
      // Should not have write permissions
      expect(viewerPerms).not.toContain('create:project')
      expect(viewerPerms).not.toContain('delete:project')
    })
  })

  describe('getRolePermissions()', () => {
    it('should return permissions for viewer role', () => {
      const perms = getRolePermissions('viewer')
      expect(perms).toContain('read:project')
      expect(perms).toContain('read:team')
      expect(perms).toContain('read:settings')
    })

    it('should return permissions for member role (includes viewer)', () => {
      const perms = getRolePermissions('member')
      // Inherits viewer permissions
      expect(perms).toContain('read:project')
      expect(perms).toContain('read:team')
      // Has member-specific permissions
      expect(perms).toContain('create:project')
      expect(perms).toContain('update:project')
    })

    it('should return permissions for admin role (includes member and viewer)', () => {
      const perms = getRolePermissions('admin')
      // Inherits viewer permissions
      expect(perms).toContain('read:project')
      // Inherits member permissions
      expect(perms).toContain('create:project')
      // Has admin-specific permissions
      expect(perms).toContain('create:member')
      expect(perms).toContain('delete:member')
    })

    it('should return permissions for owner role (includes all)', () => {
      const perms = getRolePermissions('owner')
      // Inherits all lower role permissions
      expect(perms).toContain('read:project')
      expect(perms).toContain('create:project')
      expect(perms).toContain('create:member')
      // Has owner-specific permissions
      expect(perms).toContain('delete:organization')
      expect(perms).toContain('manage:subscription')
    })

    it('should cache permissions', () => {
      const perms1 = getRolePermissions('owner')
      const perms2 = getRolePermissions('owner')
      expect(perms1).toBe(perms2) // Same reference due to caching
    })
  })

  describe('isRoleAtLeast()', () => {
    it('should correctly compare role hierarchy', () => {
      expect(isRoleAtLeast('owner', 'admin')).toBe(true)
      expect(isRoleAtLeast('admin', 'member')).toBe(true)
      expect(isRoleAtLeast('member', 'viewer')).toBe(true)
      expect(isRoleAtLeast('viewer', 'member')).toBe(false)
      expect(isRoleAtLeast('admin', 'owner')).toBe(false)
    })

    it('should return true for same role', () => {
      expect(isRoleAtLeast('admin', 'admin')).toBe(true)
      expect(isRoleAtLeast('member', 'member')).toBe(true)
    })
  })
})
