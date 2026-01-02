'use client';

import React from 'react';
import { TemplateRenderer, type TemplateRendererProps } from './TemplateRenderer';

/**
 * Multi-Location Template
 * 
 * Clinic finder prioritized layout for multi-location practices.
 * Best for: Healthcare groups, multi-location clinics.
 * 
 * Recommended blocks order:
 * 1. Hero (with location search)
 * 2. Clinics (with map view option)
 * 3. Services
 * 4. Care Team
 * 5. How It Works
 * 6. Contact
 * 7. CTA Band
 */
export function MultiLocationTemplate(props: TemplateRendererProps) {
  return (
    <TemplateRenderer
      {...props}
      templateId="multi-location"
    />
  );
}

export default MultiLocationTemplate;
