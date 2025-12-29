'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { User, LogOut, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BRAND_COLORS } from '@/lib/colors';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SuperAdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Super Admin', href: '/superadmin' },
    ];

    if (paths.length > 1) {
      const section = paths[1];
      const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label: sectionLabel,
        href: `/superadmin/${section}`,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const userInitials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'SA';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-primary bg-background-primary" role="banner">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb navigation" className="flex-1">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="text-text-primary" aria-current="page">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href} className="text-text-secondary hover:text-text-primary">
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        {/* Search Bar - TODO: Implement global search in Phase 2 */}
        <div className="hidden md:flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-elevated border-border-primary"
              disabled
              aria-label="Global search (coming soon)"
            />
          </div>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="User menu">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || 'Super Admin')}&background=${BRAND_COLORS.purple.replace('#', '')}&color=fff&size=100`}
                  alt={session?.user?.name || 'Super Admin'}
                  style={{ backgroundColor: 'var(--zenthea-purple)' }}
                />
                <AvatarFallback className="bg-zenthea-purple text-text-inverse">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-text-primary">
                  {session?.user?.name || 'Super Admin'}
                </p>
                <p className="text-xs leading-none text-text-secondary">
                  {session?.user?.email}
                </p>
                <p className="text-xs leading-none text-text-tertiary mt-1">
                  Role: {session?.user?.role || 'super_admin'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/superadmin" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

