import React from 'react';
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'critical';
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'solid';
  'aria-label'?: string;
}

/**
 * StatusBadge - Accessible status indicator with proper contrast
 * 
 * Uses enhanced color system with proper contrast ratios:
 * - Text colors are darker for better readability
 * - Background colors have sufficient contrast
 * - Supports multiple variants for different use cases
 */
export function StatusBadge({ 
  status, 
  children, 
  className,
  variant = 'default',
  'aria-label': ariaLabel,
}: StatusBadgeProps) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  const statusClasses = {
    success: {
      default: "text-status-success bg-status-success-bg border border-status-success border-opacity-30",
      outline: "text-status-success border border-status-success bg-transparent",
      solid: "text-white bg-status-success"
    },
    warning: {
      default: "text-status-warning bg-status-warning-bg border border-status-warning border-opacity-30",
      outline: "text-status-warning border border-status-warning bg-transparent",
      solid: "text-white bg-status-warning"
    },
    error: {
      default: "text-status-error bg-status-error-bg border border-status-error border-opacity-30",
      outline: "text-status-error border border-status-error bg-transparent",
      solid: "text-white bg-status-error"
    },
    info: {
      default: "text-status-info bg-status-info-bg border border-status-info border-opacity-30",
      outline: "text-status-info border border-status-info bg-transparent",
      solid: "text-white bg-status-info"
    },
    critical: {
      default: "text-status-critical bg-status-critical-bg border border-status-critical border-opacity-30",
      outline: "text-status-critical border border-status-critical bg-transparent",
      solid: "text-white bg-status-critical"
    }
  };

  return (
    <span 
      className={cn(
        baseClasses,
        statusClasses[status][variant],
        className
      )}
      aria-label={ariaLabel || (typeof children === 'string' ? `Status: ${children}` : undefined)}
      role="status"
    >
      {children}
    </span>
  );
}
