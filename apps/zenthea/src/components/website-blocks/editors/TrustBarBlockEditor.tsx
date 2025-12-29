'use client';

/**
 * Trust Bar Block Editor
 *
 * Sidebar editor for the Trust Bar block. Delegates to the comprehensive
 * TrustBarContentConfigForm for actual configuration.
 */

import React from 'react';
import { BlockEditorProps } from '../block-registry';
import { TrustBarContentConfigForm } from '@/components/website-builder/block-config/TrustBarContentConfigForm';

export default function TrustBarBlockEditor({ props, onChange }: BlockEditorProps) {
  return (
    <TrustBarContentConfigForm
      props={props}
      onUpdate={onChange}
      disabled={false}
    />
  );
}
