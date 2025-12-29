'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Building2, Plus, X, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClinicAvailabilityManagerProps {
  userId: Id<'users'>;
  tenantId: string;
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string; short: string }> = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
];

interface RecurringSchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

// ProviderAvailability type from Convex schema
interface ProviderAvailability {
  _id: Id<'providerAvailability'>;
  providerId?: Id<'providers'>;
  userId?: Id<'users'>;
  locationId?: Id<'locations'>;
  clinicId?: Id<'clinics'>;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  overrideDate?: number;
  tenantId: string;
  createdAt: number;
  updatedAt: number;
}

// Clinic type from Convex
interface Clinic {
  _id: Id<'clinics'>;
  name: string;
  description?: string;
  address?: string;
  timezone?: string;
  isActive: boolean;
  tenantId: string;
}

/**
 * ClinicAvailabilityManager
 * 
 * Allows providers to set their availability per clinic.
 * Times are interpreted in the clinic's timezone.
 */
export function ClinicAvailabilityManager({ userId, tenantId }: ClinicAvailabilityManagerProps) {
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recurring' | 'overrides'>('recurring');
  const [recurringSchedule, setRecurringSchedule] = useState<Record<DayOfWeek, RecurringSchedule>>(() => {
    const initial: Partial<Record<DayOfWeek, RecurringSchedule>> = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day.value] = {
        dayOfWeek: day.value,
        startTime: '09:00',
        endTime: '17:00',
        enabled: false,
      };
    });
    return initial as Record<DayOfWeek, RecurringSchedule>;
  });
  const [overrideDate, setOverrideDate] = useState<string>('');
  const [overrideStartTime, setOverrideStartTime] = useState<string>('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState<string>('17:00');
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user's assigned clinics
  const userClinics = useQuery(
    api.clinics.getUserClinics,
    userId && tenantId ? { userId, tenantId } : 'skip'
  ) as Clinic[] | undefined;

  // Set default clinic when clinics load (only once)
  // Use a ref to track if we've already initialized to prevent infinite loops
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Only initialize if we have clinics, no selected clinic, and haven't initialized yet
    if (userClinics && userClinics.length > 0 && !selectedClinicId && !hasInitializedRef.current) {
      setSelectedClinicId(userClinics[0]._id);
      hasInitializedRef.current = true;
    }
    // Reset initialization flag if clinics are cleared
    if (!userClinics || userClinics.length === 0) {
      hasInitializedRef.current = false;
    }
    // Intentionally exclude selectedClinicId from dependencies to prevent infinite loops.
    // We check selectedClinicId inside the effect to conditionally set it, but including
    // it in dependencies would cause the effect to re-run every time it changes, creating
    // a loop. The ref pattern ensures we only initialize once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userClinics]);

  // Memoize date range to prevent infinite re-renders
  const dateRange = useMemo(() => {
    if (!selectedClinicId || !userId || !tenantId) return null;
    const now = Date.now();
    return {
      userId,
      clinicId: selectedClinicId as Id<'clinics'>,
      startDate: now,
      endDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days
      tenantId,
    };
  }, [selectedClinicId, userId, tenantId]);

  // Fetch availability for selected clinic
  const clinicAvailability = useQuery(
    api.availability.getUserClinicAvailability,
    dateRange || 'skip'
  );

  // Fetch clinic timezone
  const clinicTimezone = useQuery(
    api.clinics.getClinicTimezone,
    selectedClinicId ? { clinicId: selectedClinicId as Id<'clinics'> } : 'skip'
  );

  // Load existing recurring schedule when clinic changes or availability loads
  // Use a ref to prevent infinite loops from state updates
  const scheduleLoadedRef = useRef<string>('');
  useEffect(() => {
    // Create a stable key to track if we've already loaded this data
    const availabilityKey = clinicAvailability 
      ? `${selectedClinicId}-${JSON.stringify(clinicAvailability.recurring)}`
      : `${selectedClinicId}-null`;
    
    // Skip if we've already loaded this exact data
    if (scheduleLoadedRef.current === availabilityKey) {
      return;
    }

    if (!clinicAvailability?.recurring) {
      // Reset to defaults when no availability
      const initial: Partial<Record<DayOfWeek, RecurringSchedule>> = {};
      DAYS_OF_WEEK.forEach(day => {
        initial[day.value] = {
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '17:00',
          enabled: false,
        };
      });
      setRecurringSchedule(initial as Record<DayOfWeek, RecurringSchedule>);
      scheduleLoadedRef.current = availabilityKey;
      return;
    }

    const updated: Partial<Record<DayOfWeek, RecurringSchedule>> = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = (clinicAvailability.recurring as ProviderAvailability[]).find(
        (a: ProviderAvailability) => a.dayOfWeek === day.value
      );
      if (existing) {
        updated[day.value] = {
          dayOfWeek: day.value,
          startTime: existing.startTime,
          endTime: existing.endTime,
          enabled: true,
        };
      } else {
        updated[day.value] = {
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '17:00',
          enabled: false,
        };
      }
    });
    setRecurringSchedule(updated as Record<DayOfWeek, RecurringSchedule>);
    scheduleLoadedRef.current = availabilityKey;
  }, [clinicAvailability, selectedClinicId]);

  // Mutations
  const setClinicAvailability = useMutation(api.availability.setUserClinicAvailability);
  const removeClinicAvailability = useMutation(api.availability.removeUserClinicAvailability);
  const addClinicOverride = useMutation(api.availability.addUserClinicAvailabilityOverride);
  const removeClinicOverride = useMutation(api.availability.removeUserClinicAvailabilityOverride);

  const handleDayToggle = (day: DayOfWeek) => {
    setRecurringSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setRecurringSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveRecurring = async () => {
    if (!selectedClinicId) {
      toast.error('No clinic selected');
      return;
    }

    setIsSaving(true);
    try {
      // Process each day
      const promises = DAYS_OF_WEEK.map(async (day) => {
        const schedule = recurringSchedule[day.value];
        const existingForDay = (clinicAvailability?.recurring as ProviderAvailability[] | undefined)?.find(
          (a: ProviderAvailability) => a.dayOfWeek === day.value
        );

        if (schedule.enabled) {
          // Set or update availability
          await setClinicAvailability({
            userId,
            clinicId: selectedClinicId as Id<'clinics'>,
            dayOfWeek: day.value,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            tenantId,
          });
        } else if (existingForDay) {
          // Remove if it was previously enabled
          await removeClinicAvailability({
            userId,
            clinicId: selectedClinicId as Id<'clinics'>,
            dayOfWeek: day.value,
            tenantId,
          });
        }
      });

      await Promise.all(promises);
      toast.success('Schedule saved', {
        description: 'Your availability has been updated.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save schedule',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate || !selectedClinicId) {
      toast.error('Date and clinic required');
      return;
    }

    setIsSaving(true);
    try {
      const dateTimestamp = new Date(overrideDate).setHours(0, 0, 0, 0);
      
      await addClinicOverride({
        userId,
        clinicId: selectedClinicId as Id<'clinics'>,
        overrideDate: dateTimestamp,
        startTime: isUnavailable ? undefined : overrideStartTime,
        endTime: isUnavailable ? undefined : overrideEndTime,
        tenantId,
      });

      toast.success('Override added', {
        description: `Availability override for ${format(new Date(overrideDate), 'PPP')} has been added.`,
      });

      // Reset form
      setOverrideDate('');
      setOverrideStartTime('09:00');
      setOverrideEndTime('17:00');
      setIsUnavailable(false);
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add override',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveOverride = async (overrideId: Id<'providerAvailability'>) => {
    setIsSaving(true);
    try {
      await removeClinicOverride({
        id: overrideId,
        tenantId,
        userId,
      });

      toast.success('Override removed');
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove override',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (userClinics === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-secondary">Loading clinics...</p>
      </div>
    );
  }

  // No clinics assigned
  if (!userClinics || userClinics.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not assigned to any clinics. Please add yourself to a clinic first using the Clinics section.
        </AlertDescription>
      </Alert>
    );
  }

  const selectedClinic = userClinics.find(c => c._id === selectedClinicId);

  return (
    <div className="space-y-6">
      {/* Clinic Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="clinic-select">Select Clinic</Label>
          <Select 
            value={selectedClinicId} 
            onValueChange={(value) => {
              setSelectedClinicId(value);
            }}
          >
            <SelectTrigger id="clinic-select" className="mt-1">
              <SelectValue placeholder="Select a clinic..." />
            </SelectTrigger>
            <SelectContent>
              {userClinics.map((clinic) => (
                <SelectItem key={clinic._id} value={clinic._id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{clinic.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {clinicTimezone && (
          <div className="text-sm text-text-secondary pt-6">
            <span>Timezone: </span>
            <Badge variant="outline">{clinicTimezone.timezone}</Badge>
          </div>
        )}
      </div>

      {selectedClinicId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === 'recurring' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('recurring')}
              className="rounded-b-none"
            >
              <Clock className="mr-2 h-4 w-4" />
              Recurring Schedule
            </Button>
            <Button
              variant={activeTab === 'overrides' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overrides')}
              className="rounded-b-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Date Overrides
            </Button>
          </div>

          {/* Recurring Schedule Tab */}
          {activeTab === 'recurring' && (
            <Card>
              <CardHeader>
                <CardTitle>Weekly Recurring Schedule</CardTitle>
                <CardDescription>
                  Set your regular weekly availability at {selectedClinic?.name || 'this clinic'}.
                  {clinicTimezone && ` Times are in ${clinicTimezone.timezone}.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const schedule = recurringSchedule[day.value];
                  return (
                    <div
                      key={day.value}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <input
                          type="checkbox"
                          id={`day-${day.value}`}
                          checked={schedule.enabled}
                          onChange={() => handleDayToggle(day.value)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={`day-${day.value}`} className="font-medium cursor-pointer">
                          {day.label}
                        </Label>
                      </div>

                      {schedule.enabled && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`start-${day.value}`} className="text-sm text-text-secondary">
                              Start
                            </Label>
                            <Input
                              id={`start-${day.value}`}
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`end-${day.value}`} className="text-sm text-text-secondary">
                              End
                            </Label>
                            <Input
                              id={`end-${day.value}`}
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        </>
                      )}

                      {!schedule.enabled && (
                        <Badge variant="outline" className="text-text-secondary">
                          Not available
                        </Badge>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveRecurring} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Overrides Tab */}
          {activeTab === 'overrides' && (
            <div className="space-y-6">
              {/* Add Override Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Date Override</CardTitle>
                  <CardDescription>
                    Set special hours or mark yourself unavailable for specific dates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="override-date">Date</Label>
                      <Input
                        id="override-date"
                        type="date"
                        value={overrideDate}
                        onChange={(e) => setOverrideDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="is-unavailable"
                        checked={isUnavailable}
                        onChange={(e) => setIsUnavailable(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="is-unavailable" className="cursor-pointer">
                        Mark as unavailable (day off)
                      </Label>
                    </div>
                  </div>

                  {!isUnavailable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="override-start">Start Time</Label>
                        <Input
                          id="override-start"
                          type="time"
                          value={overrideStartTime}
                          onChange={(e) => setOverrideStartTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="override-end">End Time</Label>
                        <Input
                          id="override-end"
                          type="time"
                          value={overrideEndTime}
                          onChange={(e) => setOverrideEndTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleAddOverride} disabled={isSaving || !overrideDate}>
                      <Plus className="mr-2 h-4 w-4" />
                      {isSaving ? 'Adding...' : 'Add Override'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Overrides */}
              {clinicAvailability?.overrides && clinicAvailability.overrides.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Overrides</CardTitle>
                    <CardDescription>
                      Your date-specific availability changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(clinicAvailability.overrides as ProviderAvailability[]).map((override: ProviderAvailability) => {
                        const isUnavailableOverride = override.startTime === '00:00' && override.endTime === '00:00';
                        return (
                          <div
                            key={override._id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-text-secondary" />
                              <span className="font-medium">
                                {override.overrideDate ? format(new Date(override.overrideDate), 'PPP') : 'Invalid date'}
                              </span>
                              {isUnavailableOverride ? (
                                <Badge variant="outline" className="bg-status-error/10 text-status-error border-status-error">
                                  Unavailable
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {override.startTime} – {override.endTime}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOverride(override._id)}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

