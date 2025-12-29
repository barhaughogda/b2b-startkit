'use client';

import React from 'react';
import { TemplateRenderer, type TemplateRendererProps } from './TemplateRenderer';

/**
 * Classic Stacked Template
 * 
 * A conversion-focused landing page with vertically stacked sections.
 * Best for: Single-location clinics, conversion-focused pages.
 * 
 * Recommended blocks order:
 * 1. Hero (with strong CTA)
 * 2. Trust Bar
 * 3. Services
 * 4. Care Team
 * 5. Testimonials
 * 6. Contact
 * 7. CTA Band
 */
export function ClassicStackedTemplate(props: TemplateRendererProps) {
  return (
    <TemplateRenderer
      {...props}
      templateId="classic-stacked"
    />
  );
}

export default ClassicStackedTemplate;
