'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class NavigationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    const errorMessage = error?.message || '';
    // Handle Convex-related errors gracefully - don't show error UI for these
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
      // Don't trigger error state for Convex errors - let ConvexErrorBoundary handle them
      return null;
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error?.message || '';
    // Silently handle Convex errors - don't log to avoid noise
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
      // Silently handle - these are expected when tenant doesn't exist or Convex is not configured
      return;
    }
    console.error('Navigation Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-4 bg-background-primary border border-border-error rounded-lg">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-status-error mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Navigation Error
            </h3>
            <p className="text-text-secondary mb-4">
              Something went wrong with the navigation. Please try again.
            </p>
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
