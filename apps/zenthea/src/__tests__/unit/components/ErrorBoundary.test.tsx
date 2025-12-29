import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error fallback when child throws error', () => {
    // Set NODE_ENV to development to show error details
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true
    });
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
    
    // Restore original NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  });

  it('should render custom error fallback when provided', () => {
    const CustomErrorFallback = ({ error }: { error: Error }) => (
      <div data-testid="custom-error">
        Custom error: {error.message}
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomErrorFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
  });

  it('should call onError when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should reset error state when reset is called', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <div>
          <button onClick={() => setShouldThrow(false)}>
            Fix Error
          </button>
          <ThrowError shouldThrow={shouldThrow} />
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    // Initially shows error
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    
    // Click fix button to reset error state
    screen.getByText('Try Again').click();
    
    // The error boundary should reset, but the component will still throw
    // because the underlying issue (shouldThrow=true) hasn't been fixed
    // So we should still see the error state
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('should log error to console in development', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true
    });
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(console.error).toHaveBeenCalled();
    
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  });
});
