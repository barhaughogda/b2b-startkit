'use client';

import React from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminHeaderProps {
  /** Callback to toggle sidebar (for mobile) */
  onMenuToggle?: () => void;
  /** Whether sidebar is open (for mobile) */
  isSidebarOpen?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Admin header component
 * Displays user information, sign out functionality, and mobile menu toggle
 */
export function AdminHeader({
  onMenuToggle,
  isSidebarOpen = false,
  className,
}: AdminHeaderProps) {
  const { data: session } = useZentheaSession();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      toast.error('Failed to sign out. Please try again.');
      console.error('Sign out error:', error);
    }
  };

  const userInitials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'A';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border-primary bg-surface-elevated px-4',
        className
      )}
      role="banner"
      data-testid="admin-header"
    >
      {/* Left side - Mobile menu button and title */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden h-10 w-10 hover:bg-surface-interactive"
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isSidebarOpen}
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </Button>

        {/* Admin title */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-text-primary">Admin</h1>
          {session?.user?.tenantId && (
            <p className="text-xs text-text-tertiary">Tenant: {session.user.tenantId}</p>
          )}
        </div>
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center gap-2">
        {/* User info display */}
        {session?.user && (
          <div className="hidden sm:flex flex-col items-end mr-2">
            <p className="text-sm font-medium text-text-primary">{session.user.name}</p>
            <p className="text-xs text-text-tertiary capitalize">{session.user.role}</p>
          </div>
        )}

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-10 w-10">
                {session?.user?.image && (
                  <AvatarImage src={session.user.image} alt="User avatar" />
                )}
                <AvatarFallback className="text-sm font-medium bg-interactive-primary text-text-inverse">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-text-primary">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs leading-none text-text-tertiary">
                  {session?.user?.email}
                </p>
                {session?.user?.role && (
                  <p className="text-xs leading-none text-text-tertiary capitalize mt-1">
                    Role: {session.user.role}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // TODO: Navigate to profile page when implemented
              }}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // TODO: Navigate to settings page when implemented
              }}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-status-error focus:text-status-error"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

