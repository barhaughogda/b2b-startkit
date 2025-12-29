/**
 * Cloudinary Image Upload API
 * 
 * Handles authenticated image uploads to Cloudinary with tenant-based
 * folder organization for website builder images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  uploadToCloudinary,
  getCloudinaryFolder,
  validateCloudinaryConfig,
} from '@/lib/images/cloudinary-upload';
import { logger } from '@/lib/logger';
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { validateFileContent } from '@/lib/security/file-content-validator';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed. Got: ${file.type}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Check if user has permission to upload images
 */
function hasUploadPermission(session: Session | null): boolean {
  if (!session?.user) {
    return false;
  }

  const role = session.user.role;
  const allowedRoles = ['clinic_user', 'admin', 'provider', 'owner'];

  // Check if user has clinic role or is owner
  return allowedRoles.includes(role as string) || (session.user as { isOwner?: boolean }).isOwner === true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Apply rate limiting
    const rateLimitResult = await withRateLimit(request, RATE_LIMITS.UPLOAD);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for Cloudinary upload', {
        endpoint: '/api/upload/cloudinary',
      });
      return rateLimitResult.response!;
    }

    // 2. Check Cloudinary configuration
    if (!validateCloudinaryConfig()) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      
      logger.error('Cloudinary configuration missing', {
        endpoint: '/api/upload/cloudinary',
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      });
      
      // In production, don't expose which specific env vars are missing
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return NextResponse.json(
        {
          error: 'Image upload service is not configured. Please configure Cloudinary credentials in your environment variables.',
          code: 'SERVICE_NOT_CONFIGURED',
          details: isDevelopment
            ? {
                missing: [
                  !cloudName && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
                  !apiKey && 'CLOUDINARY_API_KEY',
                  !apiSecret && 'CLOUDINARY_API_SECRET',
                ].filter(Boolean),
              }
            : { message: 'Configuration incomplete' },
        },
        { status: 500 }
      );
    }

    // 3. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Unauthenticated upload attempt', {
        endpoint: '/api/upload/cloudinary',
      });
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        },
        { status: 401 }
      );
    }

    // 4. Check permissions
    if (!hasUploadPermission(session)) {
      logger.warn('Unauthorized upload attempt', {
        endpoint: '/api/upload/cloudinary',
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json(
        {
          error: 'You do not have permission to upload images',
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    // 5. Get tenant ID
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      logger.error('Missing tenant ID in session', {
        userId: session.user.id,
        endpoint: '/api/upload/cloudinary',
      });
      return NextResponse.json(
        {
          error: 'Tenant ID required',
          code: 'MISSING_TENANT_ID',
        },
        { status: 400 }
      );
    }

    // 6. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Sanitize and validate imageType input
    const imageTypeRaw = formData.get('imageType');
    const imageType = typeof imageTypeRaw === 'string' 
      ? imageTypeRaw.toLowerCase().trim() 
      : 'general';

    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          code: 'NO_FILE',
        },
        { status: 400 }
      );
    }

    // 7. Validate file (basic validation)
    const validation = validateFile(file);
    if (!validation.valid) {
      logger.warn('File validation failed', {
        error: validation.error,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId: session.user.id,
        tenantId,
      });
      return NextResponse.json(
        {
          error: validation.error,
          code: 'VALIDATION_FAILED',
        },
        { status: 400 }
      );
    }

    // 8. Validate file content (signature checking)
    const contentValidation = await validateFileContent(file, file.type);
    if (!contentValidation.valid) {
      logger.warn('File content validation failed', {
        error: contentValidation.error,
        detectedType: contentValidation.detectedType,
        expectedType: file.type,
        fileName: file.name,
        userId: session.user.id,
        tenantId,
      });
      return NextResponse.json(
        {
          error: contentValidation.error || 'File content validation failed. File type mismatch detected.',
          code: 'CONTENT_VALIDATION_FAILED',
          detectedType: contentValidation.detectedType,
        },
        { status: 400 }
      );
    }

    // 9. Validate image type
    const validImageTypes = ['hero', 'block', 'general', 'logo'];
    const normalizedImageType = imageType.toLowerCase();
    if (!validImageTypes.includes(normalizedImageType)) {
      return NextResponse.json(
        {
          error: `Invalid image type. Must be one of: ${validImageTypes.join(', ')}`,
          code: 'INVALID_IMAGE_TYPE',
        },
        { status: 400 }
      );
    }

    // 10. Get folder path
    const folder = getCloudinaryFolder(
      tenantId,
      normalizedImageType as 'hero' | 'block' | 'general' | 'logo'
    );

    // 11. Upload to Cloudinary
    logger.info('Starting Cloudinary upload', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folder,
      tenantId,
      userId: session.user.id,
    });

    const uploadResult = await uploadToCloudinary(file, folder, {
      imageType: normalizedImageType as 'hero' | 'block' | 'general' | 'logo',
      tags: [`tenant:${tenantId}`, `type:${normalizedImageType}`, 'website-builder'],
    });

    // 12. Return success response
    return NextResponse.json({
      success: true,
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      secureUrl: uploadResult.secureUrl,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (error) {
    logger.error('Cloudinary upload API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: '/api/upload/cloudinary',
    });

    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'UPLOAD_ERROR',
      },
      { status: 500 }
    );
  }
}

