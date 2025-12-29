/**
 * Cloudinary Upload Utility
 * 
 * Handles file uploads to Cloudinary with tenant-based folder organization
 * and proper validation/error handling.
 * 
 * SERVER-ONLY: This module uses Node.js-only APIs and should never be imported
 * in client-side code. It's intended for use in API routes and server components only.
 */

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryConfigured } from './cloudinary';
import { logger } from '@/lib/logger';

// Configure Cloudinary SDK
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Upload options for Cloudinary
 */
export interface CloudinaryUploadOptions {
  /** Image type/category (hero, block, general, logo) */
  imageType?: 'hero' | 'block' | 'general' | 'logo';
  /** Additional transformation options */
  transformations?: Record<string, any>;
  /** Resource type (image, video, raw) */
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  /** Override folder path */
  folder?: string;
  /** Public ID override */
  publicId?: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Result of Cloudinary upload
 */
export interface CloudinaryUploadResult {
  success: true;
  publicId: string;
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Validate Cloudinary configuration
 */
export function validateCloudinaryConfig(): boolean {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.warn('Cloudinary configuration incomplete', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    });
    return false;
  }

  return true;
}

/**
 * Get Cloudinary folder path for tenant and image type
 * Sanitizes tenantId to prevent path traversal attacks
 */
export function getCloudinaryFolder(
  tenantId: string,
  imageType: 'hero' | 'block' | 'general' | 'logo' = 'general'
): string {
  // Sanitize tenantId to prevent path traversal
  // Only allow alphanumeric, hyphens, and underscores
  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
  
  if (!sanitizedTenantId || sanitizedTenantId.length === 0) {
    throw new Error('Invalid tenant ID: contains only invalid characters');
  }
  
  if (sanitizedTenantId.length > 100) {
    throw new Error('Invalid tenant ID: exceeds maximum length');
  }
  
  return `clients/${sanitizedTenantId}/website-builder/${imageType}`;
}

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(
  file: File | Buffer,
  folder: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  // Validate configuration
  if (!validateCloudinaryConfig()) {
    throw new Error('Cloudinary is not properly configured. Please check your environment variables.');
  }

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  // Prepare upload options
  const uploadOptions: any = {
    folder,
    resource_type: options.resourceType || 'image',
    overwrite: false,
    invalidate: true, // Invalidate CDN cache
    use_filename: false, // Use auto-generated unique filename
    unique_filename: true,
  };

  // Add public ID if provided
  if (options.publicId) {
    uploadOptions.public_id = options.publicId;
  }

  // Add tags
  if (options.tags && options.tags.length > 0) {
    uploadOptions.tags = options.tags;
  }

  // Add transformations if provided
  if (options.transformations) {
    uploadOptions.transformation = options.transformations;
  }

  try {
    // Upload to Cloudinary using upload_stream for better memory handling
    const uploadPromise = new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error', {
              error: error.message,
              folder,
              options,
            });
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
            return;
          }

          resolve({
            success: true,
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });

    const result = await uploadPromise;

    logger.info('Cloudinary upload successful', {
      publicId: result.publicId,
      folder,
      format: result.format,
      size: result.bytes,
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary upload exception', {
      error: error instanceof Error ? error.message : 'Unknown error',
      folder,
    });
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!validateCloudinaryConfig()) {
    throw new Error('Cloudinary is not properly configured');
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('Cloudinary image deleted', { publicId });
  } catch (error) {
    logger.error('Cloudinary delete error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      publicId,
    });
    throw error;
  }
}

