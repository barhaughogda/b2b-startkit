"use node";

/**
 * MFA Service for TOTP (Time-based One-Time Password) authentication
 * Implements RFC 6238 TOTP standard
 * 
 * This service handles:
 * - TOTP secret generation
 * - QR code generation for authenticator apps
 * - TOTP code verification
 * - Backup code generation (hashing handled in Convex)
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { EncryptionService, type EncryptedPHI } from './security/encryption';

// Configure TOTP settings
authenticator.options = {
  step: 30, // 30-second time window
  window: [1, 1], // Allow 1 step before and after current time
  digits: 6, // 6-digit codes
  // @ts-expect-error - otplib v12 type definitions don't properly include 'sha1' in HashAlgorithms type
  // SHA-1 is the standard algorithm for TOTP per RFC 6238 and is fully supported by otplib
  algorithm: 'sha1', // SHA-1 algorithm (standard for TOTP)
};

/**
 * Generate a new TOTP secret for a user
 * @param userId - User ID for secret generation context
 * @param email - User email for QR code label
 * @returns Base32-encoded secret string
 */
export function generateTOTPSecret(userId: string, email: string): string {
  // Generate a random secret (base32 encoded)
  // The secret should be at least 16 characters (128 bits) for security
  const secret = authenticator.generateSecret();
  
  return secret;
}

/**
 * Generate QR code data URL for authenticator app setup
 * @param secret - TOTP secret (base32)
 * @param email - User email
 * @param issuer - Service name (default: "Zenthea")
 * @returns Promise resolving to QR code data URL
 */
export async function generateQRCode(
  secret: string,
  email: string,
  issuer: string = 'Zenthea'
): Promise<string> {
  // Generate TOTP URI according to Google Authenticator format
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  });
  
  return qrCodeDataUrl;
}

/**
 * Verify a TOTP code against a secret
 * @param secret - TOTP secret (base32, decrypted)
 * @param token - User-provided TOTP code
 * @returns True if code is valid
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    // Verify the token against the secret
    // The window option allows for clock skew tolerance
    return authenticator.verify({
      token,
      secret,
    });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes for MFA recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes (plaintext - will be hashed before storage)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const crypto = require('crypto');
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    // Format: XXXX-XXXX (e.g., A1B2-C3D4)
    const randomBytes = crypto.randomBytes(4);
    const code = randomBytes
      .toString('base64')
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8)
      .match(/.{1,4}/g)
      ?.join('-') || '';
    
    // Ensure code is exactly 8 characters (before dash)
    if (code.length === 9) { // 4 chars + dash + 4 chars
      codes.push(code.toUpperCase());
    } else {
      // Fallback: generate simple code
      const fallbackCode = crypto.randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .substring(0, 8)
        .match(/.{1,4}/g)
        ?.join('-') || '';
      codes.push(fallbackCode);
    }
  }
  
  return codes;
}

/**
 * Encrypt TOTP secret before storage
 * @param secret - Plaintext TOTP secret
 * @param userId - User ID for encryption context
 * @returns Encrypted secret string (JSON-encoded)
 */
export async function encryptTOTPSecret(
  secret: string,
  userId: string
): Promise<string> {
  const encryptionService = new EncryptionService();
  const encrypted = await encryptionService.encryptPHI(secret, userId);
  
  // Store as JSON string for Convex compatibility
  return JSON.stringify(encrypted);
}

/**
 * Decrypt TOTP secret for verification
 * @param encryptedSecret - Encrypted secret (JSON-encoded)
 * @param userId - User ID for decryption context
 * @returns Plaintext TOTP secret
 */
export async function decryptTOTPSecret(
  encryptedSecret: string,
  userId: string
): Promise<string> {
  try {
    const encryptionService = new EncryptionService();
    const encrypted: EncryptedPHI = JSON.parse(encryptedSecret);
    const decrypted = await encryptionService.decryptPHI(encrypted, userId);
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt TOTP secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate backup code format
 * @param code - Code to validate
 * @returns True if code format matches backup code format (XXXX-XXXX)
 */
export function validateBackupCodeFormat(code: string): boolean {
  // Backup codes are 8 alphanumeric characters with a dash in the middle
  // Format: XXXX-XXXX (e.g., A1B2-C3D4)
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
}

/**
 * Validate TOTP code format
 * @param code - Code to validate
 * @returns True if code format is valid (6 digits)
 */
export function validateTOTPCodeFormat(code: string): boolean {
  // TOTP codes are 6-digit numbers
  return /^\d{6}$/.test(code);
}

/**
 * Get TOTP setup information for a user
 * @param userId - User ID
 * @param email - User email
 * @returns Object with secret, QR code, and backup codes
 */
export async function getTOTPSetupInfo(
  userId: string,
  email: string
): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  const secret = generateTOTPSecret(userId, email);
  const qrCode = await generateQRCode(secret, email);
  const backupCodes = generateBackupCodes(10);
  
  return {
    secret,
    qrCode,
    backupCodes,
  };
}

