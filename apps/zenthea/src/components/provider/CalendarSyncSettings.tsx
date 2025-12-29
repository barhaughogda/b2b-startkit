'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Link2, Unlink, RefreshCw, Settings, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CalendarSyncSettingsProps {
  userId: Id<'users'>; // Required: user-centric approach
  tenantId: string;
}

type SyncType = 'google' | 'microsoft' | 'apple';
type SyncDirection = 'bidirectional' | 'outbound-only';

export function CalendarSyncSettings({ userId, tenantId }: CalendarSyncSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch sync status for all sync types (user-based)
  // Note: If function doesn't exist on server (not deployed), ConvexErrorBoundary will catch it
  // We use 'skip' pattern to prevent calling when we don't have required params
  // The error boundary will show a graceful fallback message
  const syncStatuses = useQuery(
    (api as any).calendarSync?.getSyncStatusByUser,
    userId && tenantId
      ? {
          userId,
          tenantId,
        }
      : 'skip'
  );

  const updateSyncSettingsMutation = useMutation((api as any).calendarSync.updateSyncSettings);
  const disconnectCalendarMutation = useMutation((api as any).calendarSync.disconnectCalendar);

  const handleConnectGoogle = () => {
    // Redirect to Google Calendar OAuth initiation route
    const redirectUri = `${window.location.origin}/api/auth/google-calendar/callback`;
    const authUrl = `/api/auth/google-calendar?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = async (syncId: Id<'calendarSync'>) => {
    setIsDisconnecting(syncId);
    try {
      await disconnectCalendarMutation({
        syncId,
        tenantId,
      });

      toast.success('Calendar disconnected', {
        description: 'The calendar sync has been disconnected successfully.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to disconnect calendar',
      });
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleUpdateSyncDirection = async (
    syncId: Id<'calendarSync'>,
    syncDirection: SyncDirection
  ) => {
    setIsUpdating(syncId);
    try {
      await updateSyncSettingsMutation({
        syncId,
        syncDirection,
        tenantId,
      });

      toast.success('Settings updated', {
        description: 'Sync direction has been updated successfully.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update settings',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const getSyncTypeLabel = (syncType: SyncType): string => {
    switch (syncType) {
      case 'google':
        return 'Google Calendar';
      case 'microsoft':
        return 'Microsoft Outlook';
      case 'apple':
        return 'Apple Calendar';
    }
  };

  const getSyncTypeIcon = (syncType: SyncType) => {
    switch (syncType) {
      case 'google':
        return <Calendar className="h-4 w-4" />;
      case 'microsoft':
        return <Calendar className="h-4 w-4" />;
      case 'apple':
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSyncDirectionLabel = (direction: SyncDirection): string => {
    switch (direction) {
      case 'bidirectional':
        return 'Bidirectional (sync both ways)';
      case 'outbound-only':
        return 'Outbound only (Zenthea → Calendar)';
    }
  };

  // Show loading state while fetching sync status
  const isLoading = syncStatuses === undefined;
  
  // Check if calendars are connected (handle both array and null/undefined)
  // If syncStatuses is null, it means no syncs found (valid state)
  // If syncStatuses is an array, use it; otherwise default to empty array
  const syncStatusesArray = Array.isArray(syncStatuses) ? syncStatuses : (syncStatuses === null ? [] : []);
  const googleSync = syncStatusesArray.find((sync: any) => sync?.syncType === 'google') || null;
  const microsoftSync = syncStatusesArray.find((sync: any) => sync?.syncType === 'microsoft') || null;
  const appleSync = syncStatusesArray.find((sync: any) => sync?.syncType === 'apple') || null;

  // Show loading state while fetching sync status
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-text-secondary">Loading sync settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Calendar Sync</h2>
        <p className="text-text-secondary mt-1">
          Connect your external calendars to sync appointments automatically
        </p>
      </div>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSyncTypeIcon('google')}
              <div>
                <CardTitle>{getSyncTypeLabel('google')}</CardTitle>
                <CardDescription>
                  Sync your appointments with Google Calendar
                </CardDescription>
              </div>
            </div>
            {googleSync?.isConnected ? (
              <Badge variant="outline" className="bg-status-success-bg text-status-success border-status-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-surface-secondary text-text-secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleSync?.isConnected ? (
            <>
              {/* Sync Status Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Sync Direction:</span>
                  <span className="font-medium">{getSyncDirectionLabel(googleSync.syncDirection)}</span>
                </div>
                {googleSync.lastSyncAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Sync:
                    </span>
                    <span className="font-medium">
                      {format(new Date(googleSync.lastSyncAt), 'PPp')}
                    </span>
                  </div>
                )}
                {googleSync.calendarId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Calendar ID:</span>
                    <span className="font-medium">{googleSync.calendarId}</span>
                  </div>
                )}
              </div>

              {/* Sync Direction Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Sync Direction</label>
                <Select
                  value={googleSync.syncDirection}
                  onValueChange={(value) =>
                    handleUpdateSyncDirection(googleSync._id, value as SyncDirection)
                  }
                  disabled={isUpdating === googleSync._id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">
                      Bidirectional (sync both ways)
                    </SelectItem>
                    <SelectItem value="outbound-only">
                      Outbound only (Zenthea → Calendar)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-tertiary">
                  Bidirectional sync will pull external events as "busy" blocks. Outbound-only sync
                  only pushes Zenthea appointments to your calendar.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(googleSync._id)}
                  disabled={isDisconnecting === googleSync._id}
                >
                  {isDisconnecting === googleSync._id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement manual sync trigger
                    toast.info('Manual sync', {
                      description: 'Manual sync will be available after OAuth implementation.',
                    });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Connect your Google Calendar to automatically sync appointments. When connected,
                your Zenthea appointments will appear in Google Calendar, and external events will
                be shown as "busy" blocks in your Zenthea calendar.
              </p>
              <Button 
                onClick={handleConnectGoogle} 
                className="w-full md:w-auto"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microsoft Outlook - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSyncTypeIcon('microsoft')}
              <div>
                <CardTitle>{getSyncTypeLabel('microsoft')}</CardTitle>
                <CardDescription>
                  Sync your appointments with Microsoft Outlook
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-surface-secondary text-text-secondary">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Microsoft Outlook integration will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Apple Calendar - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSyncTypeIcon('apple')}
              <div>
                <CardTitle>{getSyncTypeLabel('apple')}</CardTitle>
                <CardDescription>
                  Sync your appointments with Apple Calendar
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-surface-secondary text-text-secondary">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Apple Calendar integration will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-surface-elevated">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            How Calendar Sync Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Outbound Sync:</strong> Your Zenthea appointments
            are automatically pushed to your external calendar. Only time and location information
            are synced (no patient details) to maintain HIPAA compliance.
          </p>
          <p>
            <strong className="text-text-primary">Bidirectional Sync:</strong> In addition to
            outbound sync, external calendar events are pulled into Zenthea and shown as "busy"
            blocks, preventing double-booking.
          </p>
          <p>
            <strong className="text-text-primary">Privacy:</strong> Patient names, conditions, and
            notes are never synced to external calendars. Only generic "Patient Appointment" entries
            with time and location are created.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

