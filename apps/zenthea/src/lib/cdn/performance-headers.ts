/**
 * CDN Performance Headers and Caching Strategy
 * 
 * Enhanced CDN integration with optimized caching, compression,
 * and performance headers for better image delivery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface CacheStrategy {
  maxAge: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  immutable?: boolean;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  private?: boolean;
  public?: boolean;
}

export interface PerformanceHeaders {
  'Cache-Control': string;
  'Content-Encoding'?: string;
  'Content-Type': string;
  'ETag'?: string;
  'Last-Modified'?: string;
  'Vary'?: string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security'?: string;
  'X-HIPAA-Compliant'?: string;
  'X-Performance-Optimized'?: string;
}

export class CDNPerformanceManager {
  private static readonly CACHE_STRATEGIES = {
    // Static images - long-term caching
    staticImages: {
      maxAge: 31536000, // 1 year
      sMaxAge: 31536000,
      staleWhileRevalidate: 86400, // 1 day
      staleIfError: 604800, // 1 week
      immutable: true,
      public: true
    } as CacheStrategy,

    // Optimized images - long-term caching with revalidation
    optimizedImages: {
      maxAge: 2592000, // 30 days
      sMaxAge: 31536000, // 1 year
      staleWhileRevalidate: 86400, // 1 day
      staleIfError: 604800, // 1 week
      public: true
    } as CacheStrategy,

    // User-generated content - medium-term caching
    userContent: {
      maxAge: 86400, // 1 day
      sMaxAge: 604800, // 1 week
      staleWhileRevalidate: 3600, // 1 hour
      staleIfError: 86400, // 1 day
      public: true
    } as CacheStrategy,

    // Medical images - short-term caching with privacy
    medicalImages: {
      maxAge: 3600, // 1 hour
      sMaxAge: 86400, // 1 day
      staleWhileRevalidate: 1800, // 30 minutes
      staleIfError: 3600, // 1 hour
      private: true,
      mustRevalidate: true
    } as CacheStrategy,

    // API responses - no caching
    apiResponses: {
      noCache: true,
      noStore: true,
      mustRevalidate: true,
      private: true
    } as CacheStrategy
  };

  /**
   * Get cache strategy based on content type and path
   */
  static getCacheStrategy(
    contentType: string,
    path: string,
    isMedical: boolean = false
  ): CacheStrategy {
    // Medical content gets special handling
    if (isMedical || path.includes('/medical/')) {
      return this.CACHE_STRATEGIES.medicalImages;
    }

    // API responses should not be cached
    if (path.startsWith('/api/') && !path.includes('/serve-image')) {
      return this.CACHE_STRATEGIES.apiResponses;
    }

    // Static images (marketing, UI assets)
    if (path.includes('/images/') || path.includes('/assets/')) {
      return this.CACHE_STRATEGIES.staticImages;
    }

    // Optimized images (processed images)
    if (path.includes('/optimized/') || path.includes('/_next/static/')) {
      return this.CACHE_STRATEGIES.optimizedImages;
    }

    // User-generated content
    if (path.includes('/uploads/') || path.includes('/user-content/')) {
      return this.CACHE_STRATEGIES.userContent;
    }

    // Default to user content strategy
    return this.CACHE_STRATEGIES.userContent;
  }

  /**
   * Generate Cache-Control header
   */
  static generateCacheControlHeader(strategy: CacheStrategy): string {
    const directives: string[] = [];

    if (strategy.noCache) {
      directives.push('no-cache');
    }
    if (strategy.noStore) {
      directives.push('no-store');
    }
    if (strategy.private) {
      directives.push('private');
    }
    if (strategy.public) {
      directives.push('public');
    }
    if (strategy.mustRevalidate) {
      directives.push('must-revalidate');
    }
    if (strategy.immutable) {
      directives.push('immutable');
    }

    if (strategy.maxAge !== undefined) {
      directives.push(`max-age=${strategy.maxAge}`);
    }
    if (strategy.sMaxAge !== undefined) {
      directives.push(`s-maxage=${strategy.sMaxAge}`);
    }
    if (strategy.staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${strategy.staleWhileRevalidate}`);
    }
    if (strategy.staleIfError !== undefined) {
      directives.push(`stale-if-error=${strategy.staleIfError}`);
    }

    return directives.join(', ');
  }

  /**
   * Generate comprehensive performance headers
   */
  static generatePerformanceHeaders(
    contentType: string,
    path: string,
    options: {
      isMedical?: boolean;
      isOptimized?: boolean;
      compression?: 'gzip' | 'brotli' | 'deflate';
      etag?: string;
      lastModified?: string;
      contentLength?: number;
    } = {}
  ): PerformanceHeaders {
    const strategy = this.getCacheStrategy(contentType, path, options.isMedical);
    const cacheControl = this.generateCacheControlHeader(strategy);

    const headers: PerformanceHeaders = {
      'Cache-Control': cacheControl,
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };

    // Add compression header if specified
    if (options.compression) {
      headers['Content-Encoding'] = options.compression;
    }

    // Add ETag for cache validation
    if (options.etag) {
      headers['ETag'] = options.etag;
    }

    // Add Last-Modified for cache validation
    if (options.lastModified) {
      headers['Last-Modified'] = options.lastModified;
    }

    // Add Vary header for proper caching
    const varyHeaders = ['Accept-Encoding'];
    if (contentType.startsWith('image/')) {
      varyHeaders.push('Accept');
    }
    headers['Vary'] = varyHeaders.join(', ');

    // Add security headers for HTTPS
    if (process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // Add HIPAA compliance header for medical content
    if (options.isMedical) {
      headers['X-HIPAA-Compliant'] = 'true';
    }

    // Add performance optimization header
    if (options.isOptimized) {
      headers['X-Performance-Optimized'] = 'true';
    }

    return headers;
  }

  /**
   * Apply performance headers to response
   */
  static applyPerformanceHeaders(
    response: NextResponse,
    contentType: string,
    path: string,
    options: {
      isMedical?: boolean;
      isOptimized?: boolean;
      compression?: 'gzip' | 'brotli' | 'deflate';
      etag?: string;
      lastModified?: string;
    } = {}
  ): NextResponse {
    const headers = this.generatePerformanceHeaders(contentType, path, options);

    // Apply all headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * Generate ETag for cache validation
   */
  static generateETag(buffer: Buffer, lastModified?: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const timestamp = lastModified ? new Date(lastModified).getTime() : Date.now();
    return `"${hash}-${timestamp}"`;
  }

  /**
   * Check if request has valid cache headers
   */
  static isCacheValid(
    request: NextRequest,
    etag: string,
    lastModified: string
  ): { valid: boolean; reason?: string } {
    const ifNoneMatch = request.headers.get('if-none-match');
    const ifModifiedSince = request.headers.get('if-modified-since');

    // Check ETag
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { valid: true, reason: 'ETag match' };
    }

    // Check Last-Modified
    if (ifModifiedSince) {
      const requestTime = new Date(ifModifiedSince).getTime();
      const resourceTime = new Date(lastModified).getTime();
      
      if (requestTime >= resourceTime) {
        return { valid: true, reason: 'Not modified since requested time' };
      }
    }

    return { valid: false };
  }

  /**
   * Get optimal compression based on request headers
   */
  static getOptimalCompression(request: NextRequest): 'gzip' | 'brotli' | 'deflate' | null {
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    
    // Brotli has best compression but limited support
    if (acceptEncoding.includes('br')) {
      return 'brotli';
    }
    
    // Gzip is widely supported
    if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    }
    
    // Deflate as fallback
    if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    }
    
    return null;
  }

  /**
   * Compress content based on optimal compression
   */
  static async compressContent(
    buffer: Buffer,
    compression: 'gzip' | 'brotli' | 'deflate'
  ): Promise<{ compressed: Buffer; ratio: number }> {
    const zlib = require('zlib');
    
    return new Promise((resolve, reject) => {
      const compress = compression === 'gzip' ? zlib.gzip : 
                     compression === 'brotli' ? zlib.brotliCompress : 
                     zlib.deflate;
      
      compress(buffer, (error: Error | null, compressed: Buffer) => {
        if (error) {
          reject(error);
        } else {
          const ratio = ((buffer.length - compressed.length) / buffer.length) * 100;
          resolve({ compressed, ratio });
        }
      });
    });
  }

  /**
   * Get CDN-optimized image URL
   */
  static getCDNImageUrl(
    baseUrl: string,
    path: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      fit?: string;
    } = {}
  ): string {
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.zenthea.com';
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('fit', options.fit);
    
    const queryString = params.toString();
    return `${cdnBase}${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Log performance metrics
   */
  static logPerformanceMetrics(
    operation: string,
    metrics: {
      duration: number;
      size: number;
      compression?: number;
      cacheHit?: boolean;
    }
  ): void {
    const { duration, size, compression, cacheHit } = metrics;
    
    logger.info(`Performance: ${operation}`, JSON.stringify({
      duration: `${duration}ms`,
      size: `${(size / 1024).toFixed(2)}KB`,
      compression: compression ? `${compression.toFixed(1)}%` : 'N/A',
      cacheHit: cacheHit ? 'HIT' : 'MISS',
      throughput: `${(size / (duration / 1000) / 1024).toFixed(2)}KB/s`
    }));
  }
}
