'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DateInput } from '@/components/ui/date-input';
import { Clock, Calendar, Plus, X, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OpeningHoursEditorProps {
  tenantId: string;
  clinicId?: Id<'clinics'>; // If undefined, editing company-level hours
  userEmail: string; // Required for authorization
  title?: string;
  description?: string;
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

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export function OpeningHoursEditor({ 
  tenantId, 
  clinicId,
  userEmail,
  title = 'Opening Hours',
  description = 'Set your regular opening hours. These hours will be used for booking and availability calculations.'
}: OpeningHoursEditorProps) {
  const [activeTab, setActiveTab] = useState<'recurring' | 'overrides'>('recurring');
  const [schedule, setSchedule] = useState<Record<DayOfWeek, DaySchedule>>(() => {
    const initial: Record<DayOfWeek, DaySchedule> = {} as Record<DayOfWeek, DaySchedule>;
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
  const [isClosed, setIsClosed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing opening hours
  const openingHours = useQuery(
    clinicId 
      ? api.openingHours.getClinicOpeningHours
      : api.openingHours.getCompanyOpeningHours,
    (clinicId 
      ? { tenantId, clinicId }
      : { tenantId }) as any
  );

  // Load existing schedule into state
  useEffect(() => {
    if (openingHours?.recurring) {
      const updated: Record<DayOfWeek, DaySchedule> = { ...schedule };
      
      // Reset all days to disabled first
      DAYS_OF_WEEK.forEach(day => {
        updated[day.value] = {
          ...updated[day.value],
          enabled: false,
        };
      });

      // Enable days that have data
      openingHours.recurring.forEach((hour: { 
        dayOfWeek: DayOfWeek; 
        startTime: string; 
        endTime: string;
        isClosed?: boolean;
      }) => {
        if (hour.dayOfWeek && !hour.isClosed) {
          updated[hour.dayOfWeek] = {
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            enabled: true,
          };
        }
      });
      setSchedule(updated);
    }
  }, [openingHours]);

  // Mutations
  const setWeeklySchedule = useMutation(api.openingHours.setWeeklySchedule);
  const addDateOverride = useMutation(api.openingHours.addDateOverride);
  const removeDateOverride = useMutation(api.openingHours.removeDateOverride);

  const handleDayToggle = (day: DayOfWeek) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const scheduleData = DAYS_OF_WEEK
        .filter(day => schedule[day.value].enabled)
        .map(day => ({
          dayOfWeek: day.value,
          startTime: schedule[day.value].startTime,
          endTime: schedule[day.value].endTime,
          isClosed: false,
        }));

      await setWeeklySchedule({
        tenantId,
        clinicId,
        userEmail,
        schedule: scheduleData,
      });

      toast.success('Opening hours saved', {
        description: 'Your opening hours have been updated.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save opening hours',
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
      await addDateOverride({
        tenantId,
        clinicId,
        userEmail,
        overrideDate,
        startTime: isClosed ? undefined : overrideStartTime,
        endTime: isClosed ? undefined : overrideEndTime,
        isClosed,
      });

      toast.success('Override added', {
        description: `Opening hours override for ${format(new Date(overrideDate), 'PPP')} has been added.`,
      });

      // Reset form
      setOverrideDate('');
      setOverrideStartTime('09:00');
      setOverrideEndTime('17:00');
      setIsClosed(false);
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add override',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveOverride = async (date: string) => {
    setIsSaving(true);
    try {
      await removeDateOverride({
        tenantId,
        clinicId,
        userEmail,
        overrideDate: date,
      });

      toast.success('Override removed', {
        description: 'The opening hours override has been removed.',
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
      <div className="flex gap-2 border-b border-border-primary">
        <Button
          variant={activeTab === 'recurring' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('recurring')}
          className="rounded-b-none"
        >
          <Clock className="mr-2 h-4 w-4" />
          Weekly Schedule
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
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedule = schedule[day.value];
              return (
                <div
                  key={day.value}
                  className="flex items-center gap-4 p-4 border border-border-primary rounded-lg bg-surface-primary"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      id={`day-${day.value}`}
                      checked={daySchedule.enabled}
                      onChange={() => handleDayToggle(day.value)}
                      className="h-4 w-4 rounded border-border-primary accent-interactive-primary"
                    />
                    <Label htmlFor={`day-${day.value}`} className="font-medium cursor-pointer text-text-primary">
                      {day.label}
                    </Label>
                  </div>

                  {daySchedule.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`start-${day.value}`} className="text-sm text-text-secondary">
                          Open
                        </Label>
                        <Input
                          id={`start-${day.value}`}
                          type="time"
                          value={daySchedule.startTime}
                          onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`end-${day.value}`} className="text-sm text-text-secondary">
                          Close
                        </Label>
                        <Input
                          id={`end-${day.value}`}
                          type="time"
                          value={daySchedule.endTime}
                          onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}

                  {!daySchedule.enabled && (
                    <Badge variant="outline" className="text-text-secondary">
                      Closed
                    </Badge>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-4 border-t border-border-primary">
              <Button onClick={handleSaveSchedule} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
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
                Override your regular hours for specific dates (holidays, special events, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="override-date">Date</Label>
                  <DateInput
                    id="override-date"
                    value={overrideDate}
                    onChange={(value) => setOverrideDate(value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={(e) => setIsClosed(e.target.checked)}
                      className="h-4 w-4 rounded border-border-primary accent-interactive-primary"
                    />
                    <span>Closed on this date</span>
                  </Label>
                </div>
              </div>

              {!isClosed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="override-start">Open Time</Label>
                    <Input
                      id="override-start"
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-end">Close Time</Label>
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
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Adding...' : 'Add Override'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Overrides List */}
          {openingHours?.overrides && openingHours.overrides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Overrides</CardTitle>
                <CardDescription>
                  Date-specific opening hours that override your regular schedule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {openingHours.overrides.map((override: {
                    overrideDate?: string;
                    startTime: string;
                    endTime: string;
                    isClosed?: boolean;
                  }) => {
                    if (!override.overrideDate) return null;
                    const isClosedOverride = override.isClosed;
                    return (
                      <div
                        key={override.overrideDate}
                        className="flex items-center justify-between p-3 border border-border-primary rounded-lg bg-surface-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-text-secondary" />
                          <div>
                            <div className="font-medium text-text-primary">
                              {format(new Date(override.overrideDate + 'T12:00:00'), 'PPP')}
                            </div>
                            {isClosedOverride ? (
                              <Badge variant="destructive">Closed</Badge>
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
                          onClick={() => handleRemoveOverride(override.overrideDate!)}
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

