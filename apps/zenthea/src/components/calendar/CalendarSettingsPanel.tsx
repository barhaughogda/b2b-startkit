'use client';

import React from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { Users, RefreshCw, Clock, Building2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarSharingSettings } from '@/components/calendar/CalendarSharingSettings';
import { CalendarSyncSettings } from '@/components/provider/CalendarSyncSettings';
import { ClinicAvailabilityManager } from '@/components/provider/ClinicAvailabilityManager';
import { ClinicAssignmentManager } from '@/components/provider/ClinicAssignmentManager';

interface CalendarSettingsPanelProps {
  userId: string;
  tenantId: string;
  providerId?: string;
  clinicId?: string; // Clinic filter (canonical - preferred)
  locationId?: string; // DEPRECATED: Use clinicId instead
}

export function CalendarSettingsPanel({ userId, tenantId, providerId, clinicId, locationId }: CalendarSettingsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Collapsible Sections */}
      <Accordion type="multiple" defaultValue={[]} className="space-y-4">
        {/* Availability Section */}
        <AccordionItem value="availability" className="border rounded-lg bg-surface-primary">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-zenthea-teal" />
              <div className="text-left">
                <div className="font-semibold">Availability</div>
                <div className="text-sm text-text-secondary font-normal">
                  Manage your working hours and availability per clinic
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {userId && /^[a-z][a-z0-9]{19,}$/.test(userId) ? (
              <ClinicAvailabilityManager
                userId={userId as any}
                tenantId={tenantId}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">
                    Availability management requires a legacy user account for now.
                  </p>
                </CardContent>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Clinics Section */}
        <AccordionItem value="clinics" className="border rounded-lg bg-surface-primary">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-zenthea-teal" />
              <div className="text-left">
                <div className="font-semibold">Clinics</div>
                <div className="text-sm text-text-secondary font-normal">
                  Select clinics where you provide services
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {userId && /^[a-z][a-z0-9]{19,}$/.test(userId) ? (
              <ClinicAssignmentManager
                userId={userId as any}
                tenantId={tenantId}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">
                    Clinic assignment requires a legacy user account for now.
                  </p>
                </CardContent>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Calendar Sharing Section */}
        <AccordionItem value="sharing" className="border rounded-lg bg-surface-primary">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-zenthea-teal" />
              <div className="text-left">
                <div className="font-semibold">Calendar Sharing</div>
                <div className="text-sm text-text-secondary font-normal">
                  Control who can view or manage your calendar
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {userId && /^[a-z][a-z0-9]{19,}$/.test(userId) ? (
              <CalendarSharingSettings userId={userId as any} tenantId={tenantId} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">
                    Calendar sharing requires a legacy user account for now.
                  </p>
                </CardContent>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* External Calendar Sync Section */}
        <AccordionItem value="sync" className="border rounded-lg bg-surface-primary">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-zenthea-teal" />
              <div className="text-left">
                <div className="font-semibold">External Calendar Sync</div>
                <div className="text-sm text-text-secondary font-normal">
                  Connect to Google, Microsoft, or Apple calendars
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {userId && /^[a-z][a-z0-9]{19,}$/.test(userId) ? (
              <CalendarSyncSettings userId={userId as any} tenantId={tenantId} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-text-secondary">
                    External sync requires a legacy user account for now.
                  </p>
                </CardContent>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

