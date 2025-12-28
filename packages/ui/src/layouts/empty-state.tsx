import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Empty state variants
 */
const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      size: {
        sm: 'gap-3 py-8',
        default: 'gap-4 py-12',
        lg: 'gap-6 py-16',
        full: 'min-h-[400px] gap-4 py-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

/**
 * Empty state component for displaying "no data" placeholders
 *
 * @example
 * <EmptyState>
 *   <EmptyStateIcon>
 *     <Users className="h-12 w-12" />
 *   </EmptyStateIcon>
 *   <EmptyStateTitle>No team members yet</EmptyStateTitle>
 *   <EmptyStateDescription>
 *     Get started by inviting your first team member.
 *   </EmptyStateDescription>
 *   <EmptyStateAction>
 *     <Button>Invite Member</Button>
 *   </EmptyStateAction>
 * </EmptyState>
 */
interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {}

function EmptyState({ className, size, children, ...props }: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ size }), className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Empty state icon container
 */
interface EmptyStateIconProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'primary' | 'destructive'
}

function EmptyStateIcon({
  className,
  variant = 'muted',
  children,
  ...props
}: EmptyStateIconProps) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full',
        {
          'bg-muted text-muted-foreground': variant === 'muted',
          'bg-primary/10 text-primary': variant === 'primary',
          'bg-destructive/10 text-destructive': variant === 'destructive',
          'text-muted-foreground': variant === 'default',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Empty state title
 */
interface EmptyStateTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

function EmptyStateTitle({
  className,
  children,
  ...props
}: EmptyStateTitleProps) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

/**
 * Empty state description
 */
interface EmptyStateDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

function EmptyStateDescription({
  className,
  children,
  ...props
}: EmptyStateDescriptionProps) {
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
 * Empty state action container
 */
interface EmptyStateActionProps extends React.HTMLAttributes<HTMLDivElement> {}

function EmptyStateAction({
  className,
  children,
  ...props
}: EmptyStateActionProps) {
  return (
    <div className={cn('flex gap-2', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Pre-composed empty states for common scenarios
 */

interface EmptyStatePresetProps extends Omit<EmptyStateProps, 'children'> {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

function EmptyStatePreset({
  title,
  description,
  icon,
  action,
  ...props
}: EmptyStatePresetProps) {
  return (
    <EmptyState {...props}>
      {icon && <EmptyStateIcon>{icon}</EmptyStateIcon>}
      <EmptyStateTitle>{title}</EmptyStateTitle>
      {description && (
        <EmptyStateDescription>{description}</EmptyStateDescription>
      )}
      {action && <EmptyStateAction>{action}</EmptyStateAction>}
    </EmptyState>
  )
}

/**
 * Empty search results state
 */
interface EmptySearchResultsProps
  extends Omit<EmptyStateProps, 'children'> {
  query?: string
  onClear?: () => void
}

function EmptySearchResults({
  query,
  onClear,
  ...props
}: EmptySearchResultsProps) {
  return (
    <EmptyState {...props}>
      <EmptyStateIcon>
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </EmptyStateIcon>
      <EmptyStateTitle>No results found</EmptyStateTitle>
      <EmptyStateDescription>
        {query
          ? `We couldn't find anything matching "${query}".`
          : "We couldn't find what you're looking for."}
      </EmptyStateDescription>
      {onClear && (
        <EmptyStateAction>
          <button
            onClick={onClear}
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </EmptyStateAction>
      )}
    </EmptyState>
  )
}

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
  EmptyStatePreset,
  EmptySearchResults,
  emptyStateVariants,
}

export type {
  EmptyStateProps,
  EmptyStateIconProps,
  EmptyStateTitleProps,
  EmptyStateDescriptionProps,
  EmptyStateActionProps,
  EmptyStatePresetProps,
  EmptySearchResultsProps,
}
