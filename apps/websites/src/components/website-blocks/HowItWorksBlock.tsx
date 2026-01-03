'use client';

/**
 * How It Works Block
 *
 * Displays a multi-step process with icons and descriptions.
 * Supports multiple layout variants and icon shape customization.
 */

import React from 'react';
import {
  HowItWorksBlockProps,
  type HowItWorksLayout,
  type HowItWorksIconShape,
  type HowItWorksIcon,
} from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  CalendarCheck,
  Timer,
  MapPin,
  Building2,
  Home,
  Navigation,
  Heart,
  Stethoscope,
  Pill,
  Thermometer,
  Activity,
  HeartPulse,
  Phone,
  Mail,
  MessageCircle,
  Video,
  CheckCircle,
  Star,
  Shield,
  Users,
  FileText,
  Award,
  LucideIcon,
} from 'lucide-react';
import {
  getPrimaryColor,
  getSecondaryColor,
  getPrimaryTextColor,
  getSecondaryTextColor,
} from '@/lib/website-builder/theme-utils';

export interface HowItWorksBlockComponentProps
  extends BlockComponentProps<HowItWorksBlockProps> {}

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICON_MAP: Record<HowItWorksIcon, LucideIcon> = {
  // Scheduling
  calendar: Calendar,
  clock: Clock,
  'calendar-check': CalendarCheck,
  timer: Timer,
  // Location
  'map-pin': MapPin,
  'building-2': Building2,
  home: Home,
  navigation: Navigation,
  // Medical
  heart: Heart,
  stethoscope: Stethoscope,
  pill: Pill,
  thermometer: Thermometer,
  activity: Activity,
  'heart-pulse': HeartPulse,
  // Communication
  phone: Phone,
  mail: Mail,
  'message-circle': MessageCircle,
  video: Video,
  // General
  'check-circle': CheckCircle,
  star: Star,
  shield: Shield,
  users: Users,
  'file-text': FileText,
  award: Award,
};

// Legacy icon name mapping for backwards compatibility
const LEGACY_ICON_MAP: Record<string, HowItWorksIcon> = {
  location: 'map-pin',
  check: 'check-circle',
};

const getStepIcon = (iconName?: string, stepNumber?: number): LucideIcon => {
  if (iconName) {
    // Check if it's a valid icon
    if (iconName in ICON_MAP) {
      return ICON_MAP[iconName as HowItWorksIcon];
    }
    // Check legacy mapping
    if (iconName && iconName in LEGACY_ICON_MAP) {
      const legacyIcon = LEGACY_ICON_MAP[iconName];
      if (legacyIcon) {
        return ICON_MAP[legacyIcon];
      }
    }
  }
  // Default icons based on step number
  const defaults: LucideIcon[] = [Calendar, MapPin, Heart];
  return defaults[(stepNumber || 1) - 1] || CheckCircle;
};

// =============================================================================
// ICON SHAPE STYLES
// =============================================================================

const getIconShapeClasses = (shape: HowItWorksIconShape): string => {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'rounded-square':
      return 'rounded-xl';
    case 'square':
      return 'rounded';
    default:
      return 'rounded-full';
  }
};

const getNumberBadgeShapeClasses = (shape: HowItWorksIconShape): string => {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'rounded-square':
      return 'rounded-lg';
    case 'square':
      return 'rounded';
    default:
      return 'rounded-full';
  }
};

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

interface LayoutProps {
  steps: HowItWorksBlockProps['steps'];
  iconShape: HowItWorksIconShape;
  primaryColor: string;
  secondaryColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
}

/**
 * Numbered Circles Layout - Default
 * Icons in colored circles with step number badges
 */
function NumberedCirclesLayout({
  steps,
  iconShape,
  primaryColor,
  secondaryColor,
  primaryTextColor,
  secondaryTextColor,
}: LayoutProps) {
  const iconShapeClass = getIconShapeClasses(iconShape);
  const badgeShapeClass = getNumberBadgeShapeClasses(iconShape);

  return (
    <div className="relative">
      {/* Connection line (desktop only) */}
      <div
        className="hidden md:block absolute top-20 left-1/2 -translate-x-1/2 w-2/3 h-0.5"
        style={{
          background: `linear-gradient(to right, ${primaryColor}33, ${primaryColor}80, ${primaryColor}33)`,
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
        {steps.map((step, index) => {
          const IconComponent = getStepIcon(step.icon, step.number);

          return (
            <div
              key={step.id}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number circle */}
              <div className="relative z-10 mb-6">
                <div
                  className={cn(
                    'w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-lg',
                    iconShapeClass
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div
                  className={cn(
                    'absolute -top-2 -right-2 w-8 h-8 text-white flex items-center justify-center text-sm font-bold',
                    badgeShapeClass
                  )}
                  style={{ backgroundColor: secondaryColor }}
                >
                  {step.number}
                </div>
              </div>

              {/* Step content */}
              <h3
                className="text-lg sm:text-xl font-semibold mb-2 break-words"
                style={{ color: primaryTextColor }}
              >
                {step.title}
              </h3>
              <p
                className="max-w-xs text-sm sm:text-base break-words"
                style={{ color: secondaryTextColor }}
              >
                {step.description}
              </p>

              {/* Mobile connector */}
              {index < steps.length - 1 && (
                <div
                  className="md:hidden w-0.5 h-8 mt-6"
                  style={{ backgroundColor: `${primaryColor}4d` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Timeline Layout
 * Vertical timeline with icons on the left
 */
function TimelineLayout({
  steps,
  iconShape,
  primaryColor,
  secondaryColor,
  primaryTextColor,
  secondaryTextColor,
}: LayoutProps) {
  const iconShapeClass = getIconShapeClasses(iconShape);
  const badgeShapeClass = getNumberBadgeShapeClasses(iconShape);

  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Timeline line */}
      <div
        className="absolute left-8 md:left-10 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: `${primaryColor}33` }}
      />

      <div className="space-y-8 md:space-y-12">
        {steps.map((step, index) => {
          const IconComponent = getStepIcon(step.icon, step.number);

          return (
            <div key={step.id} className="relative flex items-start gap-6">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={cn(
                    'w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-lg',
                    iconShapeClass
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div
                  className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 text-white flex items-center justify-center text-xs font-bold',
                    badgeShapeClass
                  )}
                  style={{ backgroundColor: secondaryColor }}
                >
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-3">
                <h3
                  className="text-lg sm:text-xl font-semibold mb-2"
                  style={{ color: primaryTextColor }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm sm:text-base"
                  style={{ color: secondaryTextColor }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cards Layout
 * Each step as an elevated card with shadow
 */
function CardsLayout({
  steps,
  iconShape,
  primaryColor,
  secondaryColor,
  primaryTextColor,
  secondaryTextColor,
}: LayoutProps) {
  const iconShapeClass = getIconShapeClasses(iconShape);
  const badgeShapeClass = getNumberBadgeShapeClasses(iconShape);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {steps.map((step) => {
        const IconComponent = getStepIcon(step.icon, step.number);

        return (
          <div
            key={step.id}
            className="relative bg-white rounded-xl shadow-lg p-6 border border-border-primary"
          >
            {/* Step number badge */}
            <div
              className={cn(
                'absolute -top-3 -right-3 w-8 h-8 text-white flex items-center justify-center text-sm font-bold shadow-md',
                badgeShapeClass
              )}
              style={{ backgroundColor: secondaryColor }}
            >
              {step.number}
            </div>

            {/* Icon */}
            <div
              className={cn(
                'w-14 h-14 flex items-center justify-center mb-4',
                iconShapeClass
              )}
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <IconComponent
                className="w-7 h-7"
                style={{ color: primaryColor }}
              />
            </div>

            {/* Content */}
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: primaryTextColor }}
            >
              {step.title}
            </h3>
            <p className="text-sm" style={{ color: secondaryTextColor }}>
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Minimal Layout
 * Simple icons without colored backgrounds
 */
function MinimalLayout({
  steps,
  iconShape,
  primaryColor,
  secondaryColor,
  primaryTextColor,
  secondaryTextColor,
}: LayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
      {steps.map((step) => {
        const IconComponent = getStepIcon(step.icon, step.number);

        return (
          <div key={step.id} className="text-center">
            {/* Icon with step number */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span
                className="text-3xl font-bold"
                style={{ color: secondaryColor }}
              >
                {step.number}
              </span>
              <IconComponent
                className="w-8 h-8"
                style={{ color: primaryColor }}
              />
            </div>

            {/* Content */}
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: primaryTextColor }}
            >
              {step.title}
            </h3>
            <p className="text-sm" style={{ color: secondaryTextColor }}>
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HowItWorksBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: HowItWorksBlockComponentProps) {
  const {
    title,
    subtitle,
    steps,
    layout = 'numbered-circles',
    iconShape = 'circle',
  } = props;

  const primaryColor = getPrimaryColor(theme);
  const secondaryColor = getSecondaryColor(theme);
  const primaryTextColor = getPrimaryTextColor(theme);
  const secondaryTextColor = getSecondaryTextColor(theme);

  // Get appearance styles (appearance text color overrides theme)
  const { textColor: appearanceTextColor } = useAppearanceStyles(
    appearance,
    theme
  );

  // Use appearance text color if set, otherwise fall back to theme colors
  const titleColor = appearanceTextColor || primaryTextColor;
  const subtitleColor = appearanceTextColor || secondaryTextColor;

  const layoutProps: LayoutProps = {
    steps,
    iconShape,
    primaryColor,
    secondaryColor,
    primaryTextColor,
    secondaryTextColor,
  };

  const renderLayout = () => {
    switch (layout) {
      case 'timeline':
        return <TimelineLayout {...layoutProps} />;
      case 'cards':
        return <CardsLayout {...layoutProps} />;
      case 'minimal':
        return <MinimalLayout {...layoutProps} />;
      case 'numbered-circles':
      default:
        return <NumberedCirclesLayout {...layoutProps} />;
    }
  };

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="how-it-works"
      as="section"
      blockId={blockId}
    >
      {/* Header */}
      <div className="text-center mb-12">
          <h2
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

        {/* Layout */}
        {renderLayout()}
    </BlockSection>
  );
}
