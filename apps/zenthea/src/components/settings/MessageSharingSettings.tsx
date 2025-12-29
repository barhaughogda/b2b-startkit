'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, Users, Building, Save, Loader2, Forward, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SharingScope = 'private' | 'care_team' | 'company';

interface SharingSettings {
  calendarDefaultSharing: SharingScope;
  patientsDefaultSharing: SharingScope;
  messagesDefaultSharing: SharingScope;
}

interface MessageSharingSettingsProps {
  userId: Id<'users'>;
  tenantId: string;
  currentSettings?: SharingSettings | null;
}

const SHARING_OPTIONS = [
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you and the sender/recipient can see messages.',
    icon: Lock,
    recommended: true,
  },
  {
    value: 'care_team' as const,
    label: 'Care Team',
    description: 'Care team members for related patients can see messages.',
    icon: Users,
  },
  {
    value: 'company' as const,
    label: 'Company',
    description: 'All staff members can see messages sent to you.',
    icon: Building,
  },
];

/**
 * Message Sharing Settings Component
 * 
 * Allows users to configure:
 * - Default message visibility
 * - View assigned messages
 * - Info about message delegation
 */
export function MessageSharingSettings({ 
  userId, 
  tenantId, 
  currentSettings 
}: MessageSharingSettingsProps) {
  const [messagesSharing, setMessagesSharing] = useState<SharingScope>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = useMutation(api.userSharingSettings.updateUserSharingSettings);

  // Get message assignments for this user
  const myAssignments = useQuery(
    api.messageAssignments.getMyAssignments,
    userId && tenantId ? { userId, tenantId } : 'skip'
  );

  const assignmentsMadeByMe = useQuery(
    api.messageAssignments.getAssignmentsMadeByMe,
    userId && tenantId ? { userId, tenantId } : 'skip'
  );

  // Load current settings
  useEffect(() => {
    if (currentSettings) {
      setMessagesSharing(currentSettings.messagesDefaultSharing || 'private');
    }
  }, [currentSettings]);

  // Track changes
  useEffect(() => {
    if (currentSettings) {
      const changed = messagesSharing !== (currentSettings.messagesDefaultSharing || 'private');
      setHasChanges(changed);
    }
  }, [messagesSharing, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        userId,
        tenantId,
        messagesDefaultSharing: messagesSharing,
      });
      toast.success('Message settings updated');
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-status-info/10 text-status-info border-status-info/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-status-error/10 text-status-error border-status-error/30"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = myAssignments?.filter((a: { status: string }) => a.status === 'pending' || a.status === 'in_progress').length || 0;

  return (
    <div className="space-y-6">
      {/* Default Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Visibility
          </CardTitle>
          <CardDescription>
            Control who can see messages sent to you. Messages are private by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={messagesSharing}
            onValueChange={(v) => setMessagesSharing(v as SharingScope)}
            className="space-y-3"
          >
            {SHARING_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  messagesSharing === option.value
                    ? 'border-interactive-primary bg-interactive-primary/5'
                    : 'border-border-primary hover:border-border-secondary'
                }`}
                onClick={() => setMessagesSharing(option.value)}
              >
                <RadioGroupItem value={option.value} id={`messages-${option.value}`} className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor={`messages-${option.value}`}
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                    {option.recommended && (
                      <Badge variant="outline" className="text-xs bg-status-success/10 text-status-success border-status-success/30">
                        Recommended
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-end pt-2">
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
        </CardContent>
      </Card>

      {/* Message Delegation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Message Delegation
          </CardTitle>
          <CardDescription>
            Messages can be assigned to colleagues for response. The full message trail is preserved for audit purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-status-info/10 border-status-info/30">
            <Info className="h-4 w-4 text-status-info" />
            <AlertDescription className="text-text-secondary">
              When a message is assigned to you, you can respond on behalf of the original recipient. 
              All assignments and responses are logged for HIPAA compliance.
            </AlertDescription>
          </Alert>

          {/* Messages Assigned to Me */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Messages Assigned to Me
              {pendingCount > 0 && (
                <Badge variant="default">{pendingCount} pending</Badge>
              )}
            </h4>
            
            {myAssignments === undefined ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : myAssignments.length === 0 ? (
              <p className="text-sm text-text-secondary">No messages assigned to you.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {myAssignments.slice(0, 5).map((assignment: { 
                  _id: string; 
                  status: string; 
                  message?: { subject?: string } | null;
                  assigner?: { name?: string; email?: string } | null;
                  [key: string]: unknown 
                }) => (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {assignment.message?.subject || 'No subject'}
                      </div>
                      <div className="text-text-secondary text-xs">
                        From: {assignment.assigner?.name || assignment.assigner?.email || 'Unknown'}
                      </div>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                ))}
                {myAssignments.length > 5 && (
                  <p className="text-sm text-text-secondary text-center py-2">
                    And {myAssignments.length - 5} more...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Messages I've Assigned */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Messages I&apos;ve Assigned</h4>
            
            {assignmentsMadeByMe === undefined ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : assignmentsMadeByMe.length === 0 ? (
              <p className="text-sm text-text-secondary">You haven&apos;t assigned any messages.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignmentsMadeByMe.slice(0, 5).map((assignment: { 
                  _id: string; 
                  status: string; 
                  message?: { subject?: string } | null;
                  assignee?: { name?: string; email?: string } | null;
                  [key: string]: unknown 
                }) => (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {assignment.message?.subject || 'No subject'}
                      </div>
                      <div className="text-text-secondary text-xs">
                        To: {assignment.assignee?.name || assignment.assignee?.email || 'Unknown'}
                      </div>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                ))}
                {assignmentsMadeByMe.length > 5 && (
                  <p className="text-sm text-text-secondary text-center py-2">
                    And {assignmentsMadeByMe.length - 5} more...
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

