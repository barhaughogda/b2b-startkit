'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
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
  Search,
  User,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { canUseConvexQuery, isValidConvexIdForTable } from '@/lib/convexIdValidation';
import { getPatientProfileApi } from '@/lib/convex-api-types';

interface PatientNavigationHeaderProps {
  showSearch?: boolean;
  /** @deprecated Chat button has been removed. This prop is kept for backward compatibility but has no effect. */
  showChat?: boolean;
  className?: string;
}

/**
 * Patient Portal navigation header component
 * Provides consistent navigation, search, and user menu functionality
 * Matches the Provider Portal navigation style
 */
export function PatientNavigationHeader({
  showSearch = true,
  showChat = true,
  className = "",
}: PatientNavigationHeaderProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  
  // Navigation state
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Fetch patient profile to get avatar
  const patientEmail = session?.user?.email?.trim() || '';
  const tenantId = session?.user?.tenantId?.trim() || 'demo-tenant';
  const canQueryByEmail = canUseConvexQuery(session?.user?.id, tenantId);
  
  const patientProfileApi = getPatientProfileApi(api) || (api as any).patientProfile;
  
  const foundPatientId = useQuery(
    (patientProfileApi?.findPatientByEmail || (api as any).patientProfile?.findPatientByEmail) as any,
    canQueryByEmail && patientEmail && patientEmail.length > 0 
      ? { email: patientEmail, tenantId } 
      : 'skip'
  ) as Id<'patients'> | null | undefined;

  const isValidPatientId = foundPatientId && isValidConvexIdForTable(foundPatientId, 'patients');

  const patientProfile = useQuery(
    (patientProfileApi?.getPatientProfile || (api as any).patientProfile?.getPatientProfile) as any,
    isValidPatientId
      ? { patientId: foundPatientId as Id<'patients'> }
      : 'skip'
  ) as any;

  const patientAvatar = patientProfile?.avatar;
  
  // Add cache-busting parameter to avatar URL to ensure it updates when changed
  // Use updatedAt timestamp to bust cache only when profile actually changes
  // This ensures the browser doesn't cache the old avatar image
  const avatarUrlWithCacheBust = patientAvatar && patientProfile?.updatedAt
    ? `${patientAvatar}${patientAvatar.includes('?') ? '&' : '?'}t=${patientProfile.updatedAt}`
    : patientAvatar;
  
  // Create a unique key for the Avatar component to force remount when avatar changes
  // This ensures the image refreshes immediately after upload
  // Key includes both avatar URL and updatedAt to detect any changes
  const avatarKey = patientAvatar 
    ? `${patientAvatar}-${patientProfile?.updatedAt || 'no-timestamp'}`
    : 'no-avatar';

  // Navigation handlers
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleSearchToggle = () => {
    setSearchModalOpen(true);
  };


  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/patient/login' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear bg-transparent ${className}`}>
        {/* Left side - User Avatar */}
        <div className="flex items-center gap-2 px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-12 w-12 rounded-full hover:bg-surface-interactive transition-colors"
                aria-label="User avatar"
              >
                <Avatar key={avatarKey} className="h-12 w-12">
                  <AvatarImage 
                    src={avatarUrlWithCacheBust || undefined} 
                    alt="User avatar"
                  />
                  <AvatarFallback className="text-sm font-medium bg-zenthea-teal text-white">
                    {session?.user?.name 
                      ? session.user.name.split(' ').map(n => n[0] || '').filter(Boolean).join('').toUpperCase() || 'P'
                      : 'P'}
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
              <DropdownMenuItem onClick={() => handleNavigation('/patient/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation('/patient/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation('/patient/billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Search and Chat */}
        <div className="ml-auto flex items-center gap-2 px-4">
          {/* Search button */}
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

