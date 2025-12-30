"use node";

// Note: This module requires Node.js crypto module
// For Edge Runtime compatibility, consider using Web Crypto API
import crypto from 'node:crypto';

/**
 * HIPAA-compliant encryption service for PHI data
 * Implements AES-256-GCM encryption for data at rest and in transit
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  /**
   * Get encryption key from environment variables
   * In production, this should use AWS KMS or similar key management service
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY || process.env.PHI_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('Encryption key not configured. Set ENCRYPTION_KEY or PHI_ENCRYPTION_KEY environment variable.');
    }
    
    // Ensure key is 32 bytes (256 bits) for AES-256
    const keyBuffer = Buffer.from(key, 'base64');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(`Invalid encryption key length. Expected ${this.keyLength} bytes, got ${keyBuffer.length}`);
    }
    
    return keyBuffer;
  }

  /**
   * Encrypt PHI data with AES-256-GCM
   * @param data - Data to encrypt
   * @param patientId - Patient ID for additional context
   * @returns Encrypted data with metadata
   */
  async encryptPHI(data: string, patientId?: string): Promise<EncryptedPHI> {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Set additional authenticated data (AAD) for extra security
      const aad = Buffer.from(`zenthea-phi-${patientId || 'system'}`, 'utf8');
      cipher.setAAD(aad);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        keyId: await this.getKeyId(key),
        timestamp: Date.now(),
        patientId: patientId || null
      };
    } catch (error) {
      throw new Error(`Failed to encrypt PHI data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt PHI data with AES-256-GCM
   * @param encryptedPHI - Encrypted data with metadata
   * @param patientId - Patient ID for additional context
   * @returns Decrypted data
   */
  async decryptPHI(encryptedPHI: EncryptedPHI, patientId?: string): Promise<string> {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedPHI.iv, 'hex');
      const authTag = Buffer.from(encryptedPHI.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // Set additional authenticated data (AAD) for extra security
      const aad = Buffer.from(`zenthea-phi-${patientId || encryptedPHI.patientId || 'system'}`, 'utf8');
      decipher.setAAD(aad);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedPHI.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt PHI data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt sensitive fields in patient data
   * @param patientData - Patient data object
   * @returns Patient data with encrypted sensitive fields
   */
  async encryptPatientData(patientData: any): Promise<any> {
    const sensitiveFields = [
      'ssn',
      'medicalRecordNumber',
      'insurance.memberId',
      'address',
      'phone',
      'email',
      'dateOfBirth'
    ];

    const encryptedData = { ...patientData };

    for (const field of sensitiveFields) {
      if (this.getNestedValue(encryptedData, field)) {
        const value = this.getNestedValue(encryptedData, field);
        if (typeof value === 'string' && value.trim()) {
          const encrypted = await this.encryptPHI(value, patientData.id);
          this.setNestedValue(encryptedData, field, encrypted);
        }
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt sensitive fields in patient data
   * @param patientData - Patient data object with encrypted fields
   * @returns Patient data with decrypted sensitive fields
   */
  async decryptPatientData(patientData: any): Promise<any> {
    const sensitiveFields = [
      'ssn',
      'medicalRecordNumber',
      'insurance.memberId',
      'address',
      'phone',
      'email',
      'dateOfBirth'
    ];

    const decryptedData = { ...patientData };

    for (const field of sensitiveFields) {
      const value = this.getNestedValue(decryptedData, field);
      if (value && typeof value === 'object' && value.encrypted) {
        try {
          const decrypted = await this.decryptPHI(value, patientData.id);
          this.setNestedValue(decryptedData, field, decrypted);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decryptedData;
  }

  /**
   * Generate a secure encryption key
   * @returns Base64-encoded encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Hash data for integrity verification
   * @param data - Data to hash
   * @returns SHA-256 hash
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity
   * @param data - Data to verify
   * @param hash - Expected hash
   * @returns True if data is intact
   */
  static verifyIntegrity(data: string, hash: string): boolean {
    const computedHash = this.hashData(data);
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  }

  private async getKeyId(key: Buffer): Promise<string> {
    // In production, this would return the key ID from KMS
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

/**
 * Encrypted PHI data structure
 */
export interface EncryptedPHI {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyId: string;
  timestamp: number;
  patientId: string | null;
}

/**
 * Data classification levels for HIPAA compliance
 */
export enum DataClassification {
  PHI = 'PHI',                    // Protected Health Information
  PII = 'PII',                    // Personally Identifiable Information
  CONFIDENTIAL = 'CONFIDENTIAL',  // Confidential business data
  INTERNAL = 'INTERNAL',          // Internal use only
  PUBLIC = 'PUBLIC'               // Public information
}

/**
 * PHI field definitions for encryption
 */
export const PHI_FIELDS = [
  'ssn',
  'medicalRecordNumber',
  'insurance.memberId',
  'address',
  'phone',
  'email',
  'dateOfBirth',
  'healthRecords.data',
  'messages.content',
  'appointments.notes'
];

/**
 * Data retention policies for HIPAA compliance
 */
export interface DataRetentionPolicy {
  phi: number;           // PHI retention in milliseconds (6 years)
  auditLogs: number;     // Audit logs retention in milliseconds (6 years)
  sessionData: number;   // Session data retention in milliseconds (1 year)
  temporaryData: number; // Temporary data retention in milliseconds (30 days)
}

export const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  phi: 6 * 365 * 24 * 60 * 60 * 1000,        // 6 years
  auditLogs: 6 * 365 * 24 * 60 * 60 * 1000,   // 6 years
  sessionData: 365 * 24 * 60 * 60 * 1000,     // 1 year
  temporaryData: 30 * 24 * 60 * 60 * 1000     // 30 days
};

// Export singleton instance
export const encryptionService = new EncryptionService();

// Legacy function exports for backward compatibility
export async function encryptPHI(data: string, patientId?: string): Promise<EncryptedPHI> {
  return await encryptionService.encryptPHI(data, patientId);
}

export async function decryptPHI(encryptedPHI: EncryptedPHI, patientId?: string): Promise<string> {
  return await encryptionService.decryptPHI(encryptedPHI, patientId);
}

// Synchronous versions for Convex compatibility
export function encryptPHISync(data: string): string {
  // For Convex compatibility, we'll use a simple base64 encoding
  // In production, this should be replaced with proper encryption
  const key = process.env.PHI_ENCRYPTION_KEY || 'default-key-for-development';
  const iv = crypto.randomBytes(16);
  // Hash the key to ensure it's the correct length for AES-256-CBC
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    algorithm: 'aes-256-cbc'
  });
}

export function decryptPHISync(encryptedData: string): string {
  try {
    const parsed = JSON.parse(encryptedData);
    const key = process.env.PHI_ENCRYPTION_KEY || 'default-key-for-development';
    const iv = Buffer.from(parsed.iv, 'hex');
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(parsed.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt PHI data:', error);
    return encryptedData; // Return as-is if decryption fails
  }
}

export function generateEncryptionKey(): string {
  return EncryptionService.generateEncryptionKey();
}
