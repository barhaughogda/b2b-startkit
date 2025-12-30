/**
 * Static Image Manager for Zenthea
 * 
 * Handles CDN-based image optimization and responsive image generation
 * for static marketing and UI assets.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface ResponsiveImageSet {
  src: string;
  width: number;
  media: string;
}

export class StaticImageManager {
  private static readonly CDN_BASE = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.zenthea.com';
  private static readonly FALLBACK_BASE = '/images';
  private static readonly DEFAULT_QUALITY = 80;
  private static readonly DEFAULT_FORMAT = 'webp';
  
  /**
   * Get optimized image URL with CDN parameters
   */
  static getOptimizedImage(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const {
      width,
      height,
      quality = this.DEFAULT_QUALITY,
      format = this.DEFAULT_FORMAT,
      fit = 'cover',
      position = 'center'
    } = options;
    
    // Use CDN for external images, fallback for local images
    const baseUrl = src.startsWith('http') ? this.CDN_BASE : this.FALLBACK_BASE;
    const imagePath = src.startsWith('http') ? new URL(src).pathname : src;
    
    // CDN URL with optimization parameters
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    params.set('f', format);
    params.set('fit', fit);
    params.set('pos', position);
    
    return `${baseUrl}${imagePath}?${params.toString()}`;
  }
  
  /**
   * Generate responsive image set for different screen sizes
   */
  static getResponsiveImageSet(
    baseSrc: string,
    sizes: number[] = [320, 640, 1024, 1920]
  ): ResponsiveImageSet[] {
    return sizes.map((width, index) => ({
      src: this.getOptimizedImage(baseSrc, { width }),
      width,
      media: index === 0 
        ? '(min-width: 0px)' 
        : `(min-width: ${(sizes[index - 1] ?? 0) + 1}px)`
    }));
  }
  
  /**
   * Get hero image with multiple formats for better browser support
   */
  static getHeroImageSet(baseSrc: string): {
    webp: string;
    jpeg: string;
    avif: string;
  } {
    return {
      webp: this.getOptimizedImage(baseSrc, { format: 'webp', quality: 85 }),
      jpeg: this.getOptimizedImage(baseSrc, { format: 'jpeg', quality: 90 }),
      avif: this.getOptimizedImage(baseSrc, { format: 'avif', quality: 80 })
    };
  }
  
  /**
   * Get avatar image with consistent sizing
   */
  static getAvatarImage(
    src: string,
    size: number = 200,
    quality: number = 90
  ): string {
    return this.getOptimizedImage(src, {
      width: size,
      height: size,
      quality,
      fit: 'cover'
    });
  }
  
  /**
   * Get thumbnail image for cards and previews
   */
  static getThumbnailImage(
    src: string,
    width: number = 400,
    height: number = 300,
    quality: number = 75
  ): string {
    return this.getOptimizedImage(src, {
      width,
      height,
      quality,
      fit: 'cover'
    });
  }
  
  /**
   * Get medical image with HIPAA-compliant settings
   */
  static getMedicalImage(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    return this.getOptimizedImage(src, {
      format: 'jpeg', // Lossless for medical accuracy
      quality: 95,    // High quality for medical images
      ...options
    });
  }
  
  /**
   * Check if image is from CDN
   */
  static isCDNImage(src: string): boolean {
    return src.startsWith(this.CDN_BASE);
  }
  
  /**
   * Get fallback image for broken images
   */
  static getFallbackImage(type: 'avatar' | 'hero' | 'thumbnail' = 'hero'): string {
    const fallbackImages = {
      avatar: '/images/fallback-avatar.jpg',
      hero: '/images/fallback-hero.jpg',
      thumbnail: '/images/fallback-thumbnail.jpg'
    };
    
    return fallbackImages[type];
  }
  
  /**
   * Generate srcset string for responsive images
   */
  static generateSrcSet(
    baseSrc: string,
    sizes: number[],
    options: Omit<ImageOptimizationOptions, 'width'> = {}
  ): string {
    return sizes
      .map(size => {
        const src = this.getOptimizedImage(baseSrc, { ...options, width: size });
        return `${src} ${size}w`;
      })
      .join(', ');
  }
  
  /**
   * Get optimized image with lazy loading support
   */
  static getLazyImage(
    src: string,
    options: ImageOptimizationOptions & { placeholder?: boolean } = {}
  ): {
    src: string;
    placeholder?: string;
    blurDataURL?: string;
  } {
    const { placeholder = false, ...imageOptions } = options;
    
    const result: any = {
      src: this.getOptimizedImage(src, imageOptions)
    };
    
    if (placeholder) {
      // Generate a low-quality placeholder
      result.placeholder = this.getOptimizedImage(src, {
        ...imageOptions,
        quality: 10,
        width: 20
      });
      
      // Generate base64 blur data URL for smooth loading
      result.blurDataURL = this.generateBlurDataURL();
    }
    
    return result;
  }
  
  /**
   * Generate a simple blur data URL for loading states
   */
  private static generateBlurDataURL(): string {
    // Simple 1x1 transparent pixel as base64
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }
}

/**
 * Utility functions for common image operations
 */
export const ImageUtils = {
  /**
   * Check if image format is supported by browser
   */
  supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  /**
   * Check if image format is supported by browser
   */
  supportsAVIF(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  },
  
  /**
   * Get best format for current browser
   */
  getBestFormat(): 'avif' | 'webp' | 'jpeg' {
    if (this.supportsAVIF()) return 'avif';
    if (this.supportsWebP()) return 'webp';
    return 'jpeg';
  },
  
  /**
   * Validate image URL
   */
  isValidImageUrl(url: string): boolean {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url);
    } catch {
      return false;
    }
  },
  
  /**
   * Get image dimensions from URL (for external images)
   */
  async getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
};
