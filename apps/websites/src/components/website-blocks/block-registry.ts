'use client';

/**
 * Block Registry
 * 
 * Central registry for all website builder blocks.
 * Provides metadata, components, and configuration schemas for each block type.
 */

import { ComponentType } from 'react';
import { 
  type BlockType, 
  type BlockProps, 
  type BlockInstance,
  type BlockAppearance,
  type ThemeConfig,
  blockMetadata,
  getBlockPropsSchema,
} from '@/lib/website-builder/schema';
import { z } from 'zod';

// =============================================================================
// BLOCK COMPONENT TYPES
// =============================================================================

export interface BlockComponentProps<T extends BlockProps = BlockProps> {
  /** Block configuration props */
  props: T;
  /** Tenant ID for data fetching */
  tenantId: string;
  /** Whether in preview/edit mode */
  isPreview?: boolean;
  /** Block ID for unique identification */
  blockId: string;
  /** Theme context */
  theme?: Partial<ThemeConfig>;
  /** Tenant data for display */
  tenantData?: {
    name: string;
    id?: string;
    contactInfo?: {
      phone: string;
      email: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
      };
    };
  };
  /** Booking URL for CTA links (tenant-specific, e.g., /clinic/[slug]/book) */
  bookUrl?: string;
  /** Appearance configuration for per-block styling overrides */
  appearance?: BlockAppearance;
}

// Lazy-loaded component type
export type LazyBlockComponent<T extends BlockProps = BlockProps> = 
  ComponentType<BlockComponentProps<T>>;

// =============================================================================
// BLOCK REGISTRY ENTRY
// =============================================================================

export interface BlockRegistryEntry {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: 'required' | 'recommended';
  // Lazy-loaded component - uses any to allow different block prop types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: () => Promise<{ default: ComponentType<any> }>;
  // Props schema for validation
  propsSchema: z.ZodSchema;
  // Default props
  defaultProps: Record<string, unknown>;
  // Editor component for block configuration
  editorComponent?: () => Promise<{ default: ComponentType<BlockEditorProps> }>;
}

export interface BlockEditorProps {
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
  tenantId: string;
}

// =============================================================================
// BLOCK REGISTRY
// =============================================================================

/**
 * Block Registry
 * 
 * Maps block types to their components, schemas, and metadata.
 * Components are lazily loaded for performance.
 */
export const blockRegistry: Record<BlockType, BlockRegistryEntry> = {
  'hero': {
    type: 'hero',
    ...blockMetadata['hero'],
    component: () => import('./HeroBlock'),
    propsSchema: getBlockPropsSchema('hero'),
    defaultProps: blockMetadata['hero'].defaultProps,
    editorComponent: () => import('./editors/HeroBlockEditor'),
  },
  'care-team': {
    type: 'care-team',
    ...blockMetadata['care-team'],
    component: () => import('./CareTeamBlock'),
    propsSchema: getBlockPropsSchema('care-team'),
    defaultProps: blockMetadata['care-team'].defaultProps,
    editorComponent: () => import('./editors/CareTeamBlockEditor'),
  },
  'clinics': {
    type: 'clinics',
    ...blockMetadata['clinics'],
    component: () => import('./ClinicsBlock'),
    propsSchema: getBlockPropsSchema('clinics'),
    defaultProps: blockMetadata['clinics'].defaultProps,
    editorComponent: () => import('./editors/ClinicsBlockEditor'),
  },
  'services': {
    type: 'services',
    ...blockMetadata['services'],
    component: () => import('./ServicesBlock'),
    propsSchema: getBlockPropsSchema('services'),
    defaultProps: blockMetadata['services'].defaultProps,
    editorComponent: () => import('./editors/ServicesBlockEditor'),
  },
  'trust-bar': {
    type: 'trust-bar',
    ...blockMetadata['trust-bar'],
    component: () => import('./TrustBarBlock'),
    propsSchema: getBlockPropsSchema('trust-bar'),
    defaultProps: blockMetadata['trust-bar'].defaultProps,
    editorComponent: () => import('./editors/TrustBarBlockEditor'),
  },
  'how-it-works': {
    type: 'how-it-works',
    ...blockMetadata['how-it-works'],
    component: () => import('./HowItWorksBlock'),
    propsSchema: getBlockPropsSchema('how-it-works'),
    defaultProps: blockMetadata['how-it-works'].defaultProps,
    // Editor integrated directly into BlockConfigPanel via HowItWorksContentConfigForm
  },
  'testimonials': {
    type: 'testimonials',
    ...blockMetadata['testimonials'],
    component: () => import('./TestimonialsBlock'),
    propsSchema: getBlockPropsSchema('testimonials'),
    defaultProps: blockMetadata['testimonials'].defaultProps,
    editorComponent: () => import('./editors/TestimonialsBlockEditor'),
  },
  'faq': {
    type: 'faq',
    ...blockMetadata['faq'],
    component: () => import('./FAQBlock'),
    propsSchema: getBlockPropsSchema('faq'),
    defaultProps: blockMetadata['faq'].defaultProps,
    editorComponent: () => import('./editors/FAQBlockEditor'),
  },
  'contact': {
    type: 'contact',
    ...blockMetadata['contact'],
    component: () => import('./ContactBlock'),
    propsSchema: getBlockPropsSchema('contact'),
    defaultProps: blockMetadata['contact'].defaultProps,
    editorComponent: () => import('./editors/ContactBlockEditor'),
  },
  'cta-band': {
    type: 'cta-band',
    ...blockMetadata['cta-band'],
    component: () => import('./CTABandBlock'),
    propsSchema: getBlockPropsSchema('cta-band'),
    defaultProps: blockMetadata['cta-band'].defaultProps,
    editorComponent: () => import('./editors/CTABandBlockEditor'),
  },
  'custom-text': {
    type: 'custom-text',
    ...blockMetadata['custom-text'],
    component: () => import('./CustomTextBlock'),
    propsSchema: getBlockPropsSchema('custom-text'),
    defaultProps: blockMetadata['custom-text'].defaultProps,
    editorComponent: () => import('./editors/CustomTextBlockEditor'),
  },
  'photo-text': {
    type: 'photo-text',
    ...blockMetadata['photo-text'],
    component: () => import('./PhotoTextBlock'),
    propsSchema: getBlockPropsSchema('photo-text'),
    defaultProps: blockMetadata['photo-text'].defaultProps,
  },
  'media': {
    type: 'media',
    ...blockMetadata['media'],
    component: () => import('./MediaBlock'),
    propsSchema: getBlockPropsSchema('media'),
    defaultProps: blockMetadata['media'].defaultProps,
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get block entry from registry
 */
export function getBlockEntry(type: BlockType): BlockRegistryEntry {
  const entry = blockRegistry[type];
  if (!entry) {
    throw new Error(`Block type "${type}" not found in registry`);
  }
  return entry;
}

/**
 * Get all blocks by category
 */
export function getBlocksByCategory(category: 'required' | 'recommended'): BlockRegistryEntry[] {
  return Object.values(blockRegistry).filter((entry) => entry.category === category);
}

/**
 * Get all available block types
 */
export function getAvailableBlockTypes(): BlockType[] {
  return Object.keys(blockRegistry) as BlockType[];
}

/**
 * Validate block props
 */
export function validateBlockProps(
  type: BlockType, 
  props: Record<string, unknown>
): { valid: boolean; errors?: string[] } {
  const entry = getBlockEntry(type);
  const result = entry.propsSchema.safeParse(props);
  
  if (result.success) {
    return { valid: true };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Get default props for a block type
 */
export function getDefaultBlockProps(type: BlockType): Record<string, unknown> {
  return getBlockEntry(type).defaultProps;
}

/**
 * Create a new block instance
 */
export function createBlock(
  type: BlockType, 
  customProps?: Partial<Record<string, unknown>>,
  appearance?: BlockAppearance
): BlockInstance {
  const defaultProps = getDefaultBlockProps(type);
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    enabled: true,
    props: { ...defaultProps, ...customProps },
    appearance,
  };
}
