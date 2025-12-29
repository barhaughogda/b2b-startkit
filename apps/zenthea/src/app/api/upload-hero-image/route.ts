/**
 * API endpoint for uploading hero images to S3
 * 
 * Handles image uploads for landing page hero images
 * with proper validation and AWS S3 integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3ClientManager } from '@/lib/aws/s3-client';
import { updatePageWithNewUrl } from '@/lib/utils/update-page-image';
import { logger } from '@/lib/logger';
import { ImageOptimizer } from '@/lib/images/image-optimizer';
import { CDNPerformanceManager } from '@/lib/cdn/performance-headers';
import { PerformanceMonitor } from '@/lib/monitoring/performance-metrics';
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { withCSRFProtection } from '@/lib/security/csrf-protection';
import { validateFileContent, checkSuspiciousContent } from '@/lib/security/file-content-validator';
import { logFileUpload, logSecurityEvent } from '@/lib/security/audit-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let file: File | null = null;
  
  try {
    // Apply rate limiting
    const rateLimitResult = await withRateLimit(request, RATE_LIMITS.UPLOAD);
    if (!rateLimitResult.allowed) {
      await logSecurityEvent(request, 'rate_limit_exceeded', {
        endpoint: '/api/upload-hero-image',
        limit: RATE_LIMITS.UPLOAD.maxRequests,
        window: RATE_LIMITS.UPLOAD.windowMs
      });
      return rateLimitResult.response!;
    }

    // Skip CSRF protection for public image uploads
    // CSRF protection is not needed for public image uploads

    // Validate AWS credentials
    if (!S3ClientManager.validateCredentials()) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      await logSecurityEvent(request, 'invalid_file_type', {
        providedType: file.type,
        allowedTypes,
        fileName: file.name
      });
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file content beyond MIME type
    const contentValidation = await validateFileContent(file, file.type);
    if (!contentValidation.valid) {
      await logSecurityEvent(request, 'invalid_file_type', {
        fileName: file.name,
        providedType: file.type,
        detectedType: contentValidation.detectedType,
        error: contentValidation.error
      });
      return NextResponse.json(
        { 
          error: 'File content validation failed',
          details: contentValidation.error
        },
        { status: 400 }
      );
    }

    // Check for suspicious content
    const suspiciousCheck = await checkSuspiciousContent(file);
    if (suspiciousCheck.suspicious) {
      await logSecurityEvent(request, 'suspicious_content', {
        fileName: file.name,
        warnings: suspiciousCheck.warnings
      });
      return NextResponse.json(
        { 
          error: 'File contains suspicious content',
          details: suspiciousCheck.warnings
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // For large files, recommend chunked upload
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return NextResponse.json(
        { 
          error: 'File too large for direct upload. Please use chunked upload for files larger than 5MB.',
          recommendation: 'Use /api/upload-chunked endpoint for large files'
        },
        { status: 413 }
      );
    }

    // Optimize image before upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const optimization = await ImageOptimizer.optimizeForUseCase(fileBuffer, 'hero');
    
    // Generate S3 key with optimized format
    const key = S3ClientManager.generateImageKey(
      file.name,
      'hero'
    );

    // Create optimized file for upload
    const optimizedFile = new File([new Uint8Array(optimization.optimizedBuffer)], file.name, {
      type: `image/${optimization.format}`
    });

    // Upload optimized image to S3
    const result = await S3ClientManager.uploadImage(
      optimizedFile,
      key,
      process.env.AWS_S3_BUCKET || 'zenthea-images-prod',
      {
        contentType: `image/${optimization.format}`,
        metadata: {
          'original-name': file.name,
          'original-size': file.size.toString(),
          'optimized-size': optimization.optimizedSize.toString(),
          'compression-ratio': optimization.compressionRatio.toString(),
          'upload-source': 'landing-page-hero',
          'upload-timestamp': new Date().toISOString(),
          'optimization-applied': 'true'
        },
        cacheControl: 'public, max-age=31536000, immutable' // 1 year cache with immutable
      }
    );

    // Record performance metrics
    const duration = Date.now() - startTime;
    PerformanceMonitor.recordImageProcessingMetrics(
      'hero_image_upload',
      duration,
      true,
      {
        originalSize: file.size,
        optimizedSize: optimization.optimizedSize,
        format: optimization.format,
        dimensions: optimization.dimensions
      }
    );

    logger.info('Hero image uploaded successfully', JSON.stringify({
      key: result.key,
      url: result.url,
      bucket: result.bucket,
      compressionRatio: `${optimization.compressionRatio.toFixed(1)}%`,
      optimizedSize: `${(optimization.optimizedSize / 1024).toFixed(2)}KB`
    }));

    // Log successful upload for audit
    await logFileUpload(
      request,
      file.name,
      file.size,
      file.type,
      true
    );

    // Update page.tsx with the new URL and get old URL for cleanup
    let oldUrl: string | null = null;
    try {
      oldUrl = await updatePageWithNewUrl(result.url);
    } catch (updateError) {
      logger.warn('Failed to update page.tsx', JSON.stringify({ error: updateError instanceof Error ? updateError.message : String(updateError) }));
      // Don't fail the upload if page update fails
    }

    // Delete old image from S3 if it exists and is different from new one
    if (oldUrl && oldUrl !== result.url && oldUrl.includes('cloudfront.net')) {
      try {
        // Extract S3 key from old URL
        const urlParts = oldUrl.split('/');
        const oldKey = urlParts.slice(urlParts.indexOf('images')).join('/');
        
        if (oldKey && oldKey !== result.key) {
          await S3ClientManager.delete(process.env.AWS_S3_BUCKET!, oldKey);
          logger.info('Old hero image deleted from S3', JSON.stringify({ oldKey }));
        }
      } catch (deleteError) {
        logger.warn('Failed to delete old image from S3', JSON.stringify({ error: deleteError instanceof Error ? deleteError.message : String(deleteError) }));
        // Don't fail the upload if cleanup fails
      }
    }

    // Create response with performance headers
    const response = NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      bucket: result.bucket,
      optimization: {
        originalSize: file.size,
        optimizedSize: optimization.optimizedSize,
        compressionRatio: optimization.compressionRatio,
        format: optimization.format
      }
    });

    // Apply performance headers
    return CDNPerformanceManager.applyPerformanceHeaders(
      response,
      `image/${optimization.format}`,
      '/api/upload-hero-image',
      {
        isOptimized: true,
        etag: CDNPerformanceManager.generateETag(optimization.optimizedBuffer),
        lastModified: new Date().toUTCString()
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record failed performance metrics
    PerformanceMonitor.recordImageProcessingMetrics(
      'hero_image_upload',
      duration,
      false,
      {
        originalSize: file?.size || 0,
        optimizedSize: 0,
        format: 'unknown',
        dimensions: { width: 0, height: 0 }
      },
      errorMessage
    );
    
    logger.error('Hero image upload failed', JSON.stringify({ 
      error: errorMessage,
      duration: `${duration}ms`,
      fileSize: file?.size ? `${(file.size / 1024).toFixed(2)}KB` : 'unknown'
    }));

    // Log failed upload for audit
    if (file) {
      await logFileUpload(
        request,
        file.name,
        file.size,
        file.type,
        false,
        errorMessage
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload image',
        details: errorMessage,
        recommendation: file && file.size > 5 * 1024 * 1024 
          ? 'Try using chunked upload for large files' 
          : 'Check file format and size limits'
      },
      { status: 500 }
    );
  }
}
