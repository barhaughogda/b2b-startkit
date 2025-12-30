'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useProviderProfile } from '@/hooks/useProviderProfile';

interface ProviderAvatarMenuProps {
  className?: string;
}

export function ProviderAvatarMenu({ className = "" }: ProviderAvatarMenuProps) {
  const { data: session } = useZentheaSession();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // Fetch provider profile to get avatar
  const { profile: providerProfile } = useProviderProfile();
  const providerAvatar = providerProfile?.professionalPhotoUrl;
  
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  // Generate fallback avatar URL
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || 'Provider')}&background=008080&color=fff&size=100`;
  const finalFallbackUrl = 'https://ui-avatars.com/api/?name=Dr+Smith&background=008080&color=fff&size=100';
  
  // Determine which image source to use
  const imageSrc = imageError 
    ? finalFallbackUrl 
    : (providerAvatar || fallbackAvatarUrl);
  
  // Reset error state when avatar changes
  useEffect(() => {
    setImageError(false);
  }, [providerAvatar]);
  
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleAvatarMenuToggle = () => {
    setIsAvatarMenuOpen(!isAvatarMenuOpen);
  };

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  const userMenuItems = [
    {
      id: 'profile',
      title: 'Profile',
      url: '/company/user/profile',
      icon: User,
    },
    {
      id: 'settings',
      title: 'Settings',
      url: '/company/user/settings',
      icon: Settings,
    },
    {
      id: 'separator',
      title: '',
      url: '',
      icon: User,
      isSeparator: true,
    },
    {
      id: 'logout',
      title: 'Logout',
      url: '',
      icon: LogOut,
      onClick: handleLogout,
    },
  ];

  return (
    <div className={`fixed top-6 left-6 z-20 ${className}`}>
      <div className="relative">
        <button
          onClick={handleAvatarMenuToggle}
          onMouseEnter={() => setHoveredItem('avatar')}
          onMouseLeave={() => setHoveredItem(null)}
          className={`relative w-[60px] h-[60px] rounded-full overflow-hidden transition-all duration-300 ${
            hoveredItem === 'avatar' ? 'scale-110' : 'scale-100'
          }`}
          aria-haspopup="menu"
          aria-expanded={isAvatarMenuOpen}
          aria-label="User menu"
        >
          <Image
            src={imageSrc}
            alt="User Avatar"
            width={60}
            height={60}
            className="w-full h-full object-cover"
            onError={() => {
              // Use React state to trigger fallback instead of direct DOM manipulation
              // This is the correct approach for Next.js Image component
              if (!imageError) {
                setImageError(true);
              }
            }}
          />
          {/* Genie effect */}
          <div className={`absolute inset-0 rounded-full bg-zenthea-teal/20 transition-all duration-300 ${
            hoveredItem === 'avatar' ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
          }`}></div>
        </button>

        {/* Dropdown sub-menu */}
        {isAvatarMenuOpen && (
          <div
            className="absolute top-full left-0 mt-2 w-56 bg-surface-elevated rounded-md shadow-lg border border-border-primary/20 py-2 z-30"
            onMouseEnter={() => setHoveredItem('avatar')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="px-3 py-2 border-b border-border-primary/20">
              <p className="font-medium text-text-primary">{session?.user?.name || 'Provider'}</p>
              <p className="text-sm text-text-secondary">{session?.user?.email}</p>
            </div>
            {userMenuItems.map((item) => {
              if (item.isSeparator) {
                return <div key={item.id} className="border-t border-border-primary/20 my-1" />;
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else if (item.url) {
                      handleNavigation(item.url);
                    }
                    setIsAvatarMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-left hover:bg-surface-interactive transition-colors"
                >
                  <item.icon className="mr-3 h-4 w-4 text-text-secondary" />
                  <span className="text-text-primary">{item.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
