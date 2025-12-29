/**
 * Provider Scheduling Preferences Section Component
 * 
 * Handles scheduling preferences like personal timezone.
 * Timezone allows providers to work remotely in different timezones than their clinic.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Label } from '@/components/ui/label';
import { TimezoneSelector, getTimezoneDisplayName } from '@/components/ui/timezone-selector';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Clock, Building2, Save, Check, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ProviderSchedulingPreferencesSectionProps {
  userId?: Id<'users'>;
}

export function ProviderSchedulingPreferencesSection({
  userId: propUserId,
}: ProviderSchedulingPreferencesSectionProps) {
  const { data: session } = useSession();
  const userId = propUserId || (session?.user?.id as Id<'users'> | undefined);
  
  // Get current user data
  const user = useQuery(
    api.users.getUserById,
    userId ? { userId: userId } : 'skip'
  );
  
  // Get clinic/company timezone for fallback display
  const tenantId = session?.user?.tenantId;
  const tenant = useQuery(
    api.tenants.getTenant,
    tenantId ? { tenantId } : 'skip'
  );
  
  // State for the timezone selector
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Update user timezone mutation
  const updateTimezone = useMutation(api.users.updateUserTimezone);
  
  // Initialize from user data
  useEffect(() => {
    if (user) {
      setSelectedTimezone(user.timezone || null);
      setHasChanges(false);
    }
  }, [user]);
  
  // Detect browser timezone for suggestion
  const browserTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);
  
  // Get the effective timezone (what will be used for availability)
  const companyTimezone = tenant?.settings?.timezone || 'America/New_York';
  const effectiveTimezone = selectedTimezone || companyTimezone;
  
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    setHasChanges(true);
  };
  
  const handleUseCompanyDefault = () => {
    setSelectedTimezone(null);
    setHasChanges(true);
  };
  
  const handleUseBrowserTimezone = () => {
    setSelectedTimezone(browserTimezone);
    setHasChanges(true);
  };
  
  const handleSave = async () => {
    if (!userId) {
      toast.error('User not found');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateTimezone({
        userId,
        timezone: selectedTimezone,
      });
      toast.success('Timezone preference saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save timezone:', error);
      toast.error('Failed to save timezone preference');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!user) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-surface-elevated rounded w-1/3"></div>
        <div className="h-10 bg-surface-elevated rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-zenthea-teal/30 bg-zenthea-teal/5">
        <Info className="h-4 w-4 text-zenthea-teal" />
        <AlertDescription className="text-sm text-text-secondary">
          Set your personal timezone if you work remotely or in a different timezone than your clinic.
          Your availability will be displayed to patients in their local time.
        </AlertDescription>
      </Alert>
      
      {/* Timezone Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-text-secondary" />
          <Label className="text-sm font-medium">Your Timezone</Label>
        </div>
        
        <TimezoneSelector
          value={selectedTimezone || ''}
          onChange={handleTimezoneChange}
          placeholder={selectedTimezone ? 'Select timezone...' : `Using company default: ${getTimezoneDisplayName(companyTimezone)}`}
          showLabel={false}
          className="w-full"
        />
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseCompanyDefault}
            className={!selectedTimezone ? 'border-zenthea-teal text-zenthea-teal' : ''}
          >
            <Building2 className="h-3 w-3 mr-1" />
            Use Company Default
            {!selectedTimezone && <Check className="h-3 w-3 ml-1" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseBrowserTimezone}
            className={selectedTimezone === browserTimezone ? 'border-zenthea-teal text-zenthea-teal' : ''}
          >
            <Clock className="h-3 w-3 mr-1" />
            Use Browser Timezone ({browserTimezone.split('/').pop()?.replace(/_/g, ' ')})
            {selectedTimezone === browserTimezone && <Check className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>
      
      {/* Current Status */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border-primary">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Your availability will be shown in:
            </p>
            <p className="text-lg font-semibold text-zenthea-teal">
              {getTimezoneDisplayName(effectiveTimezone)}
            </p>
            {!selectedTimezone && (
              <p className="text-xs text-text-tertiary mt-1">
                (Inherited from company settings)
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-zenthea-teal hover:bg-zenthea-teal/90"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Timezone Preference
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
