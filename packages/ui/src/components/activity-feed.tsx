'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { Badge } from './badge'
import { Skeleton } from './skeleton'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'invited'
  | 'joined'
  | 'left'
  | 'login'
  | 'logout'
  | 'subscribed'
  | 'unsubscribed'
  | 'upgraded'
  | 'downgraded'
  | 'payment'
  | 'error'
  | 'custom'

export interface ActivityItem {
  /** Unique identifier */
  id: string | number
  /** Activity type for icon/styling */
  type: ActivityType
  /** Main activity message */
  message: React.ReactNode
  /** Timestamp of the activity */
  timestamp: Date | string
  /** User who performed the action */
  user?: {
    name: string
    email?: string
    avatarUrl?: string
  }
  /** Additional metadata to display */
  metadata?: Record<string, React.ReactNode>
  /** Target resource affected */
  target?: {
    type: string
    name: string
    href?: string
  }
}

export interface ActivityFeedProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof activityFeedVariants> {
  /** Activity items to display */
  items: ActivityItem[]
  /** Show loading skeleton */
  loading?: boolean
  /** Number of skeleton items when loading */
  loadingCount?: number
  /** Empty state message */
  emptyMessage?: React.ReactNode
  /** Format function for timestamps */
  formatTimestamp?: (date: Date) => string
  /** Show timeline connector */
  showTimeline?: boolean
  /** Maximum items to show (enables "Show more" if exceeded) */
  maxItems?: number
  /** Called when "Show more" is clicked */
  onShowMore?: () => void
  /** Custom icon renderer by activity type */
  renderIcon?: (type: ActivityType) => React.ReactNode
}

// -----------------------------------------------------------------------------
// Variants
// -----------------------------------------------------------------------------

const activityFeedVariants = cva('', {
  variants: {
    size: {
      sm: '',
      default: '',
      lg: '',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

// -----------------------------------------------------------------------------
// Default Icons by Activity Type
// -----------------------------------------------------------------------------

const defaultIcons: Record<ActivityType, React.ReactNode> = {
  created: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  updated: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  deleted: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  invited: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  joined: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  left: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
    </svg>
  ),
  login: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  ),
  logout: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  subscribed: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  unsubscribed: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  upgraded: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  downgraded: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  payment: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  custom: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

// Icon background colors by type
const iconColors: Record<ActivityType, string> = {
  created: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  updated: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  deleted: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  invited: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  joined: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  left: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  login: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  subscribed: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  unsubscribed: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  upgraded: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  downgraded: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  payment: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  custom: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
}

// -----------------------------------------------------------------------------
// Default timestamp formatter
// -----------------------------------------------------------------------------

function defaultFormatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// -----------------------------------------------------------------------------
// Get user initials
// -----------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// -----------------------------------------------------------------------------
// ActivityFeedItem Component
// -----------------------------------------------------------------------------

interface ActivityFeedItemProps {
  item: ActivityItem
  formatTimestamp: (date: Date) => string
  renderIcon?: (type: ActivityType) => React.ReactNode
  showTimeline: boolean
  isLast: boolean
  size: 'sm' | 'default' | 'lg' | null | undefined
}

function ActivityFeedItem({
  item,
  formatTimestamp,
  renderIcon,
  showTimeline,
  isLast,
  size,
}: ActivityFeedItemProps) {
  const timestamp =
    item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
  const icon = renderIcon ? renderIcon(item.type) : defaultIcons[item.type]

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      {showTimeline && !isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border -translate-x-1/2" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full shrink-0',
          iconColors[item.type],
          size === 'sm' && 'h-6 w-6 [&_svg]:h-3 [&_svg]:w-3',
          size === 'default' && 'h-8 w-8',
          size === 'lg' && 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
          !size && 'h-8 w-8'
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* User */}
            {item.user && (
              <div className="flex items-center gap-2 mb-1">
                <Avatar className={cn(
                  size === 'sm' && 'h-5 w-5',
                  size === 'lg' && 'h-7 w-7',
                  !size || size === 'default' && 'h-6 w-6'
                )}>
                  {item.user.avatarUrl && (
                    <AvatarImage src={item.user.avatarUrl} alt={item.user.name} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(item.user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm truncate">
                  {item.user.name}
                </span>
              </div>
            )}

            {/* Message */}
            <p
              className={cn(
                'text-foreground',
                size === 'sm' && 'text-xs',
                size === 'lg' && 'text-base',
                (!size || size === 'default') && 'text-sm'
              )}
            >
              {item.message}
            </p>

            {/* Target */}
            {item.target && (
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal">
                  {item.target.type}
                </Badge>
                {item.target.href ? (
                  <a
                    href={item.target.href}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {item.target.name}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground truncate">
                    {item.target.name}
                  </span>
                )}
              </div>
            )}

            {/* Metadata */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <span key={key}>
                    <span className="font-medium">{key}:</span> {value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <time
            dateTime={timestamp.toISOString()}
            className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
          >
            {formatTimestamp(timestamp)}
          </time>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// ActivityFeed Component
// -----------------------------------------------------------------------------

/**
 * ActivityFeed component for displaying audit logs and activity history.
 * Supports various activity types with appropriate icons and styling.
 *
 * @example
 * ```tsx
 * const activities: ActivityItem[] = [
 *   {
 *     id: '1',
 *     type: 'created',
 *     message: 'Created a new project',
 *     timestamp: new Date(),
 *     user: { name: 'John Doe', avatarUrl: '/avatars/john.jpg' },
 *     target: { type: 'Project', name: 'My Project', href: '/projects/1' },
 *   },
 *   {
 *     id: '2',
 *     type: 'upgraded',
 *     message: 'Upgraded subscription to Pro plan',
 *     timestamp: new Date(Date.now() - 3600000),
 *     user: { name: 'Jane Smith' },
 *   },
 * ]
 *
 * <ActivityFeed items={activities} showTimeline />
 * ```
 */
const ActivityFeed = React.forwardRef<HTMLDivElement, ActivityFeedProps>(
  (
    {
      className,
      items,
      loading = false,
      loadingCount = 3,
      emptyMessage = 'No activity yet.',
      formatTimestamp = defaultFormatTimestamp,
      showTimeline = false,
      maxItems,
      onShowMore,
      renderIcon,
      size,
      ...props
    },
    ref
  ) => {
    const displayItems = maxItems ? items.slice(0, maxItems) : items
    const hasMore = maxItems ? items.length > maxItems : false

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn('space-y-4', activityFeedVariants({ size }), className)}
          {...props}
        >
          {Array.from({ length: loadingCount }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'py-8 text-center text-sm text-muted-foreground',
            className
          )}
          {...props}
        >
          {emptyMessage}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn('space-y-4', activityFeedVariants({ size }), className)}
        {...props}
      >
        {displayItems.map((item, index) => (
          <ActivityFeedItem
            key={item.id}
            item={item}
            formatTimestamp={formatTimestamp}
            renderIcon={renderIcon}
            showTimeline={showTimeline}
            isLast={index === displayItems.length - 1}
            size={size}
          />
        ))}

        {hasMore && onShowMore && (
          <button
            type="button"
            onClick={onShowMore}
            className="w-full py-2 text-sm text-primary hover:underline"
          >
            Show more ({items.length - displayItems.length} more)
          </button>
        )}
      </div>
    )
  }
)

ActivityFeed.displayName = 'ActivityFeed'

export { ActivityFeed, activityFeedVariants, defaultIcons as activityTypeIcons }
