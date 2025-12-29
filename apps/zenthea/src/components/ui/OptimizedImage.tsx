/**
 * Optimized Image Component for Zenthea
 * 
 * Enhanced Next.js Image component with automatic optimization,
 * responsive sizing, and CDN integration.
 */

'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { StaticImageManager, ImageOptimizationOptions, ImageUtils } from '@/lib/images/static-images';
import { cn } from '@/lib/utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  placeholder?: boolean;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  // Responsive image options
  responsive?: boolean;
  breakpoints?: number[];
  // Accessibility options
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  sizes,
  quality = 80,
  format,
  fit = 'cover',
  position = 'center',
  placeholder = false,
  fallback,
  loading = 'lazy',
  onLoad,
  onError,
  responsive = false,
  breakpoints = [320, 640, 1024, 1920],
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Get optimized image URL
  const optimizedSrc = StaticImageManager.getOptimizedImage(src, {
    width,
    height,
    quality,
    format: format || ImageUtils.getBestFormat(),
    fit,
    position
  });
  
  // Handle image load
  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);
  
  // Handle image error
  const handleError = useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);
  
  // Get fallback image
  const getFallbackSrc = () => {
    if (fallback) return fallback;
    if (width && height) {
      const aspectRatio = width / height;
      if (aspectRatio > 1.5) return StaticImageManager.getFallbackImage('hero');
      if (aspectRatio < 0.8) return StaticImageManager.getFallbackImage('avatar');
      return StaticImageManager.getFallbackImage('thumbnail');
    }
    return StaticImageManager.getFallbackImage('hero');
  };
  
  // Generate responsive srcset if needed
  const generateSrcSet = () => {
    if (!responsive) return undefined;
    return StaticImageManager.generateSrcSet(src, breakpoints, {
      quality,
      format: format || ImageUtils.getBestFormat(),
      fit,
      position
    });
  };
  
  // Get placeholder data
  const getPlaceholderData = () => {
    if (!placeholder) return undefined;
    return StaticImageManager.getLazyImage(src, {
      width,
      height,
      quality,
      format: format || ImageUtils.getBestFormat(),
      fit,
      position,
      placeholder: true
    });
  };
  
  const placeholderData = getPlaceholderData();
  const srcSet = generateSrcSet();
  const finalSrc = imageError ? getFallbackSrc() : optimizedSrc;
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? 'eager' : loading}
        sizes={sizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        placeholder={placeholderData?.blurDataURL ? 'blur' : undefined}
        blurDataURL={placeholderData?.blurDataURL}
        role={role}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        className={cn(
          'transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0',
          imageError && 'opacity-50'
        )}
        {...props}
      />
      
      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Specialized image components for common use cases
 */

// Hero Image Component
export interface HeroImageProps extends Omit<OptimizedImageProps, 'responsive' | 'breakpoints'> {
  title?: string;
  subtitle?: string;
  overlay?: boolean;
}

export function HeroImage({
  title,
  subtitle,
  overlay = true,
  className,
  ...props
}: HeroImageProps) {
  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        {...props}
        responsive
        breakpoints={[320, 640, 1024, 1920]}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="w-full h-full object-cover"
      />
      {overlay && (title || subtitle) && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            {title && <h1 className="text-4xl font-bold mb-4">{title}</h1>}
            {subtitle && <p className="text-xl">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar Image Component
export interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: number;
  name?: string;
  fallbackText?: string;
}

export function AvatarImage({
  size = 200,
  name,
  fallbackText,
  className,
  ...props
}: AvatarImageProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div className={cn('relative rounded-full overflow-hidden', className)}>
      <OptimizedImage
        {...props}
        width={size}
        height={size}
        fit="cover"
        quality={90}
        className="w-full h-full object-cover"
      />
      {!props.src && (name || fallbackText) && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
          {getInitials(name || fallbackText || 'U')}
        </div>
      )}
    </div>
  );
}

// Thumbnail Image Component
export interface ThumbnailImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  aspectRatio?: 'square' | 'video' | 'wide' | 'tall';
  hover?: boolean;
}

export function ThumbnailImage({
  aspectRatio = 'video',
  hover = true,
  className,
  ...props
}: ThumbnailImageProps) {
  const aspectRatios = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[16/9]',
    tall: 'aspect-[3/4]'
  };
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg',
      aspectRatios[aspectRatio],
      hover && 'group cursor-pointer',
      className
    )}>
      <OptimizedImage
        {...props}
        responsive
        breakpoints={[320, 640, 1024]}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={cn(
          'w-full h-full object-cover transition-transform duration-300',
          hover && 'group-hover:scale-105'
        )}
      />
    </div>
  );
}

// Medical Image Component (HIPAA Compliant)
export interface MedicalImageProps extends Omit<OptimizedImageProps, 'format' | 'quality'> {
  patientId?: string;
  studyId?: string;
  encrypted?: boolean;
  accessToken?: string;
  onAccessDenied?: () => void;
  onAuditLog?: (auditId: string) => void;
}

export function MedicalImage({
  patientId,
  studyId,
  encrypted = true,
  accessToken,
  onAccessDenied,
  onAuditLog,
  className,
  ...props
}: MedicalImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [auditId, setAuditId] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    if (onAuditLog && auditId) {
      onAuditLog(auditId);
    }
  }, [onAuditLog, auditId]);

  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
    if (onAccessDenied) {
      onAccessDenied();
    }
  }, [onAccessDenied]);

  // Generate secure medical image URL
  const getMedicalImageUrl = () => {
    if (!patientId || !studyId || !accessToken) {
      return props.src;
    }

    const params = new URLSearchParams();
    params.set('patientId', patientId);
    params.set('studyId', studyId);
    params.set('token', accessToken);
    params.set('encrypted', encrypted ? 'true' : 'false');
    
    return `${props.src}?${params.toString()}`;
  };

  return (
    <div className={cn('relative bg-gray-100', className)}>
      <OptimizedImage
        {...props}
        src={getMedicalImageUrl()}
        format="jpeg" // Lossless for medical accuracy
        quality={95}   // High quality for medical images
        className="w-full h-full object-contain"
        role="img"
        aria-label={`Medical image${patientId ? ` for patient ${patientId}` : ''}${studyId ? ` from study ${studyId}` : ''}`}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading medical image...</p>
          </div>
        </div>
      )}
      
      {/* Access denied state */}
      {imageError && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
          <div className="text-center text-red-600">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Access Denied</p>
            <p className="text-xs">Insufficient permissions to view this medical image</p>
          </div>
        </div>
      )}
      
      {/* Security indicators */}
      {encrypted && !imageError && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
          <span>🔒</span>
          <span>Encrypted</span>
        </div>
      )}
      
      {/* HIPAA compliance indicator */}
      {!imageError && (
        <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          HIPAA Compliant
        </div>
      )}
    </div>
  );
}
