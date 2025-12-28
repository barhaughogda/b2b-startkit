'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Error boundary component for catching and displaying React errors
 *
 * @example
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With render prop
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <ErrorCard error={error} onRetry={reset} />
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode)
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    // Log to error reporting service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  reset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props

      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset)
      }

      if (fallback) {
        return fallback
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.reset} />
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
  error?: Error
  onRetry?: () => void
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  return (
    <ErrorCard>
      <ErrorCardIcon />
      <ErrorCardTitle>Something went wrong</ErrorCardTitle>
      <ErrorCardDescription>
        {error?.message || 'An unexpected error occurred.'}
      </ErrorCardDescription>
      {onRetry && (
        <ErrorCardAction>
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </ErrorCardAction>
      )}
    </ErrorCard>
  )
}

/**
 * Error card container
 */
interface ErrorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'inline' | 'full'
}

function ErrorCard({
  className,
  variant = 'default',
  children,
  ...props
}: ErrorCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        {
          'gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6':
            variant === 'default',
          'gap-2 rounded-md bg-destructive/10 p-4': variant === 'inline',
          'min-h-[400px] gap-4 p-8': variant === 'full',
        },
        className
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Error card icon
 */
interface ErrorCardIconProps extends React.HTMLAttributes<HTMLDivElement> {}

function ErrorCardIcon({ className, ...props }: ErrorCardIconProps) {
  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive',
        className
      )}
      {...props}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
  )
}

/**
 * Error card title
 */
interface ErrorCardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

function ErrorCardTitle({ className, children, ...props }: ErrorCardTitleProps) {
  return (
    <h3
      className={cn('text-lg font-semibold text-destructive', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

/**
 * Error card description
 */
interface ErrorCardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

function ErrorCardDescription({
  className,
  children,
  ...props
}: ErrorCardDescriptionProps) {
  return (
    <p
      className={cn('max-w-sm text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  )
}

/**
 * Error card action container
 */
interface ErrorCardActionProps extends React.HTMLAttributes<HTMLDivElement> {}

function ErrorCardAction({
  className,
  children,
  ...props
}: ErrorCardActionProps) {
  return (
    <div className={cn('mt-2 flex gap-2', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Error card details (collapsible stack trace for dev)
 */
interface ErrorCardDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: Error
}

function ErrorCardDetails({
  className,
  error,
  ...props
}: ErrorCardDetailsProps) {
  const [expanded, setExpanded] = React.useState(false)

  if (!error?.stack) return null

  return (
    <div className={cn('mt-4 w-full', className)} {...props}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>
      {expanded && (
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
          {error.stack}
        </pre>
      )}
    </div>
  )
}

/**
 * Hook for error handling with reset capability
 */
function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  const reset = React.useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, reset }
}

export {
  ErrorBoundary,
  DefaultErrorFallback,
  ErrorCard,
  ErrorCardIcon,
  ErrorCardTitle,
  ErrorCardDescription,
  ErrorCardAction,
  ErrorCardDetails,
  useErrorHandler,
}

export type {
  ErrorBoundaryProps,
  DefaultErrorFallbackProps,
  ErrorCardProps,
  ErrorCardIconProps,
  ErrorCardTitleProps,
  ErrorCardDescriptionProps,
  ErrorCardActionProps,
  ErrorCardDetailsProps,
}
