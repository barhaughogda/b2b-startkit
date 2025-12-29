'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  BarChart3,
  Database,
  Image as ImageIcon,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/superadmin',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenants',
    href: '/superadmin/tenants',
    icon: Building2,
  },
  {
    title: 'Users',
    href: '/superadmin/users',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/superadmin/settings',
    icon: Settings,
  },
  {
    title: 'Security',
    href: '/superadmin/security',
    icon: Shield,
  },
  {
    title: 'Support Access',
    href: '/superadmin/support-access',
    icon: KeyRound,
  },
  {
    title: 'Analytics',
    href: '/superadmin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Database',
    href: '/superadmin/database',
    icon: Database,
  },
];

// Legacy items that already exist
const legacyItems: NavItem[] = [
  {
    title: 'Image Uploader',
    href: '/superadmin/image-uploader',
    icon: ImageIcon,
  },
  {
    title: 'Logo Uploader',
    href: '/superadmin/logo-uploader',
    icon: ImageIcon,
  },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16" aria-label="Super Admin navigation">
      <div className="flex-1 flex flex-col min-h-0 border-r border-border-primary bg-background-secondary">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1" aria-label="Super Admin navigation">
            {/* Main Navigation */}
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-interactive-primary text-text-inverse'
                      : 'text-text-secondary hover:bg-surface-interactive hover:text-text-primary'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Navigate to ${item.title}`}
                >
                  <Icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-text-inverse' : 'text-text-tertiary group-hover:text-text-primary'
                    )}
                    aria-hidden="true"
                  />
                  {item.title}
                  {item.badge && (
                    <span className="ml-auto bg-status-error text-text-inverse text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Separator */}
            <div className="pt-4 mt-4 border-t border-border-primary">
              <p className="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                Tools
              </p>
            </div>

            {/* Legacy Items */}
            {legacyItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-interactive-primary text-text-inverse'
                      : 'text-text-secondary hover:bg-surface-interactive hover:text-text-primary'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Navigate to ${item.title}`}
                >
                  <Icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-text-inverse' : 'text-text-tertiary group-hover:text-text-primary'
                    )}
                    aria-hidden="true"
                  />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

