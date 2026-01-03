/**
 * Cloudinary Image Upload API for Websites App
 */

import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';
import {
  uploadToCloudinary,
  getCloudinaryFolder,
  validateCloudinaryConfig,
} from '@/lib/images/cloudinary-upload';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Check if user has permission to upload images
 */
function hasUploadPermission(session: any): boolean {
  if (!session?.user) {
    return false;
  }

  const role = session.user.role;
  const allowedRoles = ['clinic_user', 'admin', 'provider', 'owner'];

  return allowedRoles.includes(role as string) || session.user.isOwner === true;
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Cloudinary upload request received');

    // 1. Authenticate user
    let session;
    try {
      session = await getZentheaServerSession();
    } catch (authError) {
      logger.error('Authentication service error in upload API:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        message: 'The authentication service encountered an error. Please ensure Clerk is configured correctly.',
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }, { status: 401 });
    }
    
    if (!session?.user) {
      logger.warn('Unauthorized upload attempt: No valid session found');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be signed in to upload images.'
      }, { status: 401 });
    }

    logger.info('User authenticated:', { userId: session.user.id, role: session.user.role });

    // 2. Check permissions
    if (!hasUploadPermission(session)) {
      logger.warn('Permission denied for user:', { userId: session.user.id, role: session.user.role });
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 3. Check Cloudinary configuration
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!validateCloudinaryConfig()) {
      logger.error('Cloudinary configuration missing in Websites app', {
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret
      });
      return NextResponse.json({ 
        error: 'Image upload service is not configured',
        message: 'Please ensure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in apps/websites/.env.local',
        details: {
          hasCloudName: !!cloudName,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret
        }
      }, { status: 500 });
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageTypeRaw = formData.get('imageType');
    const imageType = typeof imageTypeRaw === 'string' ? imageTypeRaw.toLowerCase().trim() : 'general';

    if (!file) {
      logger.warn('No file provided in upload request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    logger.info('File received:', { name: file.name, size: file.size, type: file.type });

    // 5. Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      logger.warn('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large:', file.size);
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // 6. Get tenant ID
    const tenantId = session.user.tenantId || 'default'; 

    // 7. Get folder path
    const folder = getCloudinaryFolder(tenantId, imageType as any);
    logger.info('Uploading to folder:', folder);

    // 8. Upload to Cloudinary
    try {
      const uploadResult = await uploadToCloudinary(file, folder, {
        imageType: imageType as any,
        tags: [`tenant:${tenantId}`, `type:${imageType}`, 'website-builder'],
      });

      logger.info('Cloudinary upload successful:', uploadResult.publicId);

      return NextResponse.json({
        success: true,
        ...uploadResult
      });
    } catch (uploadError) {
      logger.error('Cloudinary upload service error:', uploadError);
      return NextResponse.json({ 
        error: 'Cloudinary upload failed', 
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error' 
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Unexpected error in Cloudinary upload API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
