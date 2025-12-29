'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, MapPin, Plus, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AvailabilityManagerProps {
  providerId?: Id<'providers'>; // Optional - for backward compatibility
  userId?: Id<'users'>; // User-based availability (preferred)
  tenantId: string;
  locationId?: Id<'locations'>;
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

export function AvailabilityManager({ providerId, userId, tenantId, locationId }: AvailabilityManagerProps) {
  // Require either providerId or userId
  if (!providerId && !userId) {
    throw new Error('AvailabilityManager requires either providerId or userId');
  }
  const [activeTab, setActiveTab] = useState<'recurring' | 'overrides'>('recurring');
  const [recurringSchedule, setRecurringSchedule] = useState<Record<DayOfWeek, RecurringSchedule>>(() => {
    const initial: Record<DayOfWeek, RecurringSchedule> = {} as any;
    DAYS_OF_WEEK.forEach(day => {
      initial[day.value] = {
        dayOfWeek: day.value,
        startTime: '09:00',
        endTime: '17:00',
        enabled: false,
      };
    });
    return initial;
  });
  const [overrideDate, setOverrideDate] = useState<string>('');
  const [overrideStartTime, setOverrideStartTime] = useState<string>('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState<string>('17:00');
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing recurring availability (user-based or provider-based)
  const recurringAvailability = useQuery(
    userId 
      ? (api as any).availability.getUserAvailability
      : (api as any).availability.getProviderAvailability,
    (userId || providerId) && tenantId
      ? userId
        ? {
            userId,
            startDate: Date.now(),
            endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
            locationId: locationId || undefined,
            tenantId,
          }
        : {
            providerId,
            startDate: Date.now(),
            endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
            locationId: locationId || undefined,
            tenantId,
          }
      : 'skip'
  );

  // Load existing recurring schedule into state
  React.useEffect(() => {
    if (recurringAvailability?.recurring) {
      const updated: Record<DayOfWeek, RecurringSchedule> = { ...recurringSchedule };
      recurringAvailability.recurring.forEach((avail: any) => {
        if (avail.dayOfWeek && avail.startTime && avail.endTime) {
          updated[avail.dayOfWeek as DayOfWeek] = {
            dayOfWeek: avail.dayOfWeek as DayOfWeek,
            startTime: avail.startTime,
            endTime: avail.endTime,
            enabled: true,
          };
        }
      });
      setRecurringSchedule(updated);
    }
  }, [recurringAvailability]);

  const setRecurringAvailabilityMutation = useMutation(
    userId 
      ? (api as any).availability.setUserRecurringAvailability
      : (api as any).availability.setRecurringAvailability
  );
  const addOverrideMutation = useMutation(
    userId 
      ? (api as any).availability.addUserAvailabilityOverride
      : (api as any).availability.addAvailabilityOverride
  );
  const removeOverrideMutation = useMutation(
    userId 
      ? (api as any).availability.removeUserAvailabilityOverride
      : (api as any).availability.removeAvailabilityOverride
  );

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
    setIsSaving(true);
    try {
      const promises = DAYS_OF_WEEK.map(async (day) => {
        const schedule = recurringSchedule[day.value];
        if (schedule.enabled) {
          await setRecurringAvailabilityMutation(
            userId
              ? {
                  userId,
                  locationId: locationId || undefined,
                  dayOfWeek: day.value,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  tenantId,
                }
              : {
                  providerId: providerId!,
                  locationId: locationId || undefined,
                  dayOfWeek: day.value,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  tenantId,
                }
          );
        }
      });

      await Promise.all(promises);
      toast.success('Schedule saved', {
        description: 'Your recurring availability has been updated.',
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
    if (!overrideDate) {
      toast.error('Date required', {
        description: 'Please select a date for the override.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const dateTimestamp = new Date(overrideDate).setHours(0, 0, 0, 0);
      
      await addOverrideMutation(
        userId
          ? {
              userId,
              locationId: locationId || undefined,
              overrideDate: dateTimestamp,
              startTime: isUnavailable ? '00:00' : overrideStartTime,
              endTime: isUnavailable ? '00:00' : overrideEndTime,
              tenantId,
            }
          : {
              providerId: providerId!,
              locationId: locationId || undefined,
              overrideDate: dateTimestamp,
              startTime: isUnavailable ? '00:00' : overrideStartTime,
              endTime: isUnavailable ? '00:00' : overrideEndTime,
              tenantId,
            }
      );

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
      await removeOverrideMutation(
        userId
          ? {
              id: overrideId,
              tenantId,
              userId,
            }
          : {
              id: overrideId,
              tenantId,
            }
      );

      toast.success('Override removed', {
        description: 'The availability override has been removed.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove override',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
              Set your regular weekly availability. This schedule will repeat every week.
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

            <div className="flex justify-end pt-4 border-t">
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
        <div className="space-y-4">
          {/* Add Override Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Date Override</CardTitle>
              <CardDescription>
                Override your regular schedule for specific dates. You can mark dates as unavailable or set custom hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="override-date">Date</Label>
                  <Input
                    id="override-date"
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    <input
                      type="checkbox"
                      checked={isUnavailable}
                      onChange={(e) => setIsUnavailable(e.target.checked)}
                      className="mr-2"
                    />
                    Mark as unavailable
                  </Label>
                </div>
              </div>

              {!isUnavailable && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="override-start">Start Time</Label>
                    <Input
                      id="override-start"
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-end">End Time</Label>
                    <Input
                      id="override-end"
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleAddOverride} disabled={isSaving || !overrideDate}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? 'Adding...' : 'Add Override'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Overrides List */}
          {recurringAvailability?.overrides && recurringAvailability.overrides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Overrides</CardTitle>
                <CardDescription>
                  Date-specific availability overrides that override your regular schedule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recurringAvailability.overrides.map((override: any) => {
                    const isUnavailableOverride = override.startTime === '00:00' && override.endTime === '00:00';
                    return (
                      <div
                        key={override.overrideDate}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-text-secondary" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(override.overrideDate!), 'PPP')}
                            </div>
                            {isUnavailableOverride ? (
                              <Badge variant="destructive">Unavailable</Badge>
                            ) : (
                              <div className="text-sm text-text-secondary">
                                {override.startTime} - {override.endTime}
                              </div>
                            )}
                          </div>
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
    </div>
  );
}

