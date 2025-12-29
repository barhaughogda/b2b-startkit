'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  BarChart3,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  /** Whether the sidebar is open (for mobile) */
  isOpen?: boolean;
  /** Callback to close sidebar (for mobile) */
  onClose?: () => void;
  /** Custom className */
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/company/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/company/settings/users', icon: Users },
  { name: 'Settings', href: '/company/settings', icon: Settings },
  { name: 'Security', href: '/company/settings/security', icon: Shield },
  { name: 'Analytics', href: '/company/settings/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/company/settings/reports', icon: FileText },
];

/**
 * Admin sidebar navigation component
 * Provides navigation for admin pages with active route highlighting
 */
export function AdminSidebar({
  isOpen = false,
  onClose,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Navigation will happen via Link component
      if (onClose) {
        onClose();
      }
    }
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && onClose) {
              onClose();
            }
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 flex-col border-r border-border-primary bg-surface-elevated transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className
        )}
        role="navigation"
        aria-label="Admin navigation"
        data-testid="admin-sidebar"
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-interactive-primary focus:ring-offset-2',
                  isActive
                    ? 'bg-interactive-primary text-text-inverse'
                    : 'text-text-secondary hover:bg-surface-interactive hover:text-text-primary'
                )}
                onClick={onClose}
                onKeyDown={handleKeyDown}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive
                      ? 'text-text-inverse'
                      : 'text-text-tertiary group-hover:text-text-primary'
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

