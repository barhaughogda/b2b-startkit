/**
 * Server-Side Image Optimization and Compression
 * 
 * Handles image optimization, compression, and format conversion
 * to improve performance and reduce bandwidth usage.
 */

import { logger } from '@/lib/logger';

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'center';
  progressive?: boolean;
  strip?: boolean;
  compressionLevel?: number;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: { width: number; height: number };
  optimizedBuffer: Buffer;
  metadata: {
    format: string;
    width: number;
    height: number;
    channels: number;
    density?: number;
  };
}

export class ImageOptimizer {
  private static readonly DEFAULT_QUALITY = 80;
  private static readonly DEFAULT_FORMAT = 'webp';
  private static readonly MAX_DIMENSION = 4096;
  private static readonly MIN_QUALITY = 10;
  private static readonly MAX_QUALITY = 100;

  /**
   * Optimize image with comprehensive compression and format conversion
   */
  static async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    try {
      // Import sharp dynamically to avoid issues if not installed
      const sharp = await this.getSharp();
      
      const {
        quality = this.DEFAULT_QUALITY,
        format = this.DEFAULT_FORMAT,
        width,
        height,
        fit = 'cover',
        position = 'center',
        progressive = true,
        strip = true,
        compressionLevel = 6
      } = options;

      // Validate quality
      const validQuality = Math.max(this.MIN_QUALITY, Math.min(this.MAX_QUALITY, quality));

      // Get original metadata
      const originalMetadata = await sharp(buffer).metadata();
      const originalSize = buffer.length;

      // Create optimization pipeline
      let pipeline = sharp(buffer)
        .resize(width, height, {
          fit,
          position,
          withoutEnlargement: true,
          fastShrinkOnLoad: false
        })
        .strip(strip);

      // Apply format-specific optimizations
      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({
            quality: validQuality,
            progressive,
            effort: compressionLevel,
            smartSubsample: true,
            reductionEffort: compressionLevel
          });
          break;

        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: validQuality,
            progressive,
            mozjpeg: true,
            optimizeScans: true,
            trellisQuantisation: true,
            overshootDeringing: true
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality: validQuality,
            progressive,
            compressionLevel,
            adaptiveFiltering: true,
            palette: true,
            colors: 256
          });
          break;

        case 'avif':
          pipeline = pipeline.avif({
            quality: validQuality,
            effort: compressionLevel,
            chromaSubsampling: '4:2:0'
          });
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Process image
      const optimizedBuffer = await pipeline.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      const compressionRatio = ((originalSize - optimizedBuffer.length) / originalSize) * 100;

      const result: OptimizationResult = {
        originalSize,
        optimizedSize: optimizedBuffer.length,
        compressionRatio,
        format,
        dimensions: {
          width: optimizedMetadata.width || 0,
          height: optimizedMetadata.height || 0
        },
        optimizedBuffer,
        metadata: {
          format: optimizedMetadata.format || format,
          width: optimizedMetadata.width || 0,
          height: optimizedMetadata.height || 0,
          channels: optimizedMetadata.channels || 0,
          density: optimizedMetadata.density
        }
      };

      logger.info(`Image optimized: ${originalSize} → ${optimizedBuffer.length} bytes (${compressionRatio.toFixed(1)}% reduction)`);
      
      return result;

    } catch (error) {
      logger.error('Image optimization failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create responsive image variants
   */
  static async createResponsiveVariants(
    buffer: Buffer,
    sizes: number[] = [320, 640, 1024, 1920],
    options: ImageOptimizationOptions = {}
  ): Promise<{ [size: string]: OptimizationResult }> {
    const variants: { [size: string]: OptimizationResult } = {};

    for (const size of sizes) {
      try {
        const variant = await this.optimizeImage(buffer, {
          ...options,
          width: size,
          height: size,
          fit: 'cover'
        });

        variants[size.toString()] = variant;
        logger.info(`Created ${size}px variant: ${variant.optimizedSize} bytes`);

      } catch (error) {
        logger.warn(`Failed to create ${size}px variant:`, error instanceof Error ? error.message : String(error));
      }
    }

    return variants;
  }

  /**
   * Optimize for different use cases
   */
  static async optimizeForUseCase(
    buffer: Buffer,
    useCase: 'hero' | 'thumbnail' | 'avatar' | 'medical' | 'document'
  ): Promise<OptimizationResult> {
    const useCaseOptions: Record<string, ImageOptimizationOptions> = {
      hero: {
        quality: 85,
        format: 'webp',
        width: 1920,
        height: 1080,
        fit: 'cover',
        progressive: true
      },
      thumbnail: {
        quality: 75,
        format: 'webp',
        width: 300,
        height: 300,
        fit: 'cover'
      },
      avatar: {
        quality: 80,
        format: 'webp',
        width: 200,
        height: 200,
        fit: 'cover'
      },
      medical: {
        quality: 95,
        format: 'jpeg',
        progressive: true,
        strip: false // Preserve medical metadata
      },
      document: {
        quality: 90,
        format: 'jpeg',
        progressive: true
      }
    };

    const options = useCaseOptions[useCase] || useCaseOptions.hero;
    return this.optimizeImage(buffer, options);
  }

  /**
   * Get optimal format based on browser support and file size
   */
  static getOptimalFormat(
    userAgent?: string,
    originalFormat?: string
  ): 'webp' | 'jpeg' | 'png' | 'avif' {
    // Check for AVIF support (newest, best compression)
    if (userAgent?.includes('Chrome/') && userAgent.includes('Version/')) {
      return 'avif';
    }

    // Check for WebP support (good compression, wide support)
    if (userAgent?.includes('Chrome/') || 
        userAgent?.includes('Firefox/') || 
        userAgent?.includes('Safari/') ||
        userAgent?.includes('Edge/')) {
      return 'webp';
    }

    // Fallback to original format or JPEG
    return (originalFormat as any) || 'jpeg';
  }

  /**
   * Calculate optimal quality based on file size and target
   */
  static calculateOptimalQuality(
    originalSize: number,
    targetSize: number,
    currentQuality: number = 80
  ): number {
    if (originalSize <= targetSize) {
      return currentQuality;
    }

    const sizeRatio = targetSize / originalSize;
    const qualityReduction = (1 - sizeRatio) * 0.3; // Reduce quality by up to 30%
    const newQuality = Math.max(10, Math.min(95, currentQuality - (qualityReduction * 100)));

    return Math.round(newQuality);
  }

  /**
   * Get image metadata without processing
   */
  static async getImageMetadata(buffer: Buffer): Promise<{
    format: string;
    width: number;
    height: number;
    channels: number;
    density?: number;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(buffer).metadata();

      return {
        format: metadata.format || 'unknown',
        width: metadata.width || 0,
        height: metadata.height || 0,
        channels: metadata.channels || 0,
        density: metadata.density,
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false
      };

    } catch (error) {
      logger.error('Failed to get image metadata:', error instanceof Error ? error.message : String(error));
      throw new Error('Invalid image file');
    }
  }

  /**
   * Validate image file
   */
  static async validateImage(buffer: Buffer): Promise<{
    valid: boolean;
    format?: string;
    error?: string;
  }> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(buffer).metadata();

      if (!metadata.format || !metadata.width || !metadata.height) {
        return { valid: false, error: 'Invalid image format' };
      }

      // Check dimensions
      if (metadata.width > this.MAX_DIMENSION || metadata.height > this.MAX_DIMENSION) {
        return { valid: false, error: `Image too large: ${metadata.width}x${metadata.height}` };
      }

      // Check file size (max 50MB)
      if (buffer.length > 50 * 1024 * 1024) {
        return { valid: false, error: 'File too large (max 50MB)' };
      }

      return { valid: true, format: metadata.format };

    } catch (error) {
      return { valid: false, error: 'Invalid image file' };
    }
  }

  /**
   * Get Sharp instance with error handling
   */
  private static async getSharp(): Promise<any> {
    try {
      const sharp = require('sharp');
      return sharp;
    } catch (error) {
      logger.error('Sharp not installed. Install with: npm install sharp');
      throw new Error('Image optimization requires Sharp library. Install with: npm install sharp');
    }
  }
}

/**
 * Image Optimization Middleware
 * 
 * Middleware for automatic image optimization in API routes
 */
export class ImageOptimizationMiddleware {
  /**
   * Apply optimization to uploaded image
   */
  static async processUploadedImage(
    buffer: Buffer,
    fileName: string,
    useCase: 'hero' | 'thumbnail' | 'avatar' | 'medical' | 'document' = 'hero'
  ): Promise<OptimizationResult> {
    // Validate image first
    const validation = await ImageOptimizer.validateImage(buffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Get optimal format based on file name
    const originalFormat = validation.format;
    const optimalFormat = ImageOptimizer.getOptimalFormat(undefined, originalFormat);

    // Optimize for specific use case
    const result = await ImageOptimizer.optimizeForUseCase(buffer, useCase);
    
    logger.info(`Processed ${fileName}: ${result.originalSize} → ${result.optimizedSize} bytes`);
    
    return result;
  }

  /**
   * Create multiple variants for responsive images
   */
  static async createResponsiveSet(
    buffer: Buffer,
    fileName: string,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<{ [size: string]: OptimizationResult }> {
    const variants = await ImageOptimizer.createResponsiveVariants(buffer, sizes);
    
    logger.info(`Created ${Object.keys(variants).length} responsive variants for ${fileName}`);
    
    return variants;
  }
}
