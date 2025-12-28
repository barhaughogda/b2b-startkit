'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * Header variants
 */
const headerVariants = cva(
  'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6',
  {
    variants: {
      variant: {
        default: 'bg-background',
        transparent: 'bg-transparent border-transparent',
        inset: 'bg-muted/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * App header component
 * Typically contains sidebar trigger (mobile), breadcrumbs, and user menu
 *
 * @example
 * <Header>
 *   <HeaderLeft>
 *     <SidebarTrigger />
 *     <Breadcrumbs />
 *   </HeaderLeft>
 *   <HeaderRight>
 *     <UserButton />
 *   </HeaderRight>
 * </Header>
 */
interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {}

function Header({ className, variant, children, ...props }: HeaderProps) {
  return (
    <header className={cn(headerVariants({ variant }), className)} {...props}>
      {children}
    </header>
  )
}

/**
 * Header left section
 */
interface HeaderLeftProps extends React.HTMLAttributes<HTMLDivElement> {}

function HeaderLeft({ className, children, ...props }: HeaderLeftProps) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Header center section (optional)
 */
interface HeaderCenterProps extends React.HTMLAttributes<HTMLDivElement> {}

function HeaderCenter({ className, children, ...props }: HeaderCenterProps) {
  return (
    <div
      className={cn('hidden flex-1 items-center justify-center md:flex', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Header right section (user menu, notifications, etc.)
 */
interface HeaderRightProps extends React.HTMLAttributes<HTMLDivElement> {}

function HeaderRight({ className, children, ...props }: HeaderRightProps) {
  return (
    <div className={cn('ml-auto flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Header title (for pages without sidebar or mobile views)
 */
interface HeaderTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function HeaderTitle({ className, children, ...props }: HeaderTitleProps) {
  return (
    <h1 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h1>
  )
}

/**
 * Header separator
 */
interface HeaderSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

function HeaderSeparator({ className, ...props }: HeaderSeparatorProps) {
  return (
    <div
      className={cn('h-6 w-px bg-border', className)}
      role="separator"
      aria-orientation="vertical"
      {...props}
    />
  )
}

export {
  Header,
  HeaderLeft,
  HeaderCenter,
  HeaderRight,
  HeaderTitle,
  HeaderSeparator,
  headerVariants,
}

export type {
  HeaderProps,
  HeaderLeftProps,
  HeaderCenterProps,
  HeaderRightProps,
  HeaderTitleProps,
  HeaderSeparatorProps,
}
