'use client';

/**
 * Custom Text Block Editor
 * 
 * Configuration panel for editing custom text block properties.
 * Uses a WYSIWYG rich text editor for content editing.
 */

import React from 'react';
import { customTextBlockPropsSchema } from '@/lib/website-builder/schema';
import { BlockEditorProps } from '../block-registry';
import { CustomTextBlockFormFields } from './CustomTextBlockFormFields';

export default function CustomTextBlockEditor({ props, onChange }: BlockEditorProps) {
  // Validate props with schema
  const customTextProps = customTextBlockPropsSchema.parse(props);

  return (
    <CustomTextBlockFormFields
      props={customTextProps}
      onUpdate={onChange}
      disabled={false}
      isSidebar={false}
    />
  );
}

