'use client';

import React from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarSharingSettings } from '@/components/calendar/CalendarSharingSettings';
import { PatientSharingSettings } from '@/components/settings/PatientSharingSettings';
import { MessageSharingSettings } from '@/components/settings/MessageSharingSettings';
import { SharingDefaultsSettings } from '@/components/settings/SharingDefaultsSettings';
import { Settings, Calendar, Users, MessageSquare, Shield, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BackButton } from '@/components/ui/back-button';
import { ClinicLayout } from '@/components/layout/ClinicLayout';

/**
 * Sharing & Privacy Settings Page
 * 
 * Allows users to configure their personal sharing preferences:
 * - Default sharing settings (private, care_team, company)
 * - Calendar sharing with specific users
 * - Patient access sharing
 * - Message visibility settings
 */
export default function SharingSettingsPage() {
  const { data: session, status } = useZentheaSession();
  
  const userId = session?.user?.id as Id<'users'> | undefined;
  const tenantId = session?.user?.tenantId;

  // Get current sharing settings
  const sharingSettings = useQuery(
    api.userSharingSettings.getUserSharingSettings,
    userId && tenantId ? { userId, tenantId } : 'skip'
  );

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!session?.user || !userId || !tenantId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to access your sharing settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Don't show sharing settings for patients
  if (session.user.role === 'patient') {
    return (
      <div className="p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>
            Sharing settings are only available for staff members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <BackButton />
        {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Settings className="h-7 w-7 text-interactive-primary" />
          Sharing & Privacy
        </h1>
        <p className="text-text-secondary">
          Control who can see your calendar, patients, and messages. Your data is private by default.
        </p>
      </div>

      {/* Info Banner */}
      <Alert className="bg-status-info/10 border-status-info/30">
        <Shield className="h-4 w-4 text-status-info" />
        <AlertTitle className="text-status-info">HIPAA Compliant Sharing</AlertTitle>
        <AlertDescription className="text-text-secondary">
          All sharing changes are logged for compliance. Only share access with colleagues who need it 
          to provide care. Sharing is set to &quot;Private&quot; by default for maximum security.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs defaultValue="defaults" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Defaults</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Patients</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
        </TabsList>

        {/* Default Settings */}
        <TabsContent value="defaults">
          <SharingDefaultsSettings 
            userId={userId} 
            tenantId={tenantId}
            currentSettings={sharingSettings}
          />
        </TabsContent>

        {/* Calendar Sharing */}
        <TabsContent value="calendar">
          <CalendarSharingSettings userId={userId} tenantId={tenantId} />
        </TabsContent>

        {/* Patient Sharing */}
        <TabsContent value="patients">
          <PatientSharingSettings userId={userId} tenantId={tenantId} />
        </TabsContent>

        {/* Message Settings */}
        <TabsContent value="messages">
          <MessageSharingSettings 
            userId={userId} 
            tenantId={tenantId}
            currentSettings={sharingSettings}
          />
        </TabsContent>
      </Tabs>
      </div>
    </ClinicLayout>
  );
}

