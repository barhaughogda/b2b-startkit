'use client';

import React from 'react';
import { TemplateRenderer, type TemplateRendererProps } from './TemplateRenderer';

/**
 * Bento Grid Template
 * 
 * A modern modular card-based layout with visual interest.
 * Best for: Modern clinics, tech-forward practices.
 * 
 * Recommended blocks order:
 * 1. Hero (compact)
 * 2. Trust Bar
 * 3. Services (grid layout)
 * 4. Care Team (grid layout)
 * 5. How It Works
 * 6. FAQ
 */
export function BentoGridTemplate(props: TemplateRendererProps) {
  return (
    <TemplateRenderer
      {...props}
      templateId="bento-grid"
    />
  );
}

export default BentoGridTemplate;
