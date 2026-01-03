/**
 * Cloudinary Upload Utility for Websites App
 * 
 * Handles file uploads to Cloudinary with tenant-based folder organization.
 * SERVER-ONLY: This module uses Node.js-only APIs.
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

export interface CloudinaryUploadOptions {
  imageType?: 'hero' | 'block' | 'general' | 'logo';
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  folder?: string;
  publicId?: string;
  tags?: string[];
}

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

export function validateCloudinaryConfig(): boolean {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return !!(cloudName && apiKey && apiSecret);
}

export function getCloudinaryFolder(
  tenantId: string,
  imageType: 'hero' | 'block' | 'general' | 'logo' = 'general'
): string {
  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
  return `clients/${sanitizedTenantId}/website-builder/${imageType}`;
}

export async function uploadToCloudinary(
  file: File | Buffer,
  folder: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  if (!validateCloudinaryConfig()) {
    throw new Error('Cloudinary is not properly configured.');
  }

  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  const uploadOptions: any = {
    folder,
    resource_type: options.resourceType || 'image',
    overwrite: false,
    invalidate: true,
    use_filename: false,
    unique_filename: true,
  };

  if (options.publicId) uploadOptions.public_id = options.publicId;
  if (options.tags) uploadOptions.tags = options.tags;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error.message);
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
}
