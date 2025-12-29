/**
 * Convex ID Validation Utilities
 * 
 * Validates that IDs are in the correct Convex format before passing to queries.
 * Demo mode uses string IDs that are not valid Convex IDs.
 */

/**
 * Regex pattern for valid Convex IDs in full format
 * Format: tableName:alphanumericId
 * - Table name: lowercase letters only
 * - ID: alphanumeric, underscore, or hyphen (minimum 20 characters)
 */
const CONVEX_ID_FULL_PATTERN = /^[a-z]+:[a-zA-Z0-9_-]{20,}$/;

/**
 * Regex pattern for valid Convex ID hash (hash-only format)
 * Format: lowercase letters and numbers, typically 20+ characters
 * This is the format stored in sessions and what Convex accepts directly
 * 
 * Convex IDs can start with various letters (j, k, n, etc.), not just j/k.
 * The pattern allows any lowercase alphanumeric characters with minimum length.
 */
const CONVEX_ID_HASH_PATTERN = /^[a-z][a-z0-9]{19,}$/;

/**
 * Validates that an ID is a valid Convex ID format
 * Convex IDs can be in two formats:
 * 1. Full format: tableName:hash (e.g., "users:abc123...")
 * 2. Hash-only format: hash (e.g., "jn773tx80p6edja8pr73n8w2kd7tyaw5")
 * 
 * Both formats are valid - Convex accepts hash-only IDs directly in queries.
 * Sessions typically store hash-only IDs.
 * 
 * @param id - The ID string to validate
 * @returns true if valid Convex ID, false otherwise
 * 
 * @example
 * isValidConvexId('users:abc123def456ghi789jkl012') // true (full format)
 * isValidConvexId('jn773tx80p6edja8pr73n8w2kd7tyaw5') // true (hash-only format)
 * isValidConvexId('demo-user') // false
 * isValidConvexId('users:short') // false (too short)
 */
export function isValidConvexId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Demo mode IDs are not valid Convex IDs
  if (id.startsWith('demo-')) {
    return false;
  }
  
  // Check if it's a hash-only format (lowercase letters and numbers)
  if (CONVEX_ID_HASH_PATTERN.test(id)) {
    // Validate length for hash-only format (typically 20-40 characters)
    return id.length >= 20 && id.length <= 200;
  }
  
  // Check if it's full format (tableName:hash)
  if (CONVEX_ID_FULL_PATTERN.test(id)) {
    // Validate length for full format
    return id.length >= 20 && id.length <= 200;
  }
  
  return false;
}

/**
 * Validates that an ID is a valid Convex ID for a specific table.
 * 
 * This function first checks if the ID is a valid Convex ID format,
 * then verifies that it belongs to the specified table (if in full format).
 * Hash-only IDs are considered valid for any table since they can't be validated
 * without the table prefix.
 * 
 * @param id - The ID string to validate
 * @param tableName - The expected table name (e.g., 'users', 'patients', 'providers')
 * @returns true if the ID is valid and (if in full format) belongs to the specified table, false otherwise
 * 
 * @example
 * isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'users') // true
 * isValidConvexIdForTable('users:abc123def456ghi789jkl012', 'patients') // false (wrong table)
 * isValidConvexIdForTable('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'users') // true (hash-only, can't verify table)
 * isValidConvexIdForTable('demo-user', 'users') // false (not a valid Convex ID)
 */
export function isValidConvexIdForTable(
  id: string | undefined | null,
  tableName: string
): boolean {
  if (!isValidConvexId(id)) {
    return false;
  }
  
  // If it's hash-only format (no colon), we can't verify the table
  // but it's still a valid Convex ID, so accept it
  if (!id!.includes(':')) {
    return true;
  }
  
  // If it's full format, check that it starts with the expected table name
  return id!.startsWith(`${tableName}:`);
}

/**
 * Type guard to check if an ID is valid for Convex queries.
 * 
 * This function ensures both the ID and tenantId are present and valid
 * before allowing Convex queries to be executed. This prevents runtime
 * errors when demo mode uses string IDs that aren't valid Convex IDs.
 * 
 * @param id - The user/entity ID to validate (must be a valid Convex ID)
 * @param tenantId - The tenant ID (required for queries, must be a non-empty string)
 * @returns true if ID is a valid Convex ID and tenantId is present, false otherwise
 * 
 * @example
 * // Valid Convex ID with tenant ID string
 * canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant') // true
 * 
 * // Hash-only format IDs
 * canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant') // true
 * 
 * // Missing tenant ID
 * canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', undefined) // false
 * 
 * // Demo ID (invalid user ID)
 * canUseConvexQuery('demo-user', 'demo-tenant') // false
 * 
 * // Valid user ID with string tenant ID (this is correct)
 * canUseConvexQuery('jn773tx80p6edja8pr73n8w2kd7tyaw5', 'demo-tenant') // true
 * 
 * // Null/undefined ID
 * canUseConvexQuery(null, 'demo-tenant') // false
 */
export function canUseConvexQuery(
  id: string | undefined | null,
  tenantId?: string | undefined | null
): boolean {
  // Must have both ID and tenantId
  if (!id || !tenantId) {
    return false;
  }
  
  // User ID must be a valid Convex ID (not a demo ID)
  // tenantId is just a string identifier (like 'demo-tenant'), not a Convex ID
  return isValidConvexId(id) && typeof tenantId === 'string' && tenantId.length > 0;
}

