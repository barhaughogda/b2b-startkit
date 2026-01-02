'use client';

// @ts-ignore - next-cloudinary types may not be available in all environments
import { CldImage, CldOgImage } from 'next-cloudinary';
import {
  CloudinaryPresets,
  type CloudinaryPresetName,
  MarketingImages,
  type MarketingImageKey,
  isCloudinaryConfigured,
} from '@/lib/images/cloudinary';
import Image from 'next/image';

/**
 * Type helper for preset configs that may have an optional gravity property
 */
type PresetConfig = typeof CloudinaryPresets[CloudinaryPresetName];
type PresetWithGravity = PresetConfig & { gravity: string };

interface CloudinaryImageProps {
  /** Cloudinary public ID or a key from MarketingImages */
  src: string | MarketingImageKey;
  alt: string;
  /** Use a preset or provide custom dimensions */
  preset?: CloudinaryPresetName;
  width?: number;
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Priority loading for above-the-fold images */
  priority?: boolean;
  /** Fill container (requires parent to have position) */
  fill?: boolean;
  /** Object fit when using fill */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Custom Cloudinary transformations */
  crop?: 'fill' | 'fit' | 'thumb' | 'scale' | 'crop' | 'pad';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
  /** Placeholder for loading state */
  placeholder?: 'blur' | 'empty';
}

/**
 * CloudinaryImage - Optimized image component for marketing/public images
 *
 * Uses Cloudinary CDN for automatic optimization, responsive images,
 * and format negotiation.
 *
 * @example
 * // Using a preset
 * <CloudinaryImage
 *   src="heroMain"
 *   alt="Zenthea Healthcare Platform"
 *   preset="hero"
 *   priority
 * />
 *
 * @example
 * // Using custom dimensions
 * <CloudinaryImage
 *   src="zenthea/custom/my-image"
 *   alt="Custom image"
 *   width={600}
 *   height={400}
 * />
 *
 * @example
 * // Fill container
 * <div className="relative h-[400px]">
 *   <CloudinaryImage
 *     src="featureScheduling"
 *     alt="Scheduling feature"
 *     fill
 *     objectFit="cover"
 *   />
 * </div>
 */
export function CloudinaryImage({
  src,
  alt,
  preset,
  width,
  height,
  className,
  priority = false,
  fill = false,
  objectFit = 'cover',
  sizes,
  crop,
  gravity,
  quality,
  format,
  placeholder = 'empty',
}: CloudinaryImageProps) {
  // Resolve marketing image keys to public IDs
  const publicId =
    src in MarketingImages
      ? MarketingImages[src as MarketingImageKey]
      : src;

  // Get preset configuration if specified
  const presetConfig = preset ? CloudinaryPresets[preset] : undefined;

  // Merge preset with explicit props (explicit props take precedence)
  const finalWidth = width ?? presetConfig?.width;
  const finalHeight = height ?? presetConfig?.height;
  const finalCrop = crop ?? presetConfig?.crop;
  // gravity is optional in some presets (e.g., logo), so we need to check for its existence
  const presetGravity = presetConfig && 'gravity' in presetConfig 
    ? (presetConfig as PresetWithGravity).gravity 
    : undefined;
  const finalGravity = gravity ?? presetGravity;
  const finalQuality = quality ?? presetConfig?.quality ?? 'auto';
  const finalFormat = format ?? presetConfig?.format ?? 'auto';

  // Fallback to Next.js Image if Cloudinary is not configured
  if (!isCloudinaryConfigured()) {
    return (
      <Image
        src={`/images/${publicId}`}
        alt={alt}
        width={fill ? undefined : (finalWidth ?? 800)}
        height={fill ? undefined : (finalHeight ?? 600)}
        fill={fill}
        className={className}
        priority={priority}
        style={fill ? { objectFit } : undefined}
        sizes={sizes}
      />
    );
  }

  return (
    <CldImage
      src={publicId}
      alt={alt}
      width={fill ? undefined : (finalWidth ?? 800)}
      height={fill ? undefined : (finalHeight ?? 600)}
      fill={fill}
      className={className}
      priority={priority}
      sizes={sizes ?? (fill ? '100vw' : undefined)}
      crop={finalCrop}
      gravity={finalGravity}
      quality={finalQuality}
      format={finalFormat}
      placeholder={placeholder}
      style={fill ? { objectFit } : undefined}
    />
  );
}

interface CloudinaryOgImageProps {
  /** Cloudinary public ID or a key from MarketingImages */
  src?: string | MarketingImageKey;
  /** Custom title overlay */
  title?: string;
  /** Custom subtitle overlay */
  subtitle?: string;
}

/**
 * CloudinaryOgImage - Open Graph image for social sharing
 *
 * Automatically generates optimized social sharing images.
 * Should be placed in page metadata.
 *
 * @example
 * // In a page component
 * <CloudinaryOgImage
 *   src="ogDefault"
 *   title="Zenthea Healthcare"
 *   subtitle="Modern EHR Platform"
 * />
 */
export function CloudinaryOgImage({
  src = 'ogDefault',
  title,
  subtitle,
}: CloudinaryOgImageProps) {
  // Resolve marketing image keys to public IDs
  const publicId =
    src in MarketingImages
      ? MarketingImages[src as MarketingImageKey]
      : src;

  const overlays: Array<{
    text: { text: string; fontFamily: string; fontSize: number; fontWeight: string; color: string };
    position: { y: number; gravity: string };
  }> = [];

  if (title) {
    overlays.push({
      text: {
        text: title,
        fontFamily: 'Inter',
        fontSize: 64,
        fontWeight: 'bold',
        color: 'white',
      },
      position: {
        y: -50,
        gravity: 'center',
      },
    });
  }

  if (subtitle) {
    overlays.push({
      text: {
        text: subtitle,
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: 'normal',
        color: 'white',
      },
      position: {
        y: 50,
        gravity: 'center',
      },
    });
  }

  if (!isCloudinaryConfigured()) {
    return null;
  }

  // Generate alt text from title/subtitle or use default
  const altText = title && subtitle
    ? `${title} - ${subtitle}`
    : title || subtitle || 'Zenthea Healthcare Platform';

  return (
    <CldOgImage
      src={publicId}
      alt={altText}
      overlays={overlays.length > 0 ? overlays : undefined}
    />
  );
}

/**
 * Hook to get Cloudinary image URL for non-component usage
 */
export function useCloudinaryUrl(
  src: string | MarketingImageKey,
  preset?: CloudinaryPresetName
) {
  const publicId =
    src in MarketingImages
      ? MarketingImages[src as MarketingImageKey]
      : src;

  const presetConfig = preset ? CloudinaryPresets[preset] : undefined;

  if (!isCloudinaryConfigured()) {
    return `/images/${publicId}`;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const transformations: string[] = [];

  if (presetConfig) {
    if (presetConfig.width) transformations.push(`w_${presetConfig.width}`);
    if (presetConfig.height) transformations.push(`h_${presetConfig.height}`);
    if (presetConfig.crop) transformations.push(`c_${presetConfig.crop}`);
    // gravity is optional in some presets (e.g., logo), so we need to check for its existence
    if ('gravity' in presetConfig && presetConfig.gravity) {
      transformations.push(`g_${(presetConfig as PresetWithGravity).gravity}`);
    }
    if (presetConfig.quality) transformations.push(`q_${presetConfig.quality}`);
    if (presetConfig.format) transformations.push(`f_${presetConfig.format}`);
  }

  const transformationString =
    transformations.length > 0 ? `${transformations.join(',')}/` : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicId}`;
}

