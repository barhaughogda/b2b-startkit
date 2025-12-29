'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

/**
 * Error boundary component for catching and handling React errors
 * Provides user-friendly error display with recovery options
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background-primary p-4">
          <div className="max-w-md w-full">
            <Alert className="border-status-error">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription className="mt-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-text-primary">Something went wrong</h3>
                    <p className="text-text-secondary text-sm mt-1">
                      We encountered an unexpected error. Please try refreshing the page.
                    </p>
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="text-xs text-text-tertiary">
                      <summary className="cursor-pointer hover:text-text-secondary">
                        Error Details (Development)
                      </summary>
                      <pre className="mt-2 p-2 bg-surface-elevated rounded text-xs overflow-auto">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={this.resetError}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again</span>
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      size="sm"
                      className="bg-zenthea-teal hover:bg-zenthea-teal-600"
                    >
                      Refresh Page
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for manually triggering error boundary
 * Useful for handling async errors in components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Manual error trigger:', error, errorInfo);
    // In a real implementation, you might want to use a state management solution
    // or context to trigger the error boundary
    throw error;
  };
}
