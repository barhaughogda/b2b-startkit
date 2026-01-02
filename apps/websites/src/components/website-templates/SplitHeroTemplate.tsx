'use client';

import React from 'react';
import { TemplateRenderer, type TemplateRendererProps } from './TemplateRenderer';

/**
 * Split Hero Template
 * 
 * Copy on the left, visual/widget on the right layout.
 * Best for: Emphasizing booking widget, visual storytelling.
 * 
 * Recommended blocks order:
 * 1. Hero (split layout - headline left, image/widget right)
 * 2. Trust Bar
 * 3. Services
 * 4. How It Works
 * 5. Care Team
 * 6. FAQ
 * 7. Contact
 */
export function SplitHeroTemplate(props: TemplateRendererProps) {
  return (
    <TemplateRenderer
      {...props}
      templateId="split-hero"
    />
  );
}

export default SplitHeroTemplate;
