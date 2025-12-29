import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { S3ClientManager } from '@/lib/aws/s3-client';
import { authOptions } from '@/lib/auth';
import { ImageOptimizer } from '@/lib/images/image-optimizer';

/**
 * Provider Profile Media Upload API
 * 
 * Handles uploads of professional photos and introduction videos for provider profiles
 * with optimization, validation, and approval workflow support
 */

// Image dimension constraints
const MIN_IMAGE_DIMENSION = 200; // Minimum width/height in pixels
const MAX_IMAGE_DIMENSION = 5000; // Maximum width/height in pixels
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
// MAX_VIDEO_DURATION_SECONDS = 180; // 3 minutes max for intro videos - TODO: Implement duration validation

/**
 * Validate image dimensions and content
 */
async function validateImageContent(file: File): Promise<{ valid: boolean; error?: string; metadata?: { width: number; height: number; format: string } }> {
  try {
    // Convert File to Buffer for Sharp processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image using Sharp
    const validation = await ImageOptimizer.validateImage(buffer);
    if (!validation.valid) {
      return { valid: false, error: validation.error || 'Invalid image file' };
    }

    // Get image metadata for dimension validation
    const metadata = await ImageOptimizer.getImageMetadata(buffer);

    // Validate dimensions
    if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
      return {
        valid: false,
        error: `Image dimensions too small. Minimum size is ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels. Current: ${metadata.width}x${metadata.height}`
      };
    }

    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
      return {
        valid: false,
        error: `Image dimensions too large. Maximum size is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels. Current: ${metadata.width}x${metadata.height}`
      };
    }

    // Validate aspect ratio (should be reasonable for profile photos)
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      return {
        valid: false,
        error: `Image aspect ratio is too extreme. Please use a portrait or square image (aspect ratio between 0.5 and 2.0). Current: ${aspectRatio.toFixed(2)}`
      };
    }

    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate video file content and duration
 * Note: Full video duration validation requires server-side processing
 * For now, we validate file type and size. Duration validation can be added
 * with a video processing library like ffmpeg or fluent-ffmpeg
 */
async function validateVideoContent(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic file signature validation using magic numbers
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Need at least 12 bytes for proper validation
    if (buffer.length < 12) {
      return {
        valid: false,
        error: 'File too small to be a valid video file'
      };
    }

    // Check for WebM signature (EBML header: 0x1A 0x45 0xDF 0xA3)
    // WebM files start with the EBML header, not the ASCII string 'webm'
    const isWebM = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;

    // Check for MP4/QuickTime signature (ISO Base Media format)
    // MP4 and modern QuickTime files have:
    // - Bytes 0-3: 4-byte size field (big-endian)
    // - Bytes 4-7: 'ftyp' signature
    // So we check for 'ftyp' at offset 4-8 (not 0-4)
    const header4to8 = buffer.toString('ascii', 4, 8);
    const isMP4 = header4to8 === 'ftyp';
    
    // QuickTime files can be:
    // 1. ISO Base Media format (same as MP4) - has 'ftyp' at offset 4
    // 2. Classic QuickTime format - has 'moov' or other atoms (more complex to detect)
    // For simplicity, we check for 'ftyp' which covers modern QuickTime files
    // Classic QuickTime files might have 'moov' at various offsets, so we do a broader search
    const isQuickTime = header4to8 === 'ftyp' || 
                       buffer.toString('ascii', 0, 4) === 'moov' ||
                       buffer.toString('ascii', 4, 8) === 'moov' ||
                       buffer.toString('ascii', 8, 12) === 'moov';

    if (!isMP4 && !isWebM && !isQuickTime) {
      return {
        valid: false,
        error: 'Invalid video file format. File content does not match declared MIME type. Expected MP4, WebM, or QuickTime format.'
      };
    }

    // Additional validation: Check if detected format matches declared MIME type
    const declaredType = file.type;
    if (declaredType === 'video/webm' && !isWebM) {
      return {
        valid: false,
        error: 'File content does not match declared MIME type. Declared as WebM but file signature is invalid.'
      };
    }
    if (declaredType === 'video/mp4' && !isMP4) {
      return {
        valid: false,
        error: 'File content does not match declared MIME type. Declared as MP4 but file signature is invalid.'
      };
    }
    if (declaredType === 'video/quicktime' && !isQuickTime) {
      return {
        valid: false,
        error: 'File content does not match declared MIME type. Declared as QuickTime but file signature is invalid.'
      };
    }

    // Note: Video duration validation would require:
    // 1. Installing a video processing library (e.g., fluent-ffmpeg)
    // 2. Extracting duration from video metadata
    // 3. Comparing against MAX_VIDEO_DURATION_SECONDS
    // This is left as a TODO for production implementation

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Video validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string; // 'photo' | 'video'
    const altText = formData.get('altText') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate media type
    if (!mediaType || !['photo', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid media type. Must be "photo" or "video"' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (mediaType === 'photo') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.` },
          { status: 400 }
        );
      }

      // Validate image content and dimensions
      const imageValidation = await validateImageContent(file);
      if (!imageValidation.valid) {
        return NextResponse.json(
          { error: imageValidation.error || 'Image validation failed' },
          { status: 400 }
        );
      }
    } else if (mediaType === 'video') {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only MP4, WebM, and QuickTime videos are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.` },
          { status: 400 }
        );
      }

      // Validate video content
      const videoValidation = await validateVideoContent(file);
      if (!videoValidation.valid) {
        return NextResponse.json(
          { error: videoValidation.error || 'Video validation failed' },
          { status: 400 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
    const key = `provider-profiles/${session.user.id}/${mediaType}/${fileName}`;

    // Upload to S3
    const result = await S3ClientManager.uploadImage(
      file,
      key,
      process.env.AWS_S3_BUCKET || 'zenthea-images-prod',
      {
        contentType: file.type,
        metadata: {
          'original-name': file.name,
          'uploaded-at': new Date().toISOString(),
          'media-type': mediaType,
          'provider-id': session.user.id,
          'alt-text': altText || '',
          'status': 'pending-approval' // Requires admin approval
        },
        cacheControl: 'public, max-age=31536000' // 1 year cache
      }
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      bucket: result.bucket,
      originalName: file.name,
      size: file.size,
      mediaType: mediaType,
      altText: altText || null,
      status: 'pending-approval',
      message: 'Media uploaded successfully. Awaiting admin approval before publication.'
    });

  } catch (error) {
    console.error('Provider profile media upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

