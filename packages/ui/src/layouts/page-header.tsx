import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Page header variants
 */
const pageHeaderVariants = cva('space-y-1', {
  variants: {
    size: {
      default: '',
      sm: '',
      lg: '',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

/**
 * Page header component
 * Displays page title, optional description, and action buttons
 *
 * @example
 * <PageHeader>
 *   <PageHeaderContent>
 *     <PageHeaderTitle>Team Members</PageHeaderTitle>
 *     <PageHeaderDescription>Manage your team and their roles.</PageHeaderDescription>
 *   </PageHeaderContent>
 *   <PageHeaderActions>
 *     <Button>Invite Member</Button>
 *   </PageHeaderActions>
 * </PageHeader>
 */
interface PageHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageHeaderVariants> {}

function PageHeader({ className, size, children, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Page header content section (title + description)
 */
interface PageHeaderContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageHeaderContent({
  className,
  children,
  ...props
}: PageHeaderContentProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Page header title
 */
interface PageHeaderTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3'
}

function PageHeaderTitle({
  className,
  as: Comp = 'h1',
  children,
  ...props
}: PageHeaderTitleProps) {
  return (
    <Comp
      className={cn('text-2xl font-bold tracking-tight sm:text-3xl', className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

/**
 * Page header description
 */
interface PageHeaderDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

function PageHeaderDescription({
  className,
  children,
  ...props
}: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-muted-foreground sm:text-base', className)}
      {...props}
    >
      {children}
    </p>
  )
}

/**
 * Page header actions container
 */
interface PageHeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageHeaderActions({
  className,
  children,
  ...props
}: PageHeaderActionsProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Page header with back button
 */
interface PageHeaderBackProps extends React.HTMLAttributes<HTMLDivElement> {
  backHref?: string
  backLabel?: string
  onBack?: () => void
}

function PageHeaderBack({
  className,
  backHref,
  backLabel = 'Back',
  onBack,
  children,
  ...props
}: PageHeaderBackProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {(backHref || onBack) && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {backLabel}
        </button>
      )}
      {children}
    </div>
  )
}

export {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  PageHeaderBack,
  pageHeaderVariants,
}

export type {
  PageHeaderProps,
  PageHeaderContentProps,
  PageHeaderTitleProps,
  PageHeaderDescriptionProps,
  PageHeaderActionsProps,
  PageHeaderBackProps,
}
