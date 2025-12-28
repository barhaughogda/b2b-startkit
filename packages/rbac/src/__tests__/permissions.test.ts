import { describe, it, expect, beforeEach } from 'vitest'
import { can, canAll, canAny, requirePermission, clearPermissionCache, PermissionDeniedError } from '../permissions'
import { clearRolePermissionsCache } from '../roles'
import type { PermissionContext } from '../types'

describe('Permission Engine', () => {
  beforeEach(() => {
    clearPermissionCache()
    clearRolePermissionsCache()
  })

  describe('can()', () => {
    it('should return true for superadmins regardless of permission', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: true,
        featureFlags: new Map(),
      }

      expect(can(ctx, 'delete:organization')).toBe(true)
      expect(can(ctx, 'any:permission')).toBe(true)
    })

    it('should check custom permissions first', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: ['delete:project'],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      expect(can(ctx, 'delete:project')).toBe(true)
      expect(can(ctx, 'delete:organization')).toBe(false)
    })

    it('should check role permissions', () => {
      const memberCtx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      const ownerCtx: PermissionContext = {
        role: 'owner',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      // Member can read projects
      expect(can(memberCtx, 'read:project')).toBe(true)
      // Member cannot delete organization
      expect(can(memberCtx, 'delete:organization')).toBe(false)

      // Owner can delete organization
      expect(can(ownerCtx, 'delete:organization')).toBe(true)
    })

    it('should respect role hierarchy', () => {
      const viewerCtx: PermissionContext = {
        role: 'viewer',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      const memberCtx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      // Viewer can read but not create
      expect(can(viewerCtx, 'read:project')).toBe(true)
      expect(can(viewerCtx, 'create:project')).toBe(false)

      // Member inherits viewer permissions and can create
      expect(can(memberCtx, 'read:project')).toBe(true)
      expect(can(memberCtx, 'create:project')).toBe(true)
    })
  })

  describe('canAll()', () => {
    it('should return true only if user has all permissions', () => {
      const ctx: PermissionContext = {
        role: 'admin',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      expect(canAll(ctx, ['read:project', 'read:team'])).toBe(true)
      expect(canAll(ctx, ['read:project', 'delete:organization'])).toBe(false)
    })
  })

  describe('canAny()', () => {
    it('should return true if user has any permission', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      expect(canAny(ctx, ['read:project', 'delete:organization'])).toBe(true)
      expect(canAny(ctx, ['delete:organization', 'transfer:ownership'])).toBe(false)
    })
  })

  describe('requirePermission()', () => {
    it('should throw PermissionDeniedError if permission denied', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: false,
        featureFlags: new Map(),
      }

      expect(() => requirePermission(ctx, 'read:project')).not.toThrow()
      expect(() => requirePermission(ctx, 'delete:organization')).toThrow(PermissionDeniedError)
    })

    it('should not throw for superadmins', () => {
      const ctx: PermissionContext = {
        role: 'member',
        customPermissions: [],
        plan: 'free',
        isSuperadmin: true,
        featureFlags: new Map(),
      }

      expect(() => requirePermission(ctx, 'delete:organization')).not.toThrow()
    })
  })
})
