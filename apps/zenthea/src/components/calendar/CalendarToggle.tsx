'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Calendar } from 'lucide-react';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

interface CalendarToggleProps {
  userId: Id<'users'>;
  tenantId: string;
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

type ViewMode = 'own' | 'all' | 'custom';

export function CalendarToggle({
  userId,
  tenantId,
  selectedUserIds,
  onSelectionChange,
}: CalendarToggleProps) {
  const { data: session } = useZentheaSession();
  const [viewMode, setViewMode] = useState<ViewMode>('own');
  const [customSelections, setCustomSelections] = useState<Set<Id<'users'>>>(new Set([userId]));

  // Get calendars shared with current user
  const sharedCalendars = useQuery(
    api.calendarShares.getSharedCalendars,
    userId && tenantId
      ? {
          userId,
          tenantId,
        }
      : 'skip'
  );

  // Update custom selections when shared calendars change
  useEffect(() => {
    if (sharedCalendars) {
      const ownerIds = sharedCalendars.map((share: { ownerUserId: Id<'users'> }) => share.ownerUserId);
      setCustomSelections(prev => {
        const newSet = new Set(prev);
        // Keep own calendar and any previously selected shared calendars
        newSet.add(userId);
        ownerIds.forEach((id: Id<'users'>) => {
          if (prev.has(id)) {
            newSet.add(id);
          }
        });
        return newSet;
      });
    }
  }, [sharedCalendars, userId]);

  // Update selectedUserIds based on view mode
  useEffect(() => {
    if (viewMode === 'own') {
      onSelectionChange([userId as string]);
    } else if (viewMode === 'all') {
      const allUserIds: string[] = [userId as string];
      if (sharedCalendars) {
        sharedCalendars.forEach((share: { ownerUserId: Id<'users'> }) => {
          if (!allUserIds.includes(share.ownerUserId as string)) {
            allUserIds.push(share.ownerUserId as string);
          }
        });
      }
      onSelectionChange(allUserIds);
    } else {
      // Custom mode - use customSelections
      onSelectionChange(Array.from(customSelections) as string[]);
    }
  }, [viewMode, userId, sharedCalendars, customSelections, onSelectionChange]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleCustomToggle = (targetUserId: Id<'users'>) => {
    setCustomSelections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetUserId)) {
        // Don't allow unselecting own calendar
        if (targetUserId === userId) {
          return prev;
        }
        newSet.delete(targetUserId);
      } else {
        newSet.add(targetUserId);
      }
      return newSet;
    });
  };

  const allAvailableUserIds = useMemo(() => {
    const ids: Id<'users'>[] = [userId];
    if (sharedCalendars) {
      sharedCalendars.forEach((share: { ownerUserId: Id<'users'> }) => {
        if (!ids.includes(share.ownerUserId)) {
          ids.push(share.ownerUserId);
        }
      });
    }
    return ids;
  }, [userId, sharedCalendars]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Calendar View
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="view-own" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="h-4 w-4" />
              My Calendar Only
            </Label>
            <Switch
              id="view-own"
              checked={viewMode === 'own'}
              onCheckedChange={() => handleViewModeChange('own')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="view-all" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              All Shared Calendars
            </Label>
            <Switch
              id="view-all"
              checked={viewMode === 'all'}
              onCheckedChange={() => handleViewModeChange('all')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="view-custom" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              Custom Selection
            </Label>
            <Switch
              id="view-custom"
              checked={viewMode === 'custom'}
              onCheckedChange={() => handleViewModeChange('custom')}
            />
          </div>
        </div>

        {/* Custom Selection Checkboxes */}
        {viewMode === 'custom' && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-text-secondary">Select calendars to view:</Label>
            <div className="space-y-2">
              {allAvailableUserIds.map((targetUserId: any) => {
                const isOwn = targetUserId === userId;
                const share = sharedCalendars?.find((s: { ownerUserId: Id<'users'>; owner?: { firstName?: string; lastName?: string; name?: string } | null }) => s.ownerUserId === targetUserId);
                const userName = isOwn
                  ? 'My Calendar'
                  : share?.owner
                    ? `${share.owner.firstName || ''} ${share.owner.lastName || ''}`.trim() || share.owner.name
                    : 'Unknown User';

                return (
                  <div key={targetUserId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`calendar-${targetUserId}`}
                      checked={customSelections.has(targetUserId)}
                      onCheckedChange={() => handleCustomToggle(targetUserId)}
                      disabled={isOwn} // Own calendar always selected
                    />
                    <Label
                      htmlFor={`calendar-${targetUserId}`}
                      className={`text-sm cursor-pointer ${isOwn ? 'font-medium' : ''}`}
                    >
                      {userName}
                      {share && (
                        <span className="text-xs text-text-secondary ml-1">
                          ({share.permission === 'edit' ? 'Edit' : 'View'})
                        </span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t text-xs text-text-secondary">
          Showing {selectedUserIds.length} calendar{selectedUserIds.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
}


