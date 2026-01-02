'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'own' | 'all' | 'custom';

interface CalendarFiltersBarProps {
  userId: string;
  tenantId: string;
  // Clinic filter props
  clinics: Array<{ id: string; name: string }> | undefined;
  selectedClinicId: string | undefined;
  onClinicChange: (clinicId: string | undefined) => void;
  // Calendar selection props
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

// Shared calendars migration pending
const SHARED_CALENDARS_PLACEHOLDER: any[] = [];

export function CalendarFiltersBar({
  userId,
  tenantId,
  clinics,
  selectedClinicId,
  onClinicChange,
  selectedUserIds,
  onSelectionChange,
}: CalendarFiltersBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('own');
  const [customSelections, setCustomSelections] = useState<Set<string>>(new Set([userId]));
  
  // Store callback in ref to avoid including it in useEffect dependencies
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const sharedCalendars = SHARED_CALENDARS_PLACEHOLDER;

  // Update custom selections when shared calendars change
  useEffect(() => {
    if (sharedCalendars && sharedCalendars.length > 0) {
      const ownerIds = (sharedCalendars as any[]).map((share) => share.ownerUserId);
      setCustomSelections(prev => {
        // Optimization: Only update if content actually changes
        let changed = false;
        if (!prev.has(userId)) changed = true;
        
        for (const id of ownerIds) {
          if (!prev.has(id)) {
            changed = true;
            break;
          }
        }
        
        if (!changed) return prev;

        const newSet = new Set(prev);
        newSet.add(userId);
        ownerIds.forEach((id) => {
          newSet.add(id);
        });
        return newSet;
      });
    }
  }, [sharedCalendars, userId]);

  // Update selectedUserIds based on view mode
  useEffect(() => {
    let nextSelection: string[] = [];
    
    if (viewMode === 'own') {
      nextSelection = [userId];
    } else if (viewMode === 'all') {
      nextSelection = [userId];
      if (sharedCalendars) {
        (sharedCalendars as any[]).forEach((share) => {
          const ownerId = share.ownerUserId;
          if (!nextSelection.includes(ownerId)) {
            nextSelection.push(ownerId);
          }
        });
      }
    } else {
      nextSelection = Array.from(customSelections);
    }

    // Only call parent update if selection has actually changed
    // to prevent unnecessary re-renders or potential loops
    const current = selectedUserIds || [];
    const isSame = current.length === nextSelection.length && 
                   nextSelection.every(id => current.includes(id));
    
    if (!isSame) {
      onSelectionChangeRef.current(nextSelection);
    }
  }, [viewMode, userId, sharedCalendars, customSelections, selectedUserIds]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleCustomToggle = (targetUserId: string) => {
    setCustomSelections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetUserId)) {
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
    const ids: string[] = [userId];
    if (sharedCalendars) {
      (sharedCalendars as any[]).forEach((share) => {
        if (!ids.includes(share.ownerUserId)) {
          ids.push(share.ownerUserId);
        }
      });
    }
    return ids;
  }, [userId, sharedCalendars]);

  // Get current clinic name for summary
  const selectedClinicName = useMemo(() => {
    if (!selectedClinicId || !clinics) return 'All Clinics';
    const clinic = clinics.find(c => (c as any).id === selectedClinicId);
    return clinic?.name || 'All Clinics';
  }, [selectedClinicId, clinics]);

  // Get view mode label for summary
  const viewModeLabel = useMemo(() => {
    if (viewMode === 'own') return 'My Calendar';
    if (viewMode === 'all') return 'All Calendars';
    return `${customSelections.size} calendars`;
  }, [viewMode, customSelections.size]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedClinicId) count++;
    if (viewMode !== 'own') count++;
    return count;
  }, [selectedClinicId, viewMode]);

  const handleClearFilters = () => {
    onClinicChange(undefined);
    setViewMode('own');
    setCustomSelections(new Set([userId]));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-surface-elevated shadow-sm">
        {/* Collapsed Header / Toggle */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Filters</span>
              
              {/* Quick summary badges when collapsed */}
              {!isOpen && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Building2 className="h-3 w-3 mr-1" />
                    {selectedClinicName}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Calendar className="h-3 w-3 mr-1" />
                    {viewModeLabel}
                  </Badge>
                </div>
              )}
              
              {activeFilterCount > 0 && (
                <Badge className="bg-zenthea-teal text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && !isOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-text-secondary hover:text-text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFilters();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-text-secondary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border-primary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clinic Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Building2 className="h-4 w-4" />
                  Clinic
                </div>
                {clinics === undefined ? (
                  <p className="text-sm text-text-secondary">Loading clinics...</p>
                ) : (
                  <select
                    value={selectedClinicId ?? 'all'}
                    onChange={(e) => onClinicChange(e.target.value === 'all' ? undefined : e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent text-text-primary px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Clinics</option>
                    {clinics && clinics.length > 0 ? (
                      clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))
                    ) : (
                      <option value="none" disabled>No clinics assigned</option>
                    )}
                  </select>
                )}
              </div>

              {/* Calendar View Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Calendar className="h-4 w-4" />
                  Calendar View
                </div>
                
                <RadioGroup
                  value={viewMode}
                  onValueChange={(value) => handleViewModeChange(value as ViewMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="view-own-filter" className="flex items-center gap-2 cursor-pointer text-sm">
                      My Calendar Only
                    </Label>
                    <RadioGroupItem value="own" id="view-own-filter" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="view-all-filter" className="flex items-center gap-2 cursor-pointer text-sm">
                      All Shared Calendars
                    </Label>
                    <RadioGroupItem value="all" id="view-all-filter" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="view-custom-filter" className="flex items-center gap-2 cursor-pointer text-sm">
                      Custom Selection
                    </Label>
                    <RadioGroupItem value="custom" id="view-custom-filter" />
                  </div>
                </RadioGroup>

                {/* Custom Selection Checkboxes */}
                {viewMode === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-border-primary">
                    <div className="grid grid-cols-2 gap-2">
                      {allAvailableUserIds.map((targetUserId) => {
                        const isOwn = targetUserId === userId;
                        const userName = isOwn ? 'My Calendar' : 'Unknown User';

                        return (
                          <div key={targetUserId} className="flex items-center space-x-2">
                            <Checkbox
                              id={`calendar-filter-${targetUserId}`}
                              checked={customSelections.has(targetUserId)}
                              onCheckedChange={() => handleCustomToggle(targetUserId)}
                              disabled={isOwn}
                            />
                            <Label
                              htmlFor={`calendar-filter-${targetUserId}`}
                              className={cn(
                                "text-xs cursor-pointer truncate",
                                isOwn && "font-medium"
                              )}
                            >
                              {userName}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with summary and clear action */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-primary">
              <span className="text-xs text-text-secondary">
                Showing {selectedUserIds.length} calendar{selectedUserIds.length !== 1 ? 's' : ''}
                {selectedClinicId && ` • ${selectedClinicName}`}
              </span>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-text-secondary hover:text-text-primary"
                  onClick={handleClearFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

