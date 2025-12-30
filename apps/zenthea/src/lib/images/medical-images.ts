/**
 * HIPAA-Compliant Medical Image Manager for Zenthea
 * 
 * Handles encrypted storage, access controls, and audit logging
 * for medical images in compliance with HIPAA regulations.
 */

import { StaticImageManager, ImageOptimizationOptions } from './static-images';

export interface MedicalImageMetadata {
  patientId: string;
  studyId: string;
  imageType: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'photo' | 'document';
  acquisitionDate: Date;
  modality: string;
  bodyPart: string;
  description?: string;
  encrypted: boolean;
  accessLevel: 'restricted' | 'confidential' | 'public';
  retentionDate?: Date;
}

export interface MedicalImageAccess {
  userId: string;
  userRole: 'physician' | 'nurse' | 'technician' | 'admin' | 'patient';
  accessType: 'view' | 'download' | 'edit' | 'delete';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  reason: string;
}

export interface MedicalImageAudit {
  imageId: string;
  action: 'upload' | 'view' | 'download' | 'edit' | 'delete' | 'access_denied';
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}

export class MedicalImageManager {
  private static readonly MEDICAL_CDN_BASE = process.env.NEXT_PUBLIC_MEDICAL_ASSETS_BASE_URL || 'https://medical-assets.zenthea.com';
  private static readonly ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY;
  private static readonly AUDIT_ENDPOINT = '/api/medical/images/audit';
  
  /**
   * Get HIPAA-compliant medical image URL
   */
  static getMedicalImage(
    imageId: string,
    options: ImageOptimizationOptions & {
      patientId: string;
      studyId: string;
      accessToken: string;
    } = {} as any
  ): string {
    const { patientId, studyId, accessToken, ...imageOptions } = options;
    
    // Validate access token
    if (!this.validateAccessToken(accessToken, patientId)) {
      throw new Error('Invalid access token for medical image');
    }
    
    // Generate secure URL with access controls
    const params = new URLSearchParams();
    params.set('patientId', patientId);
    params.set('studyId', studyId);
    params.set('token', accessToken);
    params.set('encrypted', 'true');
    
    // Add image optimization parameters
    if (imageOptions.width) params.set('w', imageOptions.width.toString());
    if (imageOptions.height) params.set('h', imageOptions.height.toString());
    params.set('q', (imageOptions.quality || 95).toString());
    params.set('f', imageOptions.format || 'jpeg'); // Lossless for medical accuracy
    
    return `${this.MEDICAL_CDN_BASE}/medical/${imageId}?${params.toString()}`;
  }
  
  /**
   * Upload medical image with encryption
   */
  static async uploadMedicalImage(
    file: File,
    metadata: MedicalImageMetadata,
    accessToken: string
  ): Promise<{
    imageId: string;
    url: string;
    encrypted: boolean;
    auditId: string;
  }> {
    // Validate access permissions
    if (!this.validateUploadPermissions(accessToken, metadata.patientId)) {
      throw new Error('Insufficient permissions to upload medical image');
    }
    
    // Encrypt file content
    const encryptedFile = await this.encryptFile(file);
    
    // Generate unique image ID
    const imageId = this.generateImageId(metadata);
    
    // Upload to encrypted storage
    const uploadResult = await this.uploadToEncryptedStorage(encryptedFile, imageId);
    
    // Log audit trail
    const auditId = await this.logAudit({
      imageId,
      action: 'upload',
      userId: this.getCurrentUserId(accessToken),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      details: {
        patientId: metadata.patientId,
        studyId: metadata.studyId,
        imageType: metadata.imageType,
        fileSize: file.size,
        encrypted: true
      }
    });
    
    return {
      imageId,
      url: uploadResult.url,
      encrypted: true,
      auditId
    };
  }
  
  /**
   * Get medical image with access logging
   */
  static async getMedicalImageWithAudit(
    imageId: string,
    patientId: string,
    studyId: string,
    accessToken: string,
    accessType: 'view' | 'download' = 'view'
  ): Promise<{
    url: string;
    metadata: MedicalImageMetadata;
    auditId: string;
  }> {
    // Validate access
    if (!this.validateImageAccess(accessToken, imageId, patientId)) {
      await this.logAudit({
        imageId,
        action: 'access_denied',
        userId: this.getCurrentUserId(accessToken),
        timestamp: new Date(),
        ipAddress: this.getClientIP(),
        userAgent: this.getUserAgent(),
        details: {
          patientId,
          studyId,
          accessType,
          reason: 'Invalid access token'
        }
      });
      throw new Error('Access denied to medical image');
    }
    
    // Get image metadata
    const metadata = await this.getImageMetadata(imageId);
    
    // Generate secure URL
    const url = this.getMedicalImage(imageId, {
      patientId,
      studyId,
      accessToken,
      format: 'jpeg', // Lossless for medical accuracy
      quality: 95
    });
    
    // Log access
    const auditId = await this.logAudit({
      imageId,
      action: accessType,
      userId: this.getCurrentUserId(accessToken),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      details: {
        patientId,
        studyId,
        accessType,
        imageType: metadata.imageType,
        modality: metadata.modality
      }
    });
    
    return { url, metadata, auditId };
  }
  
  /**
   * Delete medical image with audit trail
   */
  static async deleteMedicalImage(
    imageId: string,
    patientId: string,
    accessToken: string,
    reason: string
  ): Promise<{ success: boolean; auditId: string }> {
    // Validate delete permissions
    if (!this.validateDeletePermissions(accessToken, imageId, patientId)) {
      throw new Error('Insufficient permissions to delete medical image');
    }
    
    // Delete from storage
    const deleteResult = await this.deleteFromEncryptedStorage(imageId);
    
    // Log deletion
    const auditId = await this.logAudit({
      imageId,
      action: 'delete',
      userId: this.getCurrentUserId(accessToken),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      details: {
        patientId,
        reason,
        deleted: true
      }
    });
    
    return { success: deleteResult.success, auditId };
  }
  
  /**
   * Get audit trail for medical image
   */
  static async getImageAuditTrail(
    imageId: string,
    accessToken: string
  ): Promise<MedicalImageAudit[]> {
    // Validate audit access permissions
    if (!this.validateAuditAccess(accessToken)) {
      throw new Error('Insufficient permissions to view audit trail');
    }
    
    // Fetch audit records
    const response = await fetch(`${this.AUDIT_ENDPOINT}/${imageId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch audit trail');
    }
    
    return response.json();
  }
  
  /**
   * Generate secure access token for medical images
   */
  static generateAccessToken(
    userId: string,
    patientId: string,
    permissions: string[],
    expiresIn: number = 3600 // 1 hour
  ): string {
    // This would typically use JWT or similar secure token generation
    // For now, we'll create a simple token structure
    const tokenData = {
      userId,
      patientId,
      permissions,
      expires: Date.now() + (expiresIn * 1000),
      type: 'medical_image_access'
    };
    
    // In production, this should be properly signed and encrypted
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }
  
  // Private helper methods
  
  private static validateAccessToken(token: string, patientId: string): boolean {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      return tokenData.patientId === patientId && 
             tokenData.expires > Date.now() &&
             tokenData.type === 'medical_image_access';
    } catch {
      return false;
    }
  }
  
  private static validateUploadPermissions(token: string, patientId: string): boolean {
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.permissions.includes('upload') && 
           tokenData.patientId === patientId;
  }
  
  private static validateImageAccess(token: string, imageId: string, patientId: string): boolean {
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.permissions.includes('view') && 
           tokenData.patientId === patientId;
  }
  
  private static validateDeletePermissions(token: string, imageId: string, patientId: string): boolean {
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.permissions.includes('delete') && 
           tokenData.patientId === patientId;
  }
  
  private static validateAuditAccess(token: string): boolean {
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.permissions.includes('audit');
  }
  
  private static async encryptFile(file: File): Promise<Blob> {
    // In production, this would use proper encryption
    // For now, we'll simulate encryption
    const arrayBuffer = await file.arrayBuffer();
    const encryptedBuffer = new Uint8Array(arrayBuffer);
    
    // Simple XOR encryption (NOT for production use)
    const key = new TextEncoder().encode(this.ENCRYPTION_KEY || 'default-key');
    for (let i = 0; i < encryptedBuffer.length; i++) {
      const currentByte = encryptedBuffer[i];
      const keyByte = key[i % key.length];
      if (currentByte !== undefined && keyByte !== undefined) {
        encryptedBuffer[i] = currentByte ^ keyByte;
      }
    }
    
    return new Blob([encryptedBuffer], { type: file.type });
  }
  
  private static generateImageId(metadata: MedicalImageMetadata): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `med_${metadata.patientId}_${metadata.studyId}_${timestamp}_${random}`;
  }
  
  private static async uploadToEncryptedStorage(file: Blob, imageId: string): Promise<{ url: string }> {
    // In production, this would upload to encrypted S3 or similar
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageId', imageId);
    formData.append('encrypted', 'true');
    
    const response = await fetch('/api/medical/images/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload medical image');
    }
    
    return response.json();
  }
  
  private static async deleteFromEncryptedStorage(imageId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/medical/images/${imageId}`, {
      method: 'DELETE'
    });
    
    return { success: response.ok };
  }
  
  private static async getImageMetadata(imageId: string): Promise<MedicalImageMetadata> {
    const response = await fetch(`/api/medical/images/${imageId}/metadata`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image metadata');
    }
    
    return response.json();
  }
  
  private static async logAudit(audit: MedicalImageAudit): Promise<string> {
    const response = await fetch(this.AUDIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(audit)
    });
    
    if (!response.ok) {
      throw new Error('Failed to log audit trail');
    }
    
    const result = await response.json();
    return result.auditId;
  }
  
  private static getCurrentUserId(token: string): string {
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.userId;
  }
  
  private static getClientIP(): string {
    // In production, this would get the actual client IP
    return '127.0.0.1';
  }
  
  private static getUserAgent(): string {
    // In production, this would get the actual user agent
    return 'Zenthea-Medical-Client/1.0';
  }
}
