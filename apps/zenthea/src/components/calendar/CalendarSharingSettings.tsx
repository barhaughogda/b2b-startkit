'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Trash2, Eye, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

interface CalendarSharingSettingsProps {
  userId: Id<'users'>;
  tenantId: string;
}

export function CalendarSharingSettings({ userId, tenantId }: CalendarSharingSettingsProps) {
  const { data: session } = useZentheaSession();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get current user's tenantId from session for validation (source of truth)
  const currentUserTenantId = session?.user?.tenantId;

  // CRITICAL: Use session tenantId as source of truth to prevent cross-tenant access
  // If prop tenantId doesn't match session, use session tenantId for security
  const validTenantId = currentUserTenantId || tenantId;

  // Security check: Warn if tenantId prop doesn't match session (shouldn't happen in production)
  useEffect(() => {
    if (currentUserTenantId && tenantId && currentUserTenantId !== tenantId) {
      console.warn(
        'CalendarSharingSettings: tenantId prop does not match session tenantId. Using session tenantId for security.',
        { propTenantId: tenantId, sessionTenantId: currentUserTenantId }
      );
    }
  }, [currentUserTenantId, tenantId]);

  // Get users in the tenant (for sharing) - only query if we have a valid tenantId
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    validTenantId ? { tenantId: validTenantId } : 'skip'
  );

  // Get current calendar shares
  const calendarShares = useQuery(
    api.calendarShares.getCalendarShares,
    userId && validTenantId
      ? {
          ownerUserId: userId,
          tenantId: validTenantId,
        }
      : 'skip'
  );

  // Mutations
  const shareCalendar = useMutation(api.calendarShares.shareCalendar);
  const revokeShare = useMutation(api.calendarShares.revokeCalendarShare);
  const updatePermission = useMutation(api.calendarShares.updateCalendarSharePermission);

  // Filter users by search email and ensure tenant isolation
  // CRITICAL: Only show company employees (staff/clinic users), NOT patients (clients)
  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !validTenantId) return [];
    
    // Filter out the current user and users who already have access
    const shareUserIds = new Set(calendarShares?.map((share: { sharedWithUserId: Id<'users'> }) => share.sharedWithUserId) || []);
    
    // Define company employee roles (exclude patients/clients)
    const companyEmployeeRoles = ['admin', 'provider', 'clinic_user', 'demo', 'super_admin'];
    
    return tenantUsers.filter(user => {
      // CRITICAL: Ensure user belongs to the same tenant (defensive check)
      if (user.tenantId !== validTenantId) {
        return false;
      }
      
      // CRITICAL: Exclude patients - only show company employees
      if (user.role === 'patient') {
        return false;
      }
      
      // Additional safety: ensure role is in the allowed list
      if (!companyEmployeeRoles.includes(user.role)) {
        return false;
      }
      
      const matchesSearch = !searchEmail || 
        user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchEmail.toLowerCase());
      
      return user._id !== userId && 
             !shareUserIds.has(user._id) &&
             matchesSearch;
    });
  }, [tenantUsers, calendarShares, userId, searchEmail, validTenantId]);

  // Calculate dropdown position using viewport coordinates (for fixed positioning)
  const updateDropdownPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below input (viewport coordinates for fixed positioning)
        left: rect.left, // viewport coordinates for fixed positioning
        width: rect.width,
      });
    }
  };

  // Update position when dropdown opens or window resizes/scrolls
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      updateDropdownPosition();
      
      // Use requestAnimationFrame for smooth updates during scroll
      let rafId: number | null = null;
      const handleScrollOptimized = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          updateDropdownPosition();
        });
      };
      
      const handleResize = () => {
        updateDropdownPosition();
      };
      
      // Listen to scroll on window and document
      window.addEventListener('scroll', handleScrollOptimized, true);
      document.addEventListener('scroll', handleScrollOptimized, true);
      window.addEventListener('resize', handleResize);
      
      // Also listen to scroll on all scrollable parent elements
      const scrollableParents: HTMLElement[] = [];
      let element: HTMLElement | null = searchInputRef.current.parentElement;
      while (element && element !== document.body) {
        const overflow = window.getComputedStyle(element).overflow;
        if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
          scrollableParents.push(element);
          element.addEventListener('scroll', handleScrollOptimized, true);
        }
        element = element.parentElement;
      }
      
      return () => {
        window.removeEventListener('scroll', handleScrollOptimized, true);
        document.removeEventListener('scroll', handleScrollOptimized, true);
        window.removeEventListener('resize', handleResize);
        if (rafId !== null) cancelAnimationFrame(rafId);
        scrollableParents.forEach(parent => {
          parent.removeEventListener('scroll', handleScrollOptimized, true);
        });
      };
    }
  }, [isSearchOpen, searchEmail, filteredUsers.length]);

  // Handle user selection from dropdown
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsSearchOpen(false);
    setSearchEmail('');
    setHighlightedIndex(-1);
    setDropdownPosition(null);
    searchInputRef.current?.blur();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSearchOpen || filteredUsers.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => 
            prev < filteredUsers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredUsers.length) {
            const selectedUser = filteredUsers[highlightedIndex];
            if (selectedUser) {
              setSelectedUserId(selectedUser._id);
              setIsSearchOpen(false);
              setSearchEmail('');
              setHighlightedIndex(-1);
              searchInputRef.current?.blur();
            }
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsSearchOpen(false);
          setHighlightedIndex(-1);
          searchInputRef.current?.blur();
          break;
      }
    };

    if (isSearchOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, filteredUsers, highlightedIndex]);

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        dropdownRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
        setDropdownPosition(null);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  const handleShare = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user to share with');
      return;
    }

    try {
      await shareCalendar({
        ownerUserId: userId,
        sharedWithUserId: selectedUserId as Id<'users'>,
        permission: selectedPermission,
        tenantId: validTenantId,
      });
      
      toast.success('Calendar shared successfully');
      setSelectedUserId('');
      setSelectedPermission('view');
      setSearchEmail('');
      setIsSearchOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share calendar');
    }
  };

  const handleRevoke = async (sharedWithUserId: Id<'users'>) => {
    try {
      await revokeShare({
        ownerUserId: userId,
        sharedWithUserId,
        tenantId: validTenantId,
      });
      
      toast.success('Calendar access revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke access');
    }
  };

  const handleUpdatePermission = async (sharedWithUserId: Id<'users'>, newPermission: 'view' | 'edit') => {
    try {
      await updatePermission({
        ownerUserId: userId,
        sharedWithUserId,
        permission: newPermission,
        tenantId: validTenantId,
      });
      
      toast.success('Permission updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permission');
    }
  };

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Calendar Sharing
        </CardTitle>
        <CardDescription>
          Share your calendar with other company employees (staff members). They can view or edit your appointments. Patients cannot access shared calendars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-visible">
        {/* Add new share */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Share with User
          </h3>
          
          <div className="flex gap-2 relative">
            <div className="flex-1 relative" style={{ zIndex: isSearchOpen ? 100 : 'auto' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                placeholder="Search by email or name..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setHighlightedIndex(-1);
                  updateDropdownPosition();
                }}
                onClick={() => {
                  setIsSearchOpen(true);
                  setHighlightedIndex(-1);
                  updateDropdownPosition();
                }}
                className="pl-10"
              />
              
              {isSearchOpen && filteredUsers.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                  }}
                >
                  {filteredUsers.map((user, index) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleUserSelect(user._id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-4 py-2 transition-colors cursor-pointer first:rounded-t-md last:rounded-b-md ${
                        highlightedIndex === index
                          ? 'bg-surface-interactive'
                          : 'hover:bg-surface-interactive'
                      }`}
                    >
                      <div className="font-medium text-text-primary">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : user.name}
                      </div>
                      <div className="text-sm text-text-secondary">{user.email}</div>
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>

          {isSearchOpen && filteredUsers.length === 0 && tenantUsers && (
            <p className="text-sm text-text-secondary px-1">
              {searchEmail 
                ? 'No company employees found matching your search. Calendar sharing is only available for staff members, not patients.'
                : 'No company employees available to share with. Calendar sharing is only available for staff members, not patients.'}
            </p>
          )}

          {selectedUserId && (
            <div className="flex gap-2">
              <Select value={selectedPermission} onValueChange={(value: 'view' | 'edit') => setSelectedPermission(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleShare} className="flex-1">
                Share Calendar
              </Button>
            </div>
          )}

        </div>

        {/* Existing shares */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Shared With</h3>
          
          {calendarShares === undefined ? (
            <p className="text-sm text-text-secondary">Loading...</p>
          ) : calendarShares.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No one has access to your calendar yet.
            </p>
          ) : (
            <div className="space-y-2">
              {calendarShares.map((share: { _id: string; sharedWithUserId: Id<'users'>; sharedWith?: { name?: string; email?: string; firstName?: string; lastName?: string } | null; permission: 'view' | 'edit' }) => {
                const user = share.sharedWith;
                if (!user) return null;

                return (
                  <div
                    key={share._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : user.name}
                      </div>
                      <div className="text-sm text-text-secondary">{user.email}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={share.permission}
                        onValueChange={(value: 'view' | 'edit') =>
                          handleUpdatePermission(share.sharedWithUserId, value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(share.sharedWithUserId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


