/**
 * Avatar-related constants
 * Shared constants for avatar upload and display functionality
 */

/**
 * Maximum file size for avatar uploads (5MB)
 * Used for both client-side and server-side validation
 */
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Allowed image MIME types for avatar uploads
 */
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/**
 * Cache control header for avatar images (1 year)
 * Avatars don't change frequently, so long cache is appropriate
 */
export const AVATAR_CACHE_CONTROL = 'public, max-age=31536000'; // 1 year

/**
 * Maximum zoom level for avatar crop dialog
 */
export const MAX_AVATAR_ZOOM = 3;

/**
 * Minimum zoom level for avatar crop dialog
 */
export const MIN_AVATAR_ZOOM = 1;

