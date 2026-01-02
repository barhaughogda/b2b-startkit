/**
 * Cloudinary Configuration for Zenthea
 *
 * Handles public and marketing images via Cloudinary CDN
 * with automatic optimization and transformations.
 */

// Cloudinary cloud name from environment
export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

/**
 * Validate Cloudinary configuration
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME);
}

/**
 * Common transformation presets for marketing images
 */
export const CloudinaryPresets = {
  // Hero images - large, high quality
  hero: {
    width: 1920,
    height: 1080,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    quality: 'auto:best' as const,
    format: 'auto' as const,
  },

  // Feature section images
  feature: {
    width: 800,
    height: 600,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    quality: 'auto:good' as const,
    format: 'auto' as const,
  },

  // Testimonial/team photos
  avatar: {
    width: 200,
    height: 200,
    crop: 'thumb' as const,
    gravity: 'face' as const,
    quality: 'auto:good' as const,
    format: 'auto' as const,
  },

  // Card thumbnails
  thumbnail: {
    width: 400,
    height: 300,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    quality: 'auto:eco' as const,
    format: 'auto' as const,
  },

  // Logo/icon images
  logo: {
    width: 400,
    height: 100,
    crop: 'fit' as const,
    quality: 'auto:best' as const,
    format: 'auto' as const,
  },

  // Open Graph / Social sharing
  og: {
    width: 1200,
    height: 630,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    quality: 'auto:good' as const,
    format: 'auto' as const,
  },
} as const;

export type CloudinaryPresetName = keyof typeof CloudinaryPresets;

/**
 * Build a Cloudinary URL manually (for non-component usage)
 */
export function buildCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    gravity?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary cloud name not configured');
    return publicId;
  }

  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.gravity) transformations.push(`g_${options.gravity}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);

  const transformationString =
    transformations.length > 0 ? `${transformations.join(',')}/` : '';

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}${publicId}`;
}

/**
 * Build URL using a preset
 */
export function buildCloudinaryUrlWithPreset(
  publicId: string,
  preset: CloudinaryPresetName
): string {
  return buildCloudinaryUrl(publicId, CloudinaryPresets[preset]);
}

/**
 * Common marketing image public IDs
 * Update these with your actual Cloudinary public IDs
 */
export const MarketingImages = {
  // Landing page
  heroMain: 'zenthea/marketing/hero-main',
  heroSecondary: 'zenthea/marketing/hero-secondary',

  // Features section
  featureScheduling: 'zenthea/marketing/feature-scheduling',
  featurePatientPortal: 'zenthea/marketing/feature-patient-portal',
  featureTelehealth: 'zenthea/marketing/feature-telehealth',
  featureAnalytics: 'zenthea/marketing/feature-analytics',

  // About/Team
  teamPhoto: 'zenthea/marketing/team-photo',

  // Logos
  logoFull: 'zenthea/brand/logo-full',
  logoIcon: 'zenthea/brand/logo-icon',
  logoWhite: 'zenthea/brand/logo-white',

  // Social sharing
  ogDefault: 'zenthea/marketing/og-default',
} as const;

export type MarketingImageKey = keyof typeof MarketingImages;

