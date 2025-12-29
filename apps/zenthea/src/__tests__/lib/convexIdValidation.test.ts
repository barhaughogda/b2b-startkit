import { describe, it, expect } from 'vitest';
import { 
  isValidConvexId, 
  isValidConvexIdForTable, 
  canUseConvexQuery 
} from '@/lib/convexIdValidation';

describe('convexIdValidation', () => {
  describe('isValidConvexId', () => {
    describe('Valid Convex IDs', () => {
      it('should accept valid Convex IDs with standard format', () => {
        expect(isValidConvexId('users:abc123def456ghi789jkl012')).toBe(true);
        expect(isValidConvexId('patients:xyz789abc123def456ghi789')).toBe(true);
        expect(isValidConvexId('providers:qwe456rty789uio012asd345')).toBe(true);
      });

      it('should accept valid Convex IDs with different table names', () => {
        expect(isValidConvexId('appointments:abc123def456ghi789jkl012')).toBe(true);
        expect(isValidConvexId('messages:xyz789abc123def456ghi789')).toBe(true);
        expect(isValidConvexId('tenants:qwe456rty789uio012asd345')).toBe(true);
      });

      it('should accept valid Convex IDs with underscores and hyphens', () => {
        expect(isValidConvexId('users:abc123_def456-ghi789_jkl012')).toBe(true);
        expect(isValidConvexId('patients:xyz789-abc123_def456ghi789')).toBe(true);
      });

      it('should accept valid Convex IDs at minimum length (20 chars)', () => {
        // Full format: tableName:hash where hash is at least 20 chars
        // 'users:' (6) + hash (20) = 26 chars minimum
        expect(isValidConvexId('users:abc123def456ghi789jk')).toBe(true); // 26 chars total, 20 hash chars
      });

      it('should accept valid Convex IDs at maximum length (200 chars)', () => {
        const longId = 'users:' + 'a'.repeat(193); // 5 chars for 'users:' + 193 = 198 total
        expect(isValidConvexId(longId)).toBe(true);
      });

      it('should accept hash-only format Convex IDs (starts with j or k)', () => {
        // These are the format stored in sessions
        expect(isValidConvexId('jn773tx80p6edja8pr73n8w2kd7tyaw5')).toBe(true);
        expect(isValidConvexId('k123456789012345678901234567890')).toBe(true);
        expect(isValidConvexId('jabcdefghijklmnopqrstuvwxyz123')).toBe(true);
      });

      it('should accept hash-only format at minimum length (20 chars)', () => {
        expect(isValidConvexId('j1234567890123456789')).toBe(true); // j + 19 digits = 20 chars
        expect(isValidConvexId('kabcdefghijklmnopqrs')).toBe(true); // k + 19 letters = 20 chars
      });

      it('should accept hash-only format at maximum length (200 chars)', () => {
        const longHash = 'j' + 'a'.repeat(199); // 200 chars total
        expect(isValidConvexId(longHash)).toBe(true);
      });
    });

    describe('Invalid IDs - Demo IDs', () => {
      it('should reject demo user IDs', () => {
        expect(isValidConvexId('demo-user')).toBe(false);
        expect(isValidConvexId('demo-tenant')).toBe(false);
        expect(isValidConvexId('demo-provider')).toBe(false);
      });

      it('should reject IDs starting with demo-', () => {
        expect(isValidConvexId('demo-anything')).toBe(false);
        expect(isValidConvexId('demo-123')).toBe(false);
      });
    });

    describe('Invalid IDs - Format Issues', () => {
      it('should reject IDs missing colon (unless hash-only format)', () => {
        expect(isValidConvexId('usersabc123def456ghi789jkl012')).toBe(false);
        // Hash-only format without 'j' or 'k' prefix is invalid
        expect(isValidConvexId('abc123def456ghi789jkl012')).toBe(false);
        // IDs starting with other letters are invalid
        expect(isValidConvexId('m123456789012345678901234567890')).toBe(false);
        expect(isValidConvexId('a123456789012345678901234567890')).toBe(false);
      });

      it('should reject IDs with invalid table name format', () => {
        expect(isValidConvexId('Users:abc123def456ghi789jkl012')).toBe(false); // uppercase
        expect(isValidConvexId('USERS:abc123def456ghi789jkl012')).toBe(false); // all uppercase
        expect(isValidConvexId('user-s:abc123def456ghi789jkl012')).toBe(false); // hyphen in table name
        expect(isValidConvexId('user_s:abc123def456ghi789jkl012')).toBe(false); // underscore in table name
        expect(isValidConvexId('123users:abc123def456ghi789jkl012')).toBe(false); // number in table name
      });

      it('should reject IDs with invalid characters in ID portion', () => {
        expect(isValidConvexId('users:abc123@def456')).toBe(false); // @ symbol
        expect(isValidConvexId('users:abc123#def456')).toBe(false); // # symbol
        expect(isValidConvexId('users:abc123 def456')).toBe(false); // space
        expect(isValidConvexId('users:abc123.def456')).toBe(false); // period
      });
    });

    describe('Invalid IDs - Length Issues', () => {
      it('should reject IDs that are too short (< 20 chars)', () => {
        expect(isValidConvexId('users:short')).toBe(false);
        expect(isValidConvexId('users:abc123')).toBe(false);
        expect(isValidConvexId('users:abc123def')).toBe(false);
        // Hash-only format also needs to be at least 20 chars
        expect(isValidConvexId('j12345678901234567')).toBe(false); // 19 chars
        expect(isValidConvexId('k1234567890123456')).toBe(false); // 18 chars
      });

      it('should reject IDs that are too long (> 200 chars)', () => {
        const tooLongId = 'users:' + 'a'.repeat(195); // 5 chars for 'users:' + 195 = 200 total, but needs > 200
        expect(isValidConvexId(tooLongId)).toBe(false);
        const evenLongerId = 'users:' + 'a'.repeat(200);
        expect(isValidConvexId(evenLongerId)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null input', () => {
        expect(isValidConvexId(null)).toBe(false);
      });

      it('should handle undefined input', () => {
        expect(isValidConvexId(undefined)).toBe(false);
      });

      it('should handle empty string', () => {
        expect(isValidConvexId('')).toBe(false);
      });

      it('should handle whitespace-only strings', () => {
        expect(isValidConvexId('   ')).toBe(false);
        expect(isValidConvexId('\t\n')).toBe(false);
      });

      it('should handle non-string types gracefully', () => {
        // TypeScript should prevent this, but runtime checks are good
        expect(isValidConvexId(123 as any)).toBe(false);
        expect(isValidConvexId({} as any)).toBe(false);
        expect(isValidConvexId([] as any)).toBe(false);
      });
    });
  });

  describe('isValidConvexIdForTable', () => {
    describe('Valid Table-Specific IDs', () => {
      it('should accept valid ID for users table', () => {
        expect(isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'users')).toBe(true);
      });

      it('should accept valid ID for patients table', () => {
        expect(isValidConvexIdForTable('patients:xyz789abc123def456ghi789', 'patients')).toBe(true);
      });

      it('should accept valid ID for providers table', () => {
        expect(isValidConvexIdForTable('providers:qwe456rty789uio012asd345', 'providers')).toBe(true);
      });

      it('should accept valid ID for providerProfiles table', () => {
        // Note: Convex table names are lowercase, so use 'providerprofiles' not 'providerProfiles'
        expect(isValidConvexIdForTable('providerprofiles:abc123def456ghi789jkl012', 'providerprofiles')).toBe(true);
      });

      it('should accept hash-only format IDs for any table (cannot verify table)', () => {
        // Hash-only IDs are accepted since we can't verify the table without the prefix
        expect(isValidConvexIdForTable('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'users')).toBe(true);
        expect(isValidConvexIdForTable('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'patients')).toBe(true);
        expect(isValidConvexIdForTable('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'providers')).toBe(true);
      });
    });

    describe('Invalid Table-Specific IDs', () => {
      it('should reject valid ID for wrong table', () => {
        expect(isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'patients')).toBe(false);
        expect(isValidConvexIdForTable('patients:xyz789abc123def456ghi789', 'users')).toBe(false);
      });

      it('should reject invalid ID even if table name matches', () => {
        expect(isValidConvexIdForTable('users:short', 'users')).toBe(false);
        expect(isValidConvexIdForTable('demo-user', 'users')).toBe(false);
      });

      it('should reject null/undefined IDs', () => {
        expect(isValidConvexIdForTable(null, 'users')).toBe(false);
        expect(isValidConvexIdForTable(undefined, 'users')).toBe(false);
      });

      it('should handle case sensitivity correctly', () => {
        // Table names are lowercase in Convex
        expect(isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'Users')).toBe(false);
        expect(isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'USERS')).toBe(false);
      });
    });
  });

  describe('canUseConvexQuery', () => {
    describe('Valid Query Conditions', () => {
      it('should return true when ID is valid Convex ID and tenantId is a non-empty string', () => {
        expect(canUseConvexQuery('users:abc123def456ghi789jkl012', 'demo-tenant')).toBe(true);
        expect(canUseConvexQuery('patients:qwe456rty789uio012asd345', 'demo-tenant')).toBe(true);
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant')).toBe(true);
      });

      it('should return true with hash-only format IDs and string tenantId', () => {
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant')).toBe(true);
        expect(canUseConvexQuery('k123456789012345678901234567890', 'demo-tenant')).toBe(true);
      });

      it('should accept any non-empty string as tenantId', () => {
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant')).toBe(true);
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'clinic-123')).toBe(true);
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'tenant-abc')).toBe(true);
      });
    });

    describe('Invalid Query Conditions', () => {
      it('should return false when ID is missing', () => {
        expect(canUseConvexQuery(null, 'demo-tenant')).toBe(false);
        expect(canUseConvexQuery(undefined, 'demo-tenant')).toBe(false);
        expect(canUseConvexQuery('', 'demo-tenant')).toBe(false);
      });

      it('should return false when tenantId is missing', () => {
        expect(canUseConvexQuery('users:abc123def456ghi789jkl012', null)).toBe(false);
        expect(canUseConvexQuery('users:abc123def456ghi789jkl012', undefined)).toBe(false);
        expect(canUseConvexQuery('users:abc123def456ghi789jkl012', '')).toBe(false);
      });

      it('should return false when ID is a demo ID', () => {
        expect(canUseConvexQuery('demo-user', 'demo-tenant')).toBe(false);
        expect(canUseConvexQuery('demo-patient', 'demo-tenant')).toBe(false);
      });

      it('should return false when ID is invalid format', () => {
        expect(canUseConvexQuery('users:short', 'demo-tenant')).toBe(false);
        expect(canUseConvexQuery('invalid-format', 'demo-tenant')).toBe(false);
      });

      it('should return false when both are missing', () => {
        expect(canUseConvexQuery(null, null)).toBe(false);
        expect(canUseConvexQuery(undefined, undefined)).toBe(false);
        expect(canUseConvexQuery('', '')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should reject IDs with whitespace', () => {
        // Whitespace in tenantId makes it invalid (empty after trim)
        expect(canUseConvexQuery('users:abc123def456ghi789jkl012', '  ')).toBe(false);
        // Whitespace in the ID itself should be invalid
        expect(canUseConvexQuery('users:abc123 def456', 'demo-tenant')).toBe(false);
      });

      it('should accept tenantId with valid string format', () => {
        // tenantId can be any non-empty string, not just Convex IDs
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant')).toBe(true);
        expect(canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'clinic-123')).toBe(true);
      });
    });
  });
});

