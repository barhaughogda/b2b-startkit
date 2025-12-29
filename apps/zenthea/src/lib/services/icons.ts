/**
 * Service Icon Utilities
 * 
 * Provides utilities for handling service icons.
 * Supports curated Lucide icons and custom SVG uploads.
 */

import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Icon configuration types */
export type LucideIconConfig = {
  kind: 'lucide';
  name: string;
};

export type CustomSvgIconConfig = {
  kind: 'customSvg';
  url: string;
};

export type ServiceIcon = LucideIconConfig | CustomSvgIconConfig;

/**
 * Curated list of Lucide icons suitable for healthcare services
 * These are commonly used icons that work well for medical/wellness services
 */
export const CURATED_SERVICE_ICONS = [
  // Medical/Healthcare
  'Stethoscope',
  'Heart',
  'HeartPulse',
  'Thermometer',
  'Pill',
  'Syringe',
  'Activity',
  'Brain',
  'Eye',
  'Ear',
  'Bone',
  'Baby',
  'PersonStanding',
  
  // Wellness & Therapy
  'Smile',
  'Frown',
  'Meh',
  'HeartHandshake',
  'HandHeart',
  'Flower2',
  'Leaf',
  'Sun',
  'Moon',
  'CloudSun',
  
  // Appointments & Time
  'Calendar',
  'CalendarCheck',
  'CalendarClock',
  'Clock',
  'Timer',
  'Hourglass',
  
  // Communication & Support
  'MessageSquare',
  'Phone',
  'Video',
  'Users',
  'UserPlus',
  'Headphones',
  
  // General Medical
  'Clipboard',
  'ClipboardCheck',
  'FileText',
  'FileHeart',
  'Microscope',
  'FlaskConical',
  'TestTube2',
  'Scan',
  
  // Body & Movement
  'Dumbbell',
  'Footprints',
  'Hand',
  'Fingerprint',
  
  // Symbols
  'Cross',
  'Plus',
  'Star',
  'Shield',
  'ShieldCheck',
  'Award',
  'Sparkles',
] as const;

export type CuratedIconName = typeof CURATED_SERVICE_ICONS[number];

/**
 * Get a Lucide icon component by name
 * Returns undefined if the icon doesn't exist
 */
export function getLucideIcon(name: string): LucideIcon | undefined {
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return IconComponent;
}

/**
 * Check if an icon name is a valid Lucide icon
 */
export function isValidLucideIcon(name: string): boolean {
  return getLucideIcon(name) !== undefined;
}

/**
 * Check if an icon name is in the curated list
 */
export function isCuratedIcon(name: string): name is CuratedIconName {
  return CURATED_SERVICE_ICONS.includes(name as CuratedIconName);
}

/**
 * Get the default icon for a service (when none is specified)
 */
export function getDefaultServiceIcon(): LucideIconConfig {
  return { kind: 'lucide', name: 'Calendar' };
}

/**
 * Resolve icon configuration to a Lucide icon component
 * For custom SVG icons, returns undefined (caller should render the SVG directly)
 */
export function resolveIcon(icon: ServiceIcon | undefined): LucideIcon | undefined {
  if (!icon) {
    return getLucideIcon(getDefaultServiceIcon().name);
  }
  
  if (icon.kind === 'lucide') {
    return getLucideIcon(icon.name);
  }
  
  // Custom SVG icons are rendered separately
  return undefined;
}

/**
 * Check if icon is a custom SVG
 */
export function isCustomSvgIcon(icon: ServiceIcon | undefined): icon is CustomSvgIconConfig {
  return icon?.kind === 'customSvg';
}

/**
 * Check if icon is a Lucide icon
 */
export function isLucideIcon(icon: ServiceIcon | undefined): icon is LucideIconConfig {
  return icon?.kind === 'lucide';
}

/**
 * Get icon display info for UI
 */
export function getIconDisplayInfo(icon: ServiceIcon | undefined): {
  type: 'lucide' | 'custom' | 'default';
  name?: string;
  url?: string;
} {
  if (!icon) {
    return { type: 'default', name: 'Calendar' };
  }
  
  if (icon.kind === 'lucide') {
    return { type: 'lucide', name: icon.name };
  }
  
  return { type: 'custom', url: icon.url };
}

/**
 * Group curated icons by category for the icon picker UI
 */
export const ICON_CATEGORIES = {
  'Medical': [
    'Stethoscope', 'Heart', 'HeartPulse', 'Thermometer', 'Pill', 
    'Syringe', 'Activity', 'Brain', 'Eye', 'Ear', 'Bone', 'Baby', 'PersonStanding'
  ],
  'Wellness': [
    'Smile', 'Frown', 'Meh', 'HeartHandshake', 'HandHeart', 
    'Flower2', 'Leaf', 'Sun', 'Moon', 'CloudSun'
  ],
  'Scheduling': [
    'Calendar', 'CalendarCheck', 'CalendarClock', 'Clock', 'Timer', 'Hourglass'
  ],
  'Communication': [
    'MessageSquare', 'Phone', 'Video', 'Users', 'UserPlus', 'Headphones'
  ],
  'General': [
    'Clipboard', 'ClipboardCheck', 'FileText', 'FileHeart', 
    'Microscope', 'FlaskConical', 'TestTube2', 'Scan'
  ],
  'Movement': [
    'Dumbbell', 'Footprints', 'Hand', 'Fingerprint'
  ],
  'Symbols': [
    'Cross', 'Plus', 'Star', 'Shield', 'ShieldCheck', 'Award', 'Sparkles'
  ],
} as const;

