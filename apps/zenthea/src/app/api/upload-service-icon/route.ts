import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getZentheaServerSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { apiErrors } from '@/lib/api-errors';
import {
  MAX_SERVICE_ICON_SIZE,
  ALLOWED_SERVICE_ICON_TYPES,
  SERVICE_ICON_CACHE_CONTROL,
  DANGEROUS_SVG_ELEMENTS,
  DANGEROUS_SVG_ATTRIBUTES,
  DANGEROUS_ATTRIBUTE_VALUE_PATTERNS,
} from '@/lib/service-icon-constants';

// Force dynamic rendering - required for authentication to work in production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Sanitize SVG content by removing dangerous elements and attributes
 * This is a simple regex-based sanitizer - for production, consider using
 * a proper SVG sanitization library like DOMPurify with jsdom
 */
function sanitizeSvg(svgContent: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];
  let sanitized = svgContent;

  // Remove dangerous elements
  for (const element of DANGEROUS_SVG_ELEMENTS) {
    const elementRegex = new RegExp(`<${element}[^>]*>[\\s\\S]*?<\\/${element}>`, 'gi');
    const selfClosingRegex = new RegExp(`<${element}[^>]*\\/?>`, 'gi');
    
    if (elementRegex.test(sanitized) || selfClosingRegex.test(sanitized)) {
      warnings.push(`Removed dangerous element: <${element}>`);
      sanitized = sanitized.replace(elementRegex, '');
      sanitized = sanitized.replace(selfClosingRegex, '');
    }
  }

  // Remove dangerous attributes
  for (const attr of DANGEROUS_SVG_ATTRIBUTES) {
    // Match attributes with quotes (single or double)
    const attrRegex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    // Match attributes without quotes
    const attrNoQuoteRegex = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    
    if (attrRegex.test(sanitized) || attrNoQuoteRegex.test(sanitized)) {
      warnings.push(`Removed dangerous attribute: ${attr}`);
      sanitized = sanitized.replace(attrRegex, '');
      sanitized = sanitized.replace(attrNoQuoteRegex, '');
    }
  }

  // Check for dangerous patterns in attribute values
  for (const pattern of DANGEROUS_ATTRIBUTE_VALUE_PATTERNS) {
    if (pattern.test(sanitized)) {
      warnings.push(`Removed content matching dangerous pattern: ${pattern.source}`);
      // Remove attributes containing dangerous patterns
      sanitized = sanitized.replace(new RegExp(`\\s*[a-z-]+\\s*=\\s*["'][^"']*${pattern.source}[^"']*["']`, 'gi'), '');
    }
  }

  // Remove XML processing instructions and DOCTYPE
  sanitized = sanitized.replace(/<\?xml[^>]*\?>/gi, '');
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Ensure the SVG has proper xmlns
  if (!sanitized.includes('xmlns=')) {
    sanitized = sanitized.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return { sanitized, warnings };
}

/**
 * Validate that the content is a valid SVG
 */
function isValidSvg(content: string): boolean {
  // Check for SVG opening tag
  const svgOpenTag = /<svg[^>]*>/i;
  const svgCloseTag = /<\/svg>/i;
  
  return svgOpenTag.test(content) && svgCloseTag.test(content);
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getZentheaServerSession();

    if (!session || !session.user || !session.user.id) {
      return apiErrors.unauthorized('Please sign in to upload an icon.');
    }

    // Only admins and owners can upload service icons
    const allowedRoles = ['admin', 'super_admin', 'clinic_user'];
    const userRole = session.user.role as string;
    const userId = session.user.id;
    
    if (!allowedRoles.includes(userRole)) {
      return apiErrors.forbidden('You do not have permission to upload service icons.');
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.error('AWS credentials not configured');
      return apiErrors.configError('AWS credentials are not configured.');
    }

    if (!process.env.AWS_S3_BUCKET) {
      logger.error('AWS S3 bucket not configured');
      return apiErrors.configError('AWS S3 bucket is not configured.');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tenantId = formData.get('tenantId') as string;

    if (!file) {
      return apiErrors.badRequest('No file provided');
    }

    if (!tenantId) {
      return apiErrors.badRequest('Tenant ID is required');
    }

    // Validate file type
    if (!ALLOWED_SERVICE_ICON_TYPES.includes(file.type as typeof ALLOWED_SERVICE_ICON_TYPES[number])) {
      return apiErrors.badRequest('Invalid file type. Only SVG files are allowed.');
    }

    // Validate file size
    if (file.size > MAX_SERVICE_ICON_SIZE) {
      return apiErrors.badRequest(`File too large. Maximum size is ${MAX_SERVICE_ICON_SIZE / 1024}KB.`);
    }

    // Read file content
    const content = await file.text();

    // Validate it's a proper SVG
    if (!isValidSvg(content)) {
      return apiErrors.badRequest('Invalid SVG file. The file must contain valid SVG markup.');
    }

    // Sanitize the SVG
    const { sanitized, warnings } = sanitizeSvg(content);

    if (warnings.length > 0) {
      logger.warn('SVG sanitization warnings:', { warnings, tenantId });
    }

    // Validate sanitized SVG is still valid
    if (!isValidSvg(sanitized)) {
      return apiErrors.badRequest('SVG file could not be sanitized safely. Please use a simpler icon.');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `images/service-icons/${tenantId}/${fileName}`;

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Upload to S3
    logger.log('Attempting S3 upload for service icon...', { bucket: process.env.AWS_S3_BUCKET, key, tenantId });

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: sanitized,
      ContentType: 'image/svg+xml',
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        type: 'service-icon',
        tenantId: tenantId,
        uploadedBy: token.sub || 'unknown',
        sanitized: warnings.length > 0 ? 'true' : 'false',
      },
      CacheControl: SERVICE_ICON_CACHE_CONTROL,
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
      size: file.size,
      sanitized: warnings.length > 0,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error) {
    logger.error('Service icon upload error:', error);

    if (error instanceof Error) {
      if (error.name === 'InvalidAccessKeyId' || error.message.includes('InvalidAccessKeyId')) {
        return apiErrors.configError('AWS credentials are invalid. Please contact support.');
      } else if (error.name === 'SignatureDoesNotMatch' || error.message.includes('SignatureDoesNotMatch')) {
        return apiErrors.configError('AWS credentials are invalid. Please contact support.');
      } else if (error.name === 'NoSuchBucket' || error.message.includes('NoSuchBucket')) {
        return apiErrors.configError('AWS S3 bucket is not accessible. Please contact support.');
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        return apiErrors.configError('AWS access denied. Please contact support.');
      }

      return apiErrors.serverError('Upload failed. Please try again later.', {
        errorName: error.name,
        errorMessage: error.message,
      });
    }

    return apiErrors.serverError('Upload failed. Please try again later.');
  }
}

