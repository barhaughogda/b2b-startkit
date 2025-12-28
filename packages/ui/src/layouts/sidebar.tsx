'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * Sidebar context for managing state across components
 */
interface SidebarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

/**
 * Sidebar provider for managing responsive sidebar state
 */
interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
  defaultCollapsed?: boolean
}

function SidebarProvider({
  children,
  defaultOpen = false,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

/**
 * Sidebar variants
 */
const sidebarVariants = cva(
  'fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-sidebar transition-all duration-200 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-sidebar',
        inset: 'bg-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

/**
 * Main sidebar container component
 * Responsive: drawer on mobile, fixed sidebar on desktop
 *
 * @example
 * <SidebarProvider>
 *   <Sidebar>
 *     <SidebarHeader>Logo</SidebarHeader>
 *     <SidebarContent>
 *       <SidebarNav>...</SidebarNav>
 *     </SidebarContent>
 *     <SidebarFooter>User</SidebarFooter>
 *   </Sidebar>
 *   <SidebarInset>
 *     <main>...</main>
 *   </SidebarInset>
 * </SidebarProvider>
 */
interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sidebarVariants> {
  collapsible?: boolean
}

function Sidebar({
  className,
  variant,
  collapsible = true,
  children,
  ...props
}: SidebarProps) {
  const { open, setOpen, collapsed } = useSidebar()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          sidebarVariants({ variant }),
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  )
}

/**
 * Sidebar header section (logo, brand, org switcher)
 */
interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarHeader({ className, children, ...props }: SidebarHeaderProps) {
  const { setOpen, collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex h-16 shrink-0 items-center gap-2 border-b px-4',
        collapsed && 'lg:justify-center lg:px-2',
        className
      )}
      {...props}
    >
      <div className={cn('flex-1', collapsed && 'lg:hidden')}>{children}</div>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
        aria-label="Close sidebar"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

/**
 * Sidebar content area (scrollable)
 */
interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarContent({ className, children, ...props }: SidebarContentProps) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Sidebar navigation group
 */
interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  label?: string
}

function SidebarNav({ className, label, children, ...props }: SidebarNavProps) {
  const { collapsed } = useSidebar()

  return (
    <nav className={cn('space-y-1', className)} {...props}>
      {label && !collapsed && (
        <span className="mb-2 block px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          {label}
        </span>
      )}
      {children}
    </nav>
  )
}

/**
 * Sidebar navigation item
 */
interface SidebarNavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: React.ComponentType<{ className?: string }>
  active?: boolean
  badge?: React.ReactNode
}

function SidebarNavItem({
  className,
  icon: Icon,
  active,
  badge,
  children,
  ...props
}: SidebarNavItemProps) {
  const { collapsed, setOpen } = useSidebar()

  return (
    <a
      onClick={() => setOpen(false)}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'lg:justify-center lg:px-2',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span className="flex-1 truncate">{children}</span>}
      {!collapsed && badge && <span className="shrink-0">{badge}</span>}
    </a>
  )
}

/**
 * Sidebar footer section (user menu, etc.)
 */
interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarFooter({ className, children, ...props }: SidebarFooterProps) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'shrink-0 border-t p-4',
        collapsed && 'lg:px-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Sidebar collapse toggle button
 */
interface SidebarCollapseToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function SidebarCollapseToggle({
  className,
  ...props
}: SidebarCollapseToggleProps) {
  const { collapsed, setCollapsed } = useSidebar()

  return (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className={cn(
        'hidden rounded-md p-2 hover:bg-sidebar-accent lg:flex',
        className
      )}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      {...props}
    >
      {collapsed ? (
        <PanelLeft className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </button>
  )
}

/**
 * Sidebar trigger button for mobile
 */
interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }>
}

function SidebarTrigger({
  className,
  icon: Icon = PanelLeft,
  ...props
}: SidebarTriggerProps) {
  const { setOpen } = useSidebar()

  return (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'rounded-md p-2 hover:bg-accent lg:hidden',
        className
      )}
      aria-label="Open sidebar"
      {...props}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

/**
 * Main content area inset from sidebar
 */
interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarInset({ className, children, ...props }: SidebarInsetProps) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col transition-all duration-200',
        collapsed ? 'lg:pl-16' : 'lg:pl-64',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Sidebar separator
 */
interface SidebarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
  return (
    <div
      className={cn('my-4 h-px bg-sidebar-border', className)}
      role="separator"
      {...props}
    />
  )
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  SidebarCollapseToggle,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  useSidebar,
}

export type {
  SidebarProviderProps,
  SidebarProps,
  SidebarHeaderProps,
  SidebarContentProps,
  SidebarNavProps,
  SidebarNavItemProps,
  SidebarFooterProps,
  SidebarCollapseToggleProps,
  SidebarTriggerProps,
  SidebarInsetProps,
  SidebarSeparatorProps,
}
