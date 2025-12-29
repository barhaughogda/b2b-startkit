'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Check } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

interface AvailabilityTemplatesProps {
  providerId: Id<'providers'>;
  tenantId: string;
  locationId?: Id<'locations'>;
  onTemplateApplied?: () => void;
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface Template {
  id: string;
  name: string;
  description: string;
  schedule: Record<DayOfWeek, { startTime: string; endTime: string; enabled: boolean }>;
  icon: React.ReactNode;
}

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

// Pre-defined availability templates
const AVAILABILITY_TEMPLATES: Template[] = [
  {
    id: 'full-time-9-5',
    name: 'Full-Time (9-5)',
    description: 'Standard business hours, Monday through Friday',
    icon: <Clock className="h-5 w-5" />,
    schedule: {
      monday: { startTime: '09:00', endTime: '17:00', enabled: true },
      tuesday: { startTime: '09:00', endTime: '17:00', enabled: true },
      wednesday: { startTime: '09:00', endTime: '17:00', enabled: true },
      thursday: { startTime: '09:00', endTime: '17:00', enabled: true },
      friday: { startTime: '09:00', endTime: '17:00', enabled: true },
      saturday: { startTime: '09:00', endTime: '17:00', enabled: false },
      sunday: { startTime: '09:00', endTime: '17:00', enabled: false },
    },
  },
  {
    id: 'part-time-morning',
    name: 'Part-Time (Morning)',
    description: 'Morning shifts, Monday through Friday',
    icon: <Clock className="h-5 w-5" />,
    schedule: {
      monday: { startTime: '08:00', endTime: '12:00', enabled: true },
      tuesday: { startTime: '08:00', endTime: '12:00', enabled: true },
      wednesday: { startTime: '08:00', endTime: '12:00', enabled: true },
      thursday: { startTime: '08:00', endTime: '12:00', enabled: true },
      friday: { startTime: '08:00', endTime: '12:00', enabled: true },
      saturday: { startTime: '08:00', endTime: '12:00', enabled: false },
      sunday: { startTime: '08:00', endTime: '12:00', enabled: false },
    },
  },
  {
    id: 'part-time-afternoon',
    name: 'Part-Time (Afternoon)',
    description: 'Afternoon shifts, Monday through Friday',
    icon: <Clock className="h-5 w-5" />,
    schedule: {
      monday: { startTime: '13:00', endTime: '17:00', enabled: true },
      tuesday: { startTime: '13:00', endTime: '17:00', enabled: true },
      wednesday: { startTime: '13:00', endTime: '17:00', enabled: true },
      thursday: { startTime: '13:00', endTime: '17:00', enabled: true },
      friday: { startTime: '13:00', endTime: '17:00', enabled: true },
      saturday: { startTime: '13:00', endTime: '17:00', enabled: false },
      sunday: { startTime: '13:00', endTime: '17:00', enabled: false },
    },
  },
  {
    id: 'extended-hours',
    name: 'Extended Hours',
    description: 'Early morning to evening, Monday through Friday',
    icon: <Clock className="h-5 w-5" />,
    schedule: {
      monday: { startTime: '07:00', endTime: '19:00', enabled: true },
      tuesday: { startTime: '07:00', endTime: '19:00', enabled: true },
      wednesday: { startTime: '07:00', endTime: '19:00', enabled: true },
      thursday: { startTime: '07:00', endTime: '19:00', enabled: true },
      friday: { startTime: '07:00', endTime: '19:00', enabled: true },
      saturday: { startTime: '09:00', endTime: '13:00', enabled: true },
      sunday: { startTime: '09:00', endTime: '13:00', enabled: false },
    },
  },
  {
    id: 'weekend-only',
    name: 'Weekend Only',
    description: 'Saturday and Sunday availability',
    icon: <Clock className="h-5 w-5" />,
    schedule: {
      monday: { startTime: '09:00', endTime: '17:00', enabled: false },
      tuesday: { startTime: '09:00', endTime: '17:00', enabled: false },
      wednesday: { startTime: '09:00', endTime: '17:00', enabled: false },
      thursday: { startTime: '09:00', endTime: '17:00', enabled: false },
      friday: { startTime: '09:00', endTime: '17:00', enabled: false },
      saturday: { startTime: '09:00', endTime: '17:00', enabled: true },
      sunday: { startTime: '09:00', endTime: '17:00', enabled: true },
    },
  },
];

export function AvailabilityTemplates({
  providerId,
  tenantId,
  locationId,
  onTemplateApplied,
}: AvailabilityTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  
  const setRecurringAvailability = useMutation((api as any).availability.setRecurringAvailability);

  const handleApplyTemplate = async (template: Template) => {
    if (!providerId || !tenantId) {
      toast.error('Provider ID and Tenant ID are required');
      return;
    }

    setIsApplying(true);
    setSelectedTemplate(template.id);

    try {
      // Apply template schedule to all enabled days
      const promises = DAYS_OF_WEEK.map((day) => {
        const daySchedule = template.schedule[day.value];
        if (daySchedule.enabled) {
          return setRecurringAvailability({
            providerId,
            locationId: locationId || undefined,
            dayOfWeek: day.value,
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime,
            tenantId,
          });
        } else {
          // Remove availability for disabled days
          // Note: This would require a removeRecurringAvailability function
          // For now, we'll just skip disabled days
          return Promise.resolve();
        }
      });

      await Promise.all(promises);

      toast.success(`Applied "${template.name}" template successfully`);
      onTemplateApplied?.();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplying(false);
      setSelectedTemplate(null);
    }
  };

  const getEnabledDaysCount = (template: Template): number => {
    return Object.values(template.schedule).filter((day) => day.enabled).length;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Availability Templates</h3>
        <p className="text-sm text-text-secondary">
          Quickly apply pre-defined availability schedules. You can customize individual days after applying a template.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABILITY_TEMPLATES.map((template) => {
          const enabledDays = getEnabledDaysCount(template);
          const isApplyingThis = isApplying && selectedTemplate === template.id;

          return (
            <Card key={template.id} className="hover:border-border-focus transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {template.icon}
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {enabledDays} {enabledDays === 1 ? 'day' : 'days'}
                  </Badge>
                </div>
                <CardDescription className="text-sm mt-1">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-text-secondary">
                    <div className="font-medium mb-1">Schedule:</div>
                    <div className="space-y-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const daySchedule = template.schedule[day.value];
                        if (!daySchedule.enabled) return null;
                        return (
                          <div key={day.value} className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">{day.label}:</span>
                            <span>
                              {daySchedule.startTime} - {daySchedule.endTime}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={isApplying}
                    className="w-full"
                    size="sm"
                  >
                    {isApplyingThis ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Apply Template
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

