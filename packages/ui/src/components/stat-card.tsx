import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Card, CardContent } from './card'
import { Skeleton } from './skeleton'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  /** The main metric title/label */
  label: string
  /** The metric value (number, string, or formatted display) */
  value: React.ReactNode
  /** Optional description text */
  description?: string
  /** Icon to display */
  icon?: React.ReactNode
  /** Trend indicator (positive = up, negative = down) */
  trend?: {
    value: number
    label?: string
  }
  /** Show loading skeleton */
  loading?: boolean
  /** Click handler */
  onClick?: () => void
}

// -----------------------------------------------------------------------------
// Variants
// -----------------------------------------------------------------------------

const statCardVariants = cva(
  'relative overflow-hidden transition-all',
  {
    variants: {
      variant: {
        default: '',
        accent: 'border-l-4 border-l-primary',
        ghost: 'border-0 shadow-none bg-muted/50',
        outline: 'bg-transparent',
      },
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const statCardIconVariants = cva(
  'flex items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        accent: 'bg-primary/10 text-primary',
        ghost: 'bg-background text-muted-foreground',
        outline: 'bg-muted text-muted-foreground',
      },
      size: {
        sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
        default: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
        lg: 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// -----------------------------------------------------------------------------
// Trend Indicator Component
// -----------------------------------------------------------------------------

function TrendIndicator({
  value,
  label,
}: {
  value: number
  label?: string
}) {
  const isPositive = value > 0
  const isNeutral = value === 0

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-green-600 dark:text-green-400',
        !isPositive && !isNeutral && 'text-red-600 dark:text-red-400',
        isNeutral && 'text-muted-foreground'
      )}
    >
      {!isNeutral && (
        <svg
          className={cn('h-3 w-3', !isPositive && 'rotate-180')}
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 9V3M3 5l3-3 3 3"
          />
        </svg>
      )}
      <span>
        {isPositive && '+'}
        {value}%
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  )
}

// -----------------------------------------------------------------------------
// StatCard Component
// -----------------------------------------------------------------------------

/**
 * StatCard component for displaying dashboard metrics and KPIs.
 * Features support for icons, trend indicators, and various visual variants.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatCard label="Total Revenue" value="$45,231.89" />
 *
 * // With icon and trend
 * <StatCard
 *   label="Active Users"
 *   value="2,345"
 *   icon={<UsersIcon />}
 *   trend={{ value: 12.5, label: "from last month" }}
 *   description="Users who logged in this week"
 * />
 *
 * // Accent variant
 * <StatCard
 *   variant="accent"
 *   label="Conversion Rate"
 *   value="3.24%"
 *   trend={{ value: -2.1 }}
 * />
 *
 * // Loading state
 * <StatCard label="Loading..." value="" loading />
 * ```
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      label,
      value,
      description,
      icon,
      trend,
      loading = false,
      onClick,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <Card
          ref={ref}
          className={cn(
            statCardVariants({ variant, size }),
            className
          )}
          {...props}
        >
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              {icon !== undefined && (
                <Skeleton className={cn(
                  'rounded-lg',
                  size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
                )} />
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        className={cn(
          statCardVariants({ variant, size }),
          onClick && 'cursor-pointer hover:bg-muted/50',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardContent className="p-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <p
                className={cn(
                  'font-bold tracking-tight',
                  size === 'sm' && 'text-xl',
                  size === 'default' && 'text-2xl',
                  size === 'lg' && 'text-3xl',
                  !size && 'text-2xl'
                )}
              >
                {value}
              </p>
              {trend && (
                <TrendIndicator value={trend.value} label={trend.label} />
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            {icon && (
              <div className={cn(statCardIconVariants({ variant, size }))}>
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)

StatCard.displayName = 'StatCard'

// -----------------------------------------------------------------------------
// StatCardGrid Component
// -----------------------------------------------------------------------------

export interface StatCardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns (defaults to auto-fit) */
  columns?: 1 | 2 | 3 | 4 | 'auto'
}

/**
 * Grid layout for StatCard components.
 *
 * @example
 * ```tsx
 * <StatCardGrid columns={4}>
 *   <StatCard label="Revenue" value="$45k" />
 *   <StatCard label="Users" value="2,345" />
 *   <StatCard label="Orders" value="1,234" />
 *   <StatCard label="Conversion" value="3.24%" />
 * </StatCardGrid>
 * ```
 */
const StatCardGrid = React.forwardRef<HTMLDivElement, StatCardGridProps>(
  ({ className, columns = 'auto', ...props }, ref) => {
    const gridClass = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    }[columns]

    return (
      <div
        ref={ref}
        className={cn('grid gap-4', gridClass, className)}
        {...props}
      />
    )
  }
)

StatCardGrid.displayName = 'StatCardGrid'

export { StatCard, StatCardGrid, statCardVariants, TrendIndicator }
