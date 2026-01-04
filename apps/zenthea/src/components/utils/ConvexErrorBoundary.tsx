'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { convex } from '@/lib/convex-client';

interface ConvexErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI when Convex is not available */
  fallback?: React.ReactNode;
  /** Optional title for the error message */
  title?: string;
  /** Optional description for the error message */
  description?: string;
}

interface ConvexErrorBoundaryState {
  hasError: boolean;
}

/**
 * Shared error boundary component for catching Convex-related errors
 * 
 * This component catches errors related to ConvexProvider, Convex client,
 * and Convex hooks (useQuery, useMutation) that occur during component
 * lifecycle or event handlers.
 * 
 * Note: React error boundaries don't catch hook errors during render,
 * but they can catch errors thrown during component lifecycle or event handlers.
 * 
 * @example
 * ```tsx
 * <ConvexErrorBoundary>
 *   <ComponentThatUsesConvex />
 * </ConvexErrorBoundary>
 * ```
 * 
 * @example
 * ```tsx
 * <ConvexErrorBoundary
 *   title="Custom Title"
 *   description="Custom description"
 * >
 *   <ComponentThatUsesConvex />
 * </ConvexErrorBoundary>
 * ```
 */
export class ConvexErrorBoundary extends React.Component<
  ConvexErrorBoundaryProps,
  ConvexErrorBoundaryState
> {
  constructor(props: ConvexErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ConvexErrorBoundaryState | null {
    const errorMessage = error?.message || '';
    // Handle Convex-related errors gracefully
    if (
      errorMessage.includes('ConvexProvider') ||
      errorMessage.includes('Convex client') ||
      errorMessage.includes('useQuery') ||
      errorMessage.includes('useMutation') ||
      errorMessage.includes('Could not find Convex') ||
      errorMessage.includes('Could not find public function') ||
      errorMessage.includes('CONVEX') ||
      errorMessage.includes('Tenant not found') ||
      errorMessage.includes('[CONVEX Q')
    ) {
      return { hasError: true };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error?.message || '';
    // Handle Convex-related errors gracefully without logging
    if (
      errorMessage.includes('ConvexProvider') ||
      errorMessage.includes('Convex client') ||
      errorMessage.includes('useQuery') ||
      errorMessage.includes('useMutation') ||
      errorMessage.includes('Could not find Convex') ||
      errorMessage.includes('Could not find public function') ||
      errorMessage.includes('CONVEX') ||
      errorMessage.includes('Tenant not found') ||
      errorMessage.includes('[CONVEX Q')
    ) {
      // Silently handle Convex errors - don't log to avoid noise
      // These are expected when tenant doesn't exist or Convex is not configured
      return;
    }
    // Log other errors for debugging
    console.error('ConvexErrorBoundary error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {this.props.title || 'Convex Not Available'}
            </h1>
            <p className="text-text-secondary">
              {this.props.description || 'Convex is required for this feature. Please ensure Convex is properly configured.'}
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-status-warning/10 border border-status-warning rounded-md">
                <AlertCircle className="h-5 w-5 text-status-warning" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Convex Not Available</h3>
                  <p className="text-sm text-text-secondary">
                    Convex is required to use this feature. Please ensure:
                    <br />1. The Convex dev server is running: <code className="bg-surface-elevated px-1 rounded">npx convex dev</code>
                    <br />2. The <code className="bg-surface-elevated px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> environment variable is set correctly.
                    {process.env.NODE_ENV === 'development' && (
                      <>
                        <br />
                        <br />
                        <span className="text-xs text-text-tertiary">
                          Debug: convex={convex ? '✓' : '✗'}, URL={process.env.NEXT_PUBLIC_CONVEX_URL ? '✓' : '✗'} ({process.env.NEXT_PUBLIC_CONVEX_URL || 'not set'})
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

