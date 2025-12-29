'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Lock, Users, Building, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SharingScope = 'private' | 'care_team' | 'company';

interface SharingSettings {
  calendarDefaultSharing: SharingScope;
  patientsDefaultSharing: SharingScope;
  messagesDefaultSharing: SharingScope;
}

interface SharingDefaultsSettingsProps {
  userId: Id<'users'>;
  tenantId: string;
  currentSettings?: SharingSettings | null;
}

const SHARING_OPTIONS = [
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you can access. Most secure option.',
    icon: Lock,
  },
  {
    value: 'care_team' as const,
    label: 'Care Team',
    description: 'People working on the same patients can access.',
    icon: Users,
  },
  {
    value: 'company' as const,
    label: 'Company',
    description: 'All staff members in your organization can access.',
    icon: Building,
  },
];

/**
 * Sharing Defaults Settings Component
 * 
 * Allows users to set their default sharing preferences for:
 * - Calendar
 * - Patients
 * - Messages
 */
export function SharingDefaultsSettings({ 
  userId, 
  tenantId, 
  currentSettings 
}: SharingDefaultsSettingsProps) {
  const [calendarSharing, setCalendarSharing] = useState<SharingScope>('private');
  const [patientsSharing, setPatientsSharing] = useState<SharingScope>('private');
  const [messagesSharing, setMessagesSharing] = useState<SharingScope>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = useMutation(api.userSharingSettings.updateUserSharingSettings);

  // Load current settings
  useEffect(() => {
    if (currentSettings) {
      setCalendarSharing(currentSettings.calendarDefaultSharing || 'private');
      setPatientsSharing(currentSettings.patientsDefaultSharing || 'private');
      setMessagesSharing(currentSettings.messagesDefaultSharing || 'private');
    }
  }, [currentSettings]);

  // Track changes
  useEffect(() => {
    if (currentSettings) {
      const changed = 
        calendarSharing !== (currentSettings.calendarDefaultSharing || 'private') ||
        patientsSharing !== (currentSettings.patientsDefaultSharing || 'private') ||
        messagesSharing !== (currentSettings.messagesDefaultSharing || 'private');
      setHasChanges(changed);
    }
  }, [calendarSharing, patientsSharing, messagesSharing, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        userId,
        tenantId,
        calendarDefaultSharing: calendarSharing,
        patientsDefaultSharing: patientsSharing,
        messagesDefaultSharing: messagesSharing,
      });
      toast.success('Sharing settings updated');
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSharingOption = (
    title: string,
    description: string,
    value: SharingScope,
    onChange: (value: SharingScope) => void
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as SharingScope)}
          className="space-y-3"
        >
          {SHARING_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                value === option.value
                  ? 'border-interactive-primary bg-interactive-primary/5'
                  : 'border-border-primary hover:border-border-secondary'
              }`}
              onClick={() => onChange(option.value)}
            >
              <RadioGroupItem value={option.value} id={`${title}-${option.value}`} className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor={`${title}-${option.value}`}
                  className="flex items-center gap-2 font-medium cursor-pointer"
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-background-secondary border-border-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-interactive-primary" />
            Default Sharing Settings
          </CardTitle>
          <CardDescription>
            Set your default privacy level for different types of data. You can always 
            override these defaults by sharing specific items individually.
          </CardDescription>
        </CardHeader>
      </Card>

      {renderSharingOption(
        'Calendar',
        'Who can see your appointments and availability by default',
        calendarSharing,
        setCalendarSharing
      )}

      {renderSharingOption(
        'Patients',
        'Who can see your patient list and their information by default',
        patientsSharing,
        setPatientsSharing
      )}

      {renderSharingOption(
        'Messages',
        'Who can see messages sent to you by default',
        messagesSharing,
        setMessagesSharing
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

