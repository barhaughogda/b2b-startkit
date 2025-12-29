/**
 * Convex-compatible encryption utilities
 * Note: This is a simplified version for development
 * In production, you should use proper encryption with Convex's built-in capabilities
 */

// Simple base64 encoding/decoding for development
// In production, use proper encryption with Convex's security features
export function encryptPHISync(data: string): string {
  // For development, we'll use base64 encoding
  // In production, implement proper encryption
  return Buffer.from(data, 'utf8').toString('base64');
}

export function decryptPHISync(encryptedData: string): string {
  // For development, we'll use base64 decoding
  // In production, implement proper decryption
  return Buffer.from(encryptedData, 'base64').toString('utf8');
}
