'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dot';
  pulse?: boolean;
}

/**
 * A notification badge component that displays a count or dot indicator
 * Used to show unread notifications on icons like the calendar
 */
export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  className,
  size = 'sm',
  variant = 'default',
  pulse = true,
}: NotificationBadgeProps) {
  // Don't show if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format the count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Size classes
  const sizeClasses = {
    sm: variant === 'dot' ? 'h-2 w-2' : 'h-4 min-w-4 text-[10px]',
    md: variant === 'dot' ? 'h-2.5 w-2.5' : 'h-5 min-w-5 text-xs',
    lg: variant === 'dot' ? 'h-3 w-3' : 'h-6 min-w-6 text-sm',
  };

  // Base styles
  const baseClasses = cn(
    'absolute flex items-center justify-center rounded-full font-medium',
    'bg-status-error text-white',
    sizeClasses[size],
    // Positioning - top right corner
    '-top-1 -right-1',
    // Animation
    pulse && 'animate-pulse',
    className
  );

  if (variant === 'dot') {
    return (
      <span className={baseClasses} aria-hidden="true">
        <span className="sr-only">{count} unread notifications</span>
      </span>
    );
  }

  return (
    <span className={cn(baseClasses, 'px-1')} aria-label={`${count} unread notifications`}>
      {displayCount}
    </span>
  );
}

/**
 * A wrapper component that positions the badge relative to its children
 */
interface NotificationBadgeWrapperProps {
  children: React.ReactNode;
  count: number;
  maxCount?: number;
  showZero?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dot';
  pulse?: boolean;
  badgeClassName?: string;
}

export function NotificationBadgeWrapper({
  children,
  count,
  maxCount,
  showZero,
  size,
  variant,
  pulse,
  badgeClassName,
}: NotificationBadgeWrapperProps) {
  return (
    <div className="relative inline-flex">
      {children}
      <NotificationBadge
        count={count}
        maxCount={maxCount}
        showZero={showZero}
        size={size}
        variant={variant}
        pulse={pulse}
        className={badgeClassName}
      />
    </div>
  );
}

export default NotificationBadge;

