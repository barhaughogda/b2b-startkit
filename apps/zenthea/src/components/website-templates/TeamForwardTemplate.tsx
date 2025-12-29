'use client';

import React from 'react';
import { TemplateRenderer, type TemplateRendererProps } from './TemplateRenderer';

/**
 * Team Forward Template
 * 
 * Team-first, trust-heavy layout emphasizing provider credentials.
 * Best for: Specialty practices, trust-focused marketing.
 * 
 * Recommended blocks order:
 * 1. Hero (highlighting team)
 * 2. Care Team (prominent, detailed)
 * 3. Trust Bar
 * 4. Testimonials
 * 5. Services
 * 6. FAQ
 * 7. Contact
 * 8. CTA Band
 */
export function TeamForwardTemplate(props: TemplateRendererProps) {
  return (
    <TemplateRenderer
      {...props}
      templateId="team-forward"
    />
  );
}

export default TeamForwardTemplate;
