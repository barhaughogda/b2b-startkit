'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { SearchModal } from './SearchModal';
import {
  Home,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  NavigationHeaderProps
} from '@/types/navigation';
import { useProviderProfile } from '@/hooks/useProviderProfile';

/**
 * Shared navigation header component for provider pages
 * Provides consistent navigation, search, and user menu functionality
 */
export function ProviderNavigationHeader({
  pageTitle,
  pagePath,
  showHomeButton = false,
  showSearch = true,
  showNotifications = false, // Remove notifications by default
  notificationCount = 0,
  className = "",
}: NavigationHeaderProps) {
  const router = useRouter();
  const { data: session } = useZentheaSession();
  const { signOut } = useClerk();

  // Fetch provider profile to get avatar
  const { profile: providerProfile } = useProviderProfile();
  const providerAvatar = providerProfile?.professionalPhotoUrl;

  // Navigation state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);


  // Navigation handlers
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleSearchToggle = () => {
    setSearchModalOpen(true);
  };

  const handleNotificationClick = () => {
    // TODO: Implement notification functionality
    // Notification handler will be implemented in a future PR
  };

  const handleAvatarMenuToggle = () => {
    setIsAvatarMenuOpen(!isAvatarMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
    <header className={`fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-transparent ${className}`}>
      {/* Left side - Avatar and Home button */}
      <div className="flex items-center gap-2 px-4">
        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-12 w-12 rounded-full hover:bg-surface-interactive transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={providerAvatar || undefined} alt="User avatar" />
                <AvatarFallback className="text-sm font-medium">
                  {session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigation('/company/user/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation('/company/user/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showHomeButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/company/dashboard')}
            className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
            aria-label="Go to dashboard"
            title="Dashboard"
          >
            <Home className="h-5 w-5 text-text-primary" />
          </Button>
        )}
      </div>


      {/* Right side - Search (collapsible), theme, language */}
      <div className="ml-auto flex items-center gap-2 px-4">
        {/* Search button (collapsible) */}
        {showSearch && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearchToggle}
            className="h-10 w-10 rounded-full hover:bg-surface-interactive transition-colors"
            aria-label="Toggle search"
            title="Search"
          >
            <Search className="h-5 w-5 text-text-primary" />
          </Button>
        )}



      </div>
    </header>

    {/* Search Modal */}
    <SearchModal
      isOpen={searchModalOpen}
      onClose={() => setSearchModalOpen(false)}
    />
    </>
  );
}
