/**
 * AWS S3 Client Configuration and Utilities
 * 
 * Provides S3 client setup and common operations for image uploads
 * with proper error handling and retry logic
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AWSErrorHandler, AWSRetryHandler } from './error-handler';
import { logger } from '@/lib/logger';

export interface S3UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  expires?: Date;
}

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag?: string;
}

export class S3ClientManager {
  private static s3Client: S3Client | null = null;
  
  /**
   * Get configured S3 client with proper credentials
   */
  static getClient(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.s3Client;
  }
  
  /**
   * Upload file to S3 with error handling and retry logic
   */
  static async upload(options: S3UploadOptions): Promise<S3UploadResult> {
    const client = this.getClient();
    
    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata,
      CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year
      Expires: options.expires,
    });
    
    return AWSRetryHandler.executeWithRetry(
      async () => {
        const result = await client.send(command);
        
        // Note: S3 bucket is configured to block public access for security
        // The images will be accessible through CloudFront with proper permissions
        logger.info('S3 object uploaded, public access depends on bucket policy', JSON.stringify({
          bucket: options.bucket,
          key: options.key,
        }));
        
        // Generate URL using our image serving endpoint
        // This works around the S3 bucket's public access restrictions
        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.zenthea.ai';
        const url = `${baseUrl}/api/serve-image?key=${encodeURIComponent(options.key)}`;
        
        logger.info('S3 upload successful', JSON.stringify({
          bucket: options.bucket,
          key: options.key,
          url,
          etag: result.ETag
        }));
        
        return {
          url,
          key: options.key,
          bucket: options.bucket,
          etag: result.ETag
        };
      },
      'S3 upload',
      { bucket: options.bucket, key: options.key }
    );
  }
  
  /**
   * Upload image file with optimized settings
   */
  static async uploadImage(
    file: File | Buffer,
    key: string,
    bucket: string = process.env.AWS_S3_BUCKET || 'zenthea-images-prod',
    options: {
      contentType?: string;
      metadata?: Record<string, string>;
      cacheControl?: string;
    } = {}
  ): Promise<S3UploadResult> {
    const body = file instanceof File ? await file.arrayBuffer() : file;
    const contentType = options.contentType || this.getContentType(key);
    
    return this.upload({
      bucket,
      key,
      body: body instanceof Buffer ? body : Buffer.from(new Uint8Array(body)),
      contentType,
      metadata: {
        ...options.metadata,
        'upload-timestamp': new Date().toISOString(),
        'source': 'zenthea-landing-page'
      },
      cacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year
    });
  }
  
  /**
   * Delete object from S3
   */
  static async delete(bucket: string, key: string): Promise<void> {
    const client = this.getClient();
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    return AWSRetryHandler.executeWithRetry(
      async () => {
        await client.send(command);
        logger.info('S3 delete successful', JSON.stringify({ bucket, key }));
      },
      'S3 delete',
      { bucket, key }
    );
  }
  
  /**
   * Get object from S3
   */
  static async get(bucket: string, key: string): Promise<Buffer> {
    const client = this.getClient();
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    return AWSRetryHandler.executeWithRetry(
      async () => {
        const result = await client.send(command);
        const chunks: Uint8Array[] = [];
        
        if (result.Body) {
          for await (const chunk of result.Body as any) {
            chunks.push(chunk);
          }
        }
        
        return Buffer.concat(chunks);
      },
      'S3 get',
      { bucket, key }
    );
  }
  
  /**
   * Generate optimized image key for static assets
   */
  static generateImageKey(filename: string, category: 'hero' | 'assets' | 'medical' = 'assets'): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '-');
    return `images/${category}/${timestamp}-${sanitizedFilename}`;
  }
  
  /**
   * Get content type based on file extension
   */
  private static getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * Validate AWS credentials are configured
   */
  static validateCredentials(): boolean {
    const required = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.error('Missing AWS credentials', JSON.stringify({ missing }));
      return false;
    }
    
    return true;
  }
}
