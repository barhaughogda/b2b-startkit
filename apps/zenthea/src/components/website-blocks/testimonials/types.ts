/**
 * Shared types for testimonial layout components
 */

import type { TestimonialItem, ThemeConfig, BlockAppearance } from '@/lib/website-builder/schema';

export interface TestimonialLayoutProps {
  testimonials: TestimonialItem[];
  maxVisible: number;
  theme?: Partial<ThemeConfig>;
  appearance?: BlockAppearance;
  isPreview?: boolean;
}

export type { TestimonialItem };
