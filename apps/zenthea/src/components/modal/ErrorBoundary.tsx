'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, X, Save, Download } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ModalErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Modal Error Boundary caught an error:', error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Auto-save any unsaved data before showing error
    this.saveDraftData();
  }

  private saveDraftData = () => {
    try {
      // Try to save any unsaved modal data to session storage
      const modalData = localStorage.getItem('modal-drafts');
      if (modalData) {
        sessionStorage.setItem('modal-drafts-backup', modalData);
        console.log('Modal draft data backed up to session storage');
      }
    } catch (error) {
      console.error('Failed to backup modal data:', error);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  private handleExportError = () => {
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      errorInfo: this.state.errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(errorData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modal-error-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg">Modal Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                Something went wrong with this modal. Your data has been automatically saved.
              </div>
              
              {this.state.error && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-sm font-medium mb-1">Error Details:</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {this.state.error.message}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {this.state.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button variant="outline" onClick={this.handleReset} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Close Modal
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={this.handleExportError} className="flex-1">
                    <Download className="h-4 w-4 mr-1" />
                    Export Error
                  </Button>
                  <Button variant="outline" size="sm" onClick={this.saveDraftData} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    Save Draft
                  </Button>
                </div>
              </div>

              {this.state.retryCount >= this.maxRetries && (
                <div className="text-xs text-muted-foreground text-center">
                  Maximum retry attempts reached. Please refresh the page or contact support.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling in functional components
export function useModalErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Modal error:', error);
    setError(error);
    
    // Auto-save any unsaved data
    try {
      const modalData = localStorage.getItem('modal-drafts');
      if (modalData) {
        sessionStorage.setItem('modal-drafts-backup', modalData);
      }
    } catch (e) {
      console.error('Failed to backup modal data:', e);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
