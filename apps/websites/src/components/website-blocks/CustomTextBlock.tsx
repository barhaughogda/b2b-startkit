'use client';

/**
 * Custom Text Block
 * 
 * Flexible text content section for custom information.
 * Renders HTML content from the WYSIWYG rich text editor.
 */

import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { CustomTextBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { cn } from '@/lib/utils';
import { getPrimaryColor, getTertiaryTextColor } from '@/lib/website-builder/theme-utils';

export interface CustomTextBlockComponentProps extends BlockComponentProps<CustomTextBlockProps> {}

export default function CustomTextBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: CustomTextBlockComponentProps) {
  const {
    title,
    content,
    showTitle = true,
    backgroundColor = '#ffffff',
    textColor = '#000000',
    maxWidth = 'normal',
  } = props;

  const primaryColor = getPrimaryColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);
  
  // Use hex color values directly
  const contentTextColor = textColor;
  const contentHeadingColor = textColor; // Use same color for headings, or could be slightly darker

  const getBgStyle = (): React.CSSProperties => {
    return { backgroundColor };
  };

  const maxWidthClasses = {
    narrow: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
    full: 'max-w-7xl',
  };

  // Build CSS variables for theming (using Tailwind Typography's variable names)
  const contentStyle: React.CSSProperties = {
    '--tw-prose-body': contentTextColor,
    '--tw-prose-headings': contentHeadingColor,
    '--tw-prose-bold': contentHeadingColor,
    '--tw-prose-links': primaryColor,
    color: contentTextColor,
    fontFamily: 'var(--theme-font-body)',
  } as React.CSSProperties;

  // Sanitize HTML content to prevent XSS attacks
  // TipTap sanitizes by default, but this adds defense-in-depth for healthcare content
  const sanitizedContent = content
    ? DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['style'], // For text-align inline styles
        ALLOWED_URI_REGEXP: /^(?!javascript:)/i, // Prevent javascript: URLs
      })
    : '';

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="custom-text"
      as="section"
      blockId={blockId}
    >
      {showTitle && title && (
          <h2
            className="font-bold mb-4 sm:mb-6 text-2xl sm:text-3xl lg:text-4xl break-words"
            style={{
              fontFamily: 'var(--theme-font-heading)',
              color: contentHeadingColor,
            }}
          >
            {title}
          </h2>
        )}

        {sanitizedContent ? (
          <div 
            className={cn(
              // Base prose styling
              'prose prose-sm sm:prose-base lg:prose-lg max-w-none',
              // Prevent overflow
              'overflow-x-hidden break-words',
              // Heading styles - distinct visual hierarchy with responsive sizes
              'prose-headings:font-bold prose-headings:leading-tight prose-headings:break-words',
              'prose-h1:text-2xl prose-h1:sm:text-3xl prose-h1:md:text-4xl prose-h1:font-extrabold prose-h1:mb-4 prose-h1:sm:mb-5 prose-h1:mt-6 prose-h1:sm:mt-8 first:prose-h1:mt-0',
              'prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:md:text-3xl prose-h2:font-bold prose-h2:mb-3 prose-h2:sm:mb-4 prose-h2:mt-5 prose-h2:sm:mt-7 first:prose-h2:mt-0',
              'prose-h3:text-lg prose-h3:sm:text-xl prose-h3:md:text-2xl prose-h3:font-semibold prose-h3:mb-2 prose-h3:sm:mb-3 prose-h3:mt-4 prose-h3:sm:mt-6 first:prose-h3:mt-0',
              'prose-h4:text-base prose-h4:sm:text-lg prose-h4:md:text-xl prose-h4:font-semibold prose-h4:mb-2 prose-h4:mt-4 prose-h4:sm:mt-5 first:prose-h4:mt-0',
              // Paragraph and text styles - proper spacing between paragraphs
              'prose-p:my-3 prose-p:sm:my-4 prose-p:leading-relaxed',
              // Empty paragraphs should still take up space (for line breaks)
              '[&_p:empty]:min-h-[1.5em]',
              '[&_p:empty::before]:content-["\\00a0"]',
              // List styles
              'prose-ul:my-3 prose-ul:sm:my-4 prose-ul:pl-4 prose-ul:sm:pl-6 prose-ul:list-disc',
              'prose-ol:my-3 prose-ol:sm:my-4 prose-ol:pl-4 prose-ol:sm:pl-6 prose-ol:list-decimal',
              'prose-li:my-1 prose-li:leading-relaxed',
              // Strong and emphasis
              'prose-strong:font-semibold',
              // Links - use theme colors
              'prose-a:text-interactive-primary prose-a:underline prose-a:underline-offset-2',
              'prose-a:hover:text-interactive-primary-hover',
              '[&_a]:text-interactive-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words',
              '[&_a:hover]:text-interactive-primary-hover',
              // Handle underline from WYSIWYG editor
              '[&_u]:underline [&_u]:underline-offset-2',
              // Support text alignment from editor (inline styles)
              '[&_[style*="text-align:_center"]]:text-center',
              '[&_[style*="text-align:_right"]]:text-right',
              '[&_[style*="text-align:_left"]]:text-left',
              '[&_[style*="text-align:center"]]:text-center',
              '[&_[style*="text-align:right"]]:text-right',
              '[&_[style*="text-align:left"]]:text-left',
            )}
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        ) : isPreview ? (
          <p className="italic" style={{ color: tertiaryTextColor }}>
            Add your custom content here...
          </p>
        ) : null}
    </BlockSection>
  );
}
