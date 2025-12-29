import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { NEXTAUTH_SESSION_COOKIE_NAME } from '@/lib/auth-constants';
import { logger } from '@/lib/logger';
import { apiErrors } from '@/lib/api-errors';
import { MAX_AVATAR_SIZE, ALLOWED_AVATAR_TYPES, AVATAR_CACHE_CONTROL } from '@/lib/avatar-constants';

// Force dynamic rendering - required for authentication to work in production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - use getToken for App Router compatibility
    // Explicitly pass secret for production compatibility (Vercel sometimes needs this)
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      logger.error('NEXTAUTH_SECRET not configured');
      return apiErrors.configError('NEXTAUTH_SECRET is not configured.');
    }

    const token = await getToken({
      req: request,
      secret: secret,
      // Use same cookie name as auth config
      cookieName: NEXTAUTH_SESSION_COOKIE_NAME
    });

    // Debug logging (only enabled in development or when ENABLE_DEBUG_LOGGING=true)
    const cookieHeader = request.headers.get('cookie') || '';
    const hasNextAuthCookie = cookieHeader.includes(NEXTAUTH_SESSION_COOKIE_NAME);

    logger.debug('[Avatar Upload] Token check:', {
      hasToken: !!token,
      userId: token?.sub,
      userRole: token?.role,
      cookies: cookieHeader ? 'present' : 'missing',
      hasNextAuthCookie,
      cookieCount: cookieHeader.split(';').length,
      secretConfigured: !!secret,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      ...(cookieHeader && {
        cookieNames: cookieHeader.split(';').map(c => c.split('=')[0].trim())
      })
    });

    if (!token || !token.sub) {
      // Enhanced error message for debugging
      const hasAuthCookie = cookieHeader.includes(NEXTAUTH_SESSION_COOKIE_NAME);

      logger.error('[Avatar Upload] Authentication failed:', {
        hasToken: !!token,
        hasSub: !!token?.sub,
        hasAuthCookie,
        cookieCount: cookieHeader.split(';').length,
        secretConfigured: !!secret,
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      });

      return apiErrors.unauthorized('Please sign in to upload an avatar.', {
        hasToken: !!token,
        hasAuthCookie,
        cookiePresent: !!cookieHeader,
        secretConfigured: !!secret,
        environment: process.env.NODE_ENV,
      });
    }

    // All authenticated users can upload avatars
    // No role restriction - patients, providers, admins, owners, and clinic users can all upload avatars

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.error('AWS credentials not configured');
      return apiErrors.configError('AWS credentials are not configured.');
    }

    // Check if AWS credentials are placeholder values (only exact matches)
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    // Only flag as placeholder if it's exactly a known placeholder value
    // Don't use .startsWith() as real AWS keys could theoretically match
    const knownPlaceholders = [
      'your_aws_access_key_here',
      'your_actual_aws_access_key',
      'your-aws-access-key',
      '',
    ];

    const isPlaceholderAccessKey = knownPlaceholders.includes(accessKeyId);
    const isPlaceholderSecretKey =
      secretAccessKey === 'your_aws_secret_key_here' ||
      secretAccessKey === 'your_actual_aws_secret_key' ||
      secretAccessKey === 'your-aws-secret-key' ||
      secretAccessKey === '';

    if (isPlaceholderAccessKey || isPlaceholderSecretKey) {
      logger.error('AWS credentials validation:', {
        accessKeyIdLength: accessKeyId.length,
        secretKeyLength: secretAccessKey.length,
        isPlaceholderAccessKey,
        isPlaceholderSecretKey,
      });
      return apiErrors.configError('AWS credentials are not properly configured.');
    }

    // Check AWS S3 bucket configuration
    if (!process.env.AWS_S3_BUCKET) {
      logger.error('AWS S3 bucket not configured');
      return apiErrors.configError('AWS S3 bucket is not configured.');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return apiErrors.badRequest('No file provided');
    }

    // Validate file type - must match client-side validation in PatientAvatarUpload.tsx
    if (!ALLOWED_AVATAR_TYPES.includes(file.type as typeof ALLOWED_AVATAR_TYPES[number])) {
      return apiErrors.badRequest('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (max 5MB for avatars)
    if (file.size > MAX_AVATAR_SIZE) {
      return apiErrors.badRequest(`File too large. Maximum size is ${MAX_AVATAR_SIZE / (1024 * 1024)}MB.`);
    }

    // Generate unique filename with user ID for better organization
    const userId = token.sub || 'unknown';
    const userRole = token.role || 'patient';
    
    // Normalize role for S3 path organization
    // Map clinic_user, admin, and provider to 'clinic' for consistent organization
    // Keep patient as 'patient' for separation
    const normalizedRole = 
      userRole === 'clinic_user' || userRole === 'admin' || userRole === 'provider' 
        ? 'clinic' 
        : userRole === 'super_admin' 
        ? 'admin' 
        : userRole || 'patient';
    
    // Log warning in development if role is missing (should be set by auth system)
    // This helps identify authentication configuration issues during development
    if (!token.role && process.env.NODE_ENV === 'development') {
      logger.warn('[Avatar Upload] User role is undefined, defaulting to patient', {
        userId,
        hasToken: !!token,
        tokenKeys: Object.keys(token || {}),
      });
    }
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    // Organize avatars by normalized role for better S3 organization
    const key = `images/avatars/${normalizedRole}/${userId}/${fileName}`;

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Upload to S3
    logger.log(`Attempting S3 upload for ${userRole} avatar...`, { bucket: process.env.AWS_S3_BUCKET, key, userRole });

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        type: `${userRole}-avatar`,
        userId: userId,
        userRole: userRole,
      },
      CacheControl: AVATAR_CACHE_CONTROL,
    });

    const result = await s3Client.send(command);
    logger.log('S3 upload successful:', result);

    // Generate serving URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.zenthea.ai';
    const servingUrl = `${baseUrl}/api/serve-image?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      success: true,
      url: servingUrl,
      key: key,
      bucket: process.env.AWS_S3_BUCKET,
      originalName: file.name,
      size: file.size
    });

  } catch (error) {
    logger.error('Avatar upload error:', error);

    if (error instanceof Error) {
      // Check for AWS-specific errors and provide user-friendly messages
      if (error.name === 'InvalidAccessKeyId' || error.message.includes('InvalidAccessKeyId')) {
        return apiErrors.configError('AWS credentials are invalid. Please contact support.', {
          errorName: error.name,
          errorMessage: error.message,
        });
      } else if (error.name === 'SignatureDoesNotMatch' || error.message.includes('SignatureDoesNotMatch')) {
        return apiErrors.configError('AWS credentials are invalid. Please contact support.', {
          errorName: error.name,
          errorMessage: error.message,
        });
      } else if (error.name === 'NoSuchBucket' || error.message.includes('NoSuchBucket')) {
        return apiErrors.configError('AWS S3 bucket is not accessible. Please contact support.', {
          errorName: error.name,
          errorMessage: error.message,
        });
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        return apiErrors.configError('AWS access denied. Please contact support.', {
          errorName: error.name,
          errorMessage: error.message,
        });
      }

      // Generic error with debug info
      return apiErrors.serverError('Upload failed. Please try again later.', {
        errorName: error.name,
        errorMessage: error.message,
        hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasS3Bucket: !!process.env.AWS_S3_BUCKET,
        s3Bucket: process.env.AWS_S3_BUCKET
      });
    }

    return apiErrors.serverError('Upload failed. Please try again later.');
  }
}

