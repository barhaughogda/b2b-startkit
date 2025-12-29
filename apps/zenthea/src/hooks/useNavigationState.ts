'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for managing navigation UI state
 */
export function useNavigationState() {
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const toggleAvatarMenu = useCallback(() => {
    setIsAvatarMenuOpen(prev => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  return {
    // State
    isAvatarMenuOpen,
    hoveredItem,
    searchQuery,
    isCollapsed,
    isMobileMenuOpen,
    activeItem,
    
    // Setters
    setHoveredItem,
    setSearchQuery,
    setActiveItem,
    
    // Toggle functions
    toggleAvatarMenu,
    toggleSidebar,
    toggleMobileMenu,
  };
}
