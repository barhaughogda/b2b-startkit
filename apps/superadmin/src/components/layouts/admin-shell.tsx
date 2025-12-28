'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@startkit/ui'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Flag,
  Activity,
  Settings,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { useState } from 'react'
import type { SuperadminContext } from '@/lib/auth'

interface AdminShellProps {
  admin: SuperadminContext
  children: React.ReactNode
}

/**
 * Admin Shell with navigation
 * 
 * Dark-themed sidebar with superadmin-specific navigation
 */
export function AdminShell({ admin, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">
                <span className="text-primary">Start</span>Kit Admin
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin badge */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2">
              <Shield className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">SUPERADMIN</p>
                <p className="truncate text-xs text-muted-foreground">
                  {admin.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <NavSection title="Overview">
              <NavItem href="/dashboard" icon={LayoutDashboard}>
                Dashboard
              </NavItem>
              <NavItem href="/activity" icon={Activity}>
                Activity Log
              </NavItem>
            </NavSection>

            <NavSection title="Management">
              <NavItem href="/organizations" icon={Building2}>
                Organizations
              </NavItem>
              <NavItem href="/users" icon={Users}>
                Users
              </NavItem>
              <NavItem href="/subscriptions" icon={CreditCard}>
                Subscriptions
              </NavItem>
            </NavSection>

            <NavSection title="Configuration">
              <NavItem href="/feature-flags" icon={Flag}>
                Feature Flags
              </NavItem>
              <NavItem href="/settings" icon={Settings}>
                Settings
              </NavItem>
            </NavSection>
          </nav>

          {/* User menu */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{admin.name || 'Admin'}</p>
                <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">StartKit Admin</span>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}
