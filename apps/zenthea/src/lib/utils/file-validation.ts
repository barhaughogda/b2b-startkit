/**
 * File validation utilities for image uploads
 */

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
] as const;

export const MAX_FILE_SIZES = {
  logo: 5 * 1024 * 1024, // 5MB
  hero: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Validates if file type is allowed
 */
export function validateFileType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase() as any);
}

/**
 * Validates if file size is within limit
 */
export function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

/**
 * Sanitizes filename by removing special characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Validates file for upload
 */
export function validateFile(file: File, type: 'logo' | 'hero'): { valid: boolean; error?: string } {
  // Check file type
  if (!validateFileType(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Only ${ALLOWED_IMAGE_TYPES.join(', ')} are allowed.`
    };
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[type];
  if (!validateFileSize(file.size, maxSize)) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`
    };
  }

  return { valid: true };
}
