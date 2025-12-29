/**
 * Hero Image Upload Utility
 * 
 * Provides easy-to-use functions for uploading hero images
 * with proper error handling and progress tracking
 */

import { logger } from '@/lib/logger';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export class HeroImageUploader {
  /**
   * Upload hero image with progress tracking
   */
  static async uploadHeroImage(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                logger.info('Hero image uploaded successfully', JSON.stringify({
                  url: response.url,
                  key: response.key
                }));
                resolve({
                  success: true,
                  url: response.url,
                  key: response.key
                });
              } else {
                resolve({
                  success: false,
                  error: response.error || 'Upload failed'
                });
              }
            } catch (error) {
              resolve({
                success: false,
                error: 'Invalid response from server'
              });
            }
          } else {
            resolve({
              success: false,
              error: `Upload failed with status ${xhr.status}`
            });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Network error during upload'
          });
        });

        xhr.open('POST', '/api/upload-hero-image');
        xhr.send(formData);
      });

    } catch (error) {
      logger.error('Hero image upload error', JSON.stringify({ error }));
      return {
        success: false,
        error: 'Upload failed due to an unexpected error'
      };
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }

    // Check minimum size (at least 100KB)
    const minSize = 100 * 1024; // 100KB
    if (file.size < minSize) {
      return {
        valid: false,
        error: 'File too small. Minimum size is 100KB.'
      };
    }

    return { valid: true };
  }

  /**
   * Get optimized image URL for display
   */
  static getOptimizedImageUrl(s3Url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'avif';
  } = {}): string {
    const { width, height, quality = 85, format = 'webp' } = options;
    
    // If using CloudFront, add optimization parameters
    if (s3Url.includes('cloudfront.net') || s3Url.includes('cdn.zenthea.com')) {
      const params = new URLSearchParams();
      if (width) params.set('w', width.toString());
      if (height) params.set('h', height.toString());
      params.set('q', quality.toString());
      params.set('f', format);
      
      return `${s3Url}?${params.toString()}`;
    }
    
    return s3Url;
  }

  /**
   * Generate responsive image URLs for different screen sizes
   */
  static getResponsiveImageUrls(baseUrl: string): {
    mobile: string;
    tablet: string;
    desktop: string;
    large: string;
  } {
    return {
      mobile: this.getOptimizedImageUrl(baseUrl, { width: 640, quality: 80 }),
      tablet: this.getOptimizedImageUrl(baseUrl, { width: 1024, quality: 85 }),
      desktop: this.getOptimizedImageUrl(baseUrl, { width: 1920, quality: 90 }),
      large: this.getOptimizedImageUrl(baseUrl, { width: 2560, quality: 95 })
    };
  }
}
