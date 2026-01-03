'use client';

/**
 * FAQ Block
 * 
 * Frequently asked questions with multiple layout options:
 * - accordion: Classic expandable Q&A list
 * - two-column: Accordion split into two columns
 * - split-panel: Questions on left, selected answer on right
 * - card-grid: All Q&As visible as cards in a responsive grid
 */

import React, { useState } from 'react';
import { FAQBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { cn } from '@/lib/utils';
import { HelpCircle, ChevronRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getPrimaryColor, getPrimaryTextColor, getSecondaryTextColor, getTertiaryTextColor } from '@/lib/website-builder/theme-utils';

export interface FAQBlockComponentProps extends BlockComponentProps<FAQBlockProps> {}

// =============================================================================
// FAQ ITEM TYPE
// =============================================================================

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FAQBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: FAQBlockComponentProps) {
  const {
    title,
    subtitle,
    items,
    layout = 'accordion',
  } = props;

  // State for split-panel layout (selected question)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Placeholder FAQs for preview
  const placeholderItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I schedule an appointment?',
      answer: 'You can schedule an appointment online through our website, call our office, or use our patient portal. We offer same-day appointments when available.',
    },
    {
      id: '2',
      question: 'What insurance plans do you accept?',
      answer: 'We accept most major insurance plans including Blue Cross Blue Shield, Aetna, United Healthcare, and Medicare. Please contact our office to verify your specific plan.',
    },
    {
      id: '3',
      question: 'Do you offer telehealth appointments?',
      answer: 'Yes! We offer virtual visits for many types of appointments. You can book a telehealth visit through our online scheduling system.',
    },
    {
      id: '4',
      question: 'What should I bring to my first appointment?',
      answer: 'Please bring your insurance card, photo ID, list of current medications, and any relevant medical records. Arrive 15 minutes early to complete paperwork.',
    },
    {
      id: '5',
      question: 'How can I access my medical records?',
      answer: 'You can access your medical records, test results, and appointment summaries through our secure patient portal. Sign up or log in on our website.',
    },
  ];

  const displayItems: FAQItem[] = items.length > 0 ? items : (isPreview ? placeholderItems : []);

  // Initialize selected question for split-panel if not set
  React.useEffect(() => {
    if (layout === 'split-panel' && displayItems.length > 0 && !selectedQuestionId) {
      const firstItem = displayItems[0];
      if (firstItem) {
        setSelectedQuestionId(firstItem.id);
      }
    }
  }, [layout, displayItems, selectedQuestionId]);

  const primaryColor = getPrimaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor } = useAppearanceStyles(appearance, theme);

  // Use appearance text color if set, otherwise fall back to theme colors
  const titleColor = appearanceTextColor || primaryTextColor;
  const subtitleColor = appearanceTextColor || secondaryTextColor;

  if (displayItems.length === 0) {
    return null;
  }

  // =============================================================================
  // ACCORDION LAYOUT (shared by accordion and two-column)
  // =============================================================================

  const renderAccordion = (faqItems: FAQItem[]) => (
    <Accordion 
      type="single" 
      collapsible 
      className="w-full"
    >
      {faqItems.map((item) => (
        <AccordionItem key={item.id} value={item.id} className="border-b border-border-primary">
          <AccordionTrigger 
            className="text-left focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-sm py-3 sm:py-4 text-sm sm:text-base font-medium break-words"
            aria-controls={`faq-content-${item.id}`}
            style={{ color: primaryTextColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = primaryTextColor)}
          >
            <span className="pr-4">{item.question}</span>
          </AccordionTrigger>
          <AccordionContent 
            id={`faq-content-${item.id}`}
            className="text-sm sm:text-base pb-3 sm:pb-4"
            style={{ color: secondaryTextColor }}
          >
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  // =============================================================================
  // SPLIT-PANEL LAYOUT
  // =============================================================================

  const renderSplitPanel = () => {
    const selectedItem = displayItems.find(item => item.id === selectedQuestionId) || displayItems[0];
    if (!selectedItem) return null;

    return (
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Questions List (Left Panel) */}
        <div 
          className="lg:w-2/5 bg-background-primary rounded-lg shadow-sm p-2 sm:p-4"
          role="tablist"
          aria-label="FAQ Questions"
        >
          {displayItems.map((item, index) => {
            const isSelected = item.id === selectedQuestionId;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`faq-answer-panel-${item.id}`}
                id={`faq-question-tab-${item.id}`}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  'w-full text-left p-3 sm:p-4 rounded-lg transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'flex items-center justify-between gap-2',
                  isSelected 
                    ? 'bg-interactive-primary/10 border-l-4 border-interactive-primary'
                    : 'hover:bg-surface-secondary'
                )}
                style={{ 
                  color: isSelected ? primaryColor : primaryTextColor,
                }}
                onClick={() => setSelectedQuestionId(item.id)}
                onKeyDown={(e) => {
                  // Enhanced keyboard navigation
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % displayItems.length;
                    setSelectedQuestionId(displayItems[nextIndex]!.id);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (index - 1 + displayItems.length) % displayItems.length;
                    setSelectedQuestionId(displayItems[prevIndex]!.id);
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    setSelectedQuestionId(displayItems[0]!.id);
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    setSelectedQuestionId(displayItems[displayItems.length - 1]!.id);
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedQuestionId(item.id);
                  }
                }}
              >
                <span className="text-sm sm:text-base font-medium break-words pr-2">
                  {item.question}
                </span>
                <ChevronRight 
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform',
                    isSelected && 'rotate-90'
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Answer Panel (Right Panel) */}
        <div 
          className="lg:w-3/5 bg-background-primary rounded-lg shadow-sm p-4 sm:p-6"
          role="tabpanel"
          id={`faq-answer-panel-${selectedItem.id}`}
          aria-labelledby={`faq-question-tab-${selectedItem.id}`}
        >
          <h3 
            className="text-lg sm:text-xl font-semibold mb-4"
            style={{ color: primaryTextColor }}
          >
            {selectedItem.question}
          </h3>
          <p 
            className="text-sm sm:text-base leading-relaxed"
            style={{ color: secondaryTextColor }}
          >
            {selectedItem.answer}
          </p>
        </div>
      </div>
    );
  };

  // =============================================================================
  // CARD GRID LAYOUT
  // =============================================================================

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {displayItems.map((item) => (
        <article
          key={item.id}
          className="bg-background-primary rounded-lg shadow-sm p-4 sm:p-6 border border-border-primary hover:shadow-md transition-shadow"
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-3"
            style={{ color: primaryTextColor }}
          >
            {item.question}
          </h3>
          <p 
            className="text-sm leading-relaxed"
            style={{ color: secondaryTextColor }}
          >
            {item.answer}
          </p>
        </article>
      ))}
    </div>
  );

  // =============================================================================
  // RENDER LAYOUT BASED ON SELECTION
  // =============================================================================

  const renderFAQContent = () => {
    switch (layout) {
      case 'accordion':
        return (
          <div className="bg-background-primary rounded-lg shadow-sm p-4 sm:p-6">
            {renderAccordion(displayItems)}
          </div>
        );
      
      case 'two-column':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-background-primary rounded-lg shadow-sm p-4 sm:p-6">
              {renderAccordion(displayItems.filter((_, i) => i % 2 === 0))}
            </div>
            <div className="bg-background-primary rounded-lg shadow-sm p-4 sm:p-6">
              {renderAccordion(displayItems.filter((_, i) => i % 2 === 1))}
            </div>
          </div>
        );
      
      case 'split-panel':
        return renderSplitPanel();
      
      case 'card-grid':
        return renderCardGrid();
      
      default:
        // Fallback to accordion
        return (
          <div className="bg-background-primary rounded-lg shadow-sm p-4 sm:p-6">
            {renderAccordion(displayItems)}
          </div>
        );
    }
  };

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="faq"
      as="section"
      id="faq"
      aria-labelledby="faq-title"
      blockId={blockId}
    >
      {/* Header */}
      <div className="text-center mb-12">
          <h2
            id="faq-title"
            className="font-bold mb-4"
            style={{
              fontSize: 'var(--theme-h2-size)',
              fontFamily: 'var(--theme-font-heading)',
              color: titleColor,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{
                fontFamily: 'var(--theme-font-body)',
                color: subtitleColor,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* FAQ Content */}
        {renderFAQContent()}

        {/* Empty state */}
        {displayItems.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto mb-4" style={{ color: tertiaryTextColor }} />
            <p style={{ color: secondaryTextColor }}>
              FAQ coming soon.
            </p>
          </div>
        )}
    </BlockSection>
  );
}
