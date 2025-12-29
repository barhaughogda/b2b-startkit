'use client';

import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Stethoscope, 
  X,
  Plus,
  Trash2,
  Paperclip,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  AlertCircle,
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority, ProcedureCardProps } from './types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { ProcedureInfoTab } from './components/ProcedureInfoTab';
import { ProcedureNotesTab } from './components/ProcedureNotesTab';
import { ProcedureActivityTab } from './components/ProcedureActivityTab';
import { ProcedureStatusBadge } from './components/ProcedureStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Inbox } from 'lucide-react';


interface ProcedureCardExtendedProps extends ProcedureCardProps {
  isLoading?: boolean;
}

const ProcedureCard = memo<ProcedureCardExtendedProps>(({ 
  procedureData, 
  handlers = {} as CardEventHandlers,
  activeTab = 'info',
  onTabChange,
  isLoading = false,
  ...baseProps 
}) => {
  const [notes, setNotes] = useState('Patient prepared well for procedure. No complications.');

  // Validate required data BEFORE destructuring - handle invalid/missing procedure data gracefully
  // This check must come before destructuring to prevent errors when procedureData is null/undefined
  if (!procedureData || !procedureData.procedure) {
    return (
      <BaseCardComponent
        {...baseProps}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabNames={{
          info: 'Info',
          members: 'Members', 
          tags: 'Tags',
          dueDate: 'Due Date',
          attachments: 'Attachments',
          notes: 'Notes',
          activity: 'Activity'
        }}
        handlers={handlers || {} as CardEventHandlers}
        className="procedure-card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-text-primary flex items-center space-x-2">
            <Stethoscope className="h-5 w-5 text-zenthea-purple" />
            <span>Invalid Procedure Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-status-error mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">Invalid Procedure Data</p>
              <p className="text-xs text-text-tertiary">The procedure information is missing or invalid. Please contact support if this issue persists.</p>
            </div>
          </div>
        </CardContent>
      </BaseCardComponent>
    );
  }

  // Safe destructuring after validation
  const {
    procedure,
    provider,
    outcomes,
    careTeam,
    tags,
    documents,
    comments
  } = procedureData;

  const renderInfoTab = () => (
    <div className="p-4">
      <ProcedureInfoTab procedureData={procedureData} />
    </div>
  );

  const renderMembersTab = () => {
    if (isLoading) {
      return (
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Care Team</h3>
            <Button size="sm" variant="outline" className="flex items-center space-x-1">
              <Plus className="h-3 w-3" />
              <span>Add Member</span>
            </Button>
          </div>
          
          {careTeam.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-12 w-12 text-text-tertiary mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">No care team members</p>
              <p className="text-xs text-text-tertiary">Add members to the care team to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {careTeam.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{member.name}</p>
                    <p className="text-xs text-text-tertiary">{member.role}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.isActive ? (
                      <Badge className="text-xs bg-status-success/10 text-status-success">Active</Badge>
                    ) : (
                      <Badge className="text-xs bg-surface-secondary text-text-tertiary">Inactive</Badge>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTagsTab = () => {
    if (isLoading) {
      return (
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Tags</h3>
            <Button size="sm" variant="outline" className="flex items-center space-x-1">
              <Plus className="h-3 w-3" />
              <span>Add Tag</span>
            </Button>
          </div>
          
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Tag className="h-12 w-12 text-text-tertiary mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">No tags</p>
              <p className="text-xs text-text-tertiary">Add tags to organize and categorize this procedure.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag.name}</span>
                    <Button size="sm" variant="ghost" className="h-4 w-4 p-0 hover:bg-status-error/10">
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDueDateTab = () => {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Due Date</h3>
            <Button size="sm" variant="outline" className="flex items-center space-x-1">
              <CalendarIcon className="h-3 w-3" />
              <span>Edit</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium text-text-primary">Scheduled Date</p>
              <p className="text-sm text-text-tertiary">{formatDate(procedure.scheduledDate)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttachmentsTab = () => {
    if (isLoading) {
      return (
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-2 border rounded">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Documents</h3>
            <Button size="sm" variant="outline" className="flex items-center space-x-1">
              <Paperclip className="h-3 w-3" />
              <span>Upload</span>
            </Button>
          </div>
          
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Paperclip className="h-12 w-12 text-text-tertiary mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">No documents</p>
              <p className="text-xs text-text-tertiary">Upload documents related to this procedure.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-3 p-2 border rounded">
                  <FileTextIcon className="h-4 w-4 text-text-tertiary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                    <p className="text-xs text-text-tertiary">{doc.size}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNotesSection = () => (
    <ProcedureNotesTab
      procedureData={procedureData}
      handlers={handlers || {} as CardEventHandlers}
      initialNotes={notes}
    />
  );

  const renderActivitySection = () => (
    <div className="p-4">
      <ProcedureActivityTab
        procedureData={procedureData}
        handlers={handlers || {} as CardEventHandlers}
      />
    </div>
  );

  const renderContent = () => (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary flex items-center space-x-2">
            <Stethoscope className="h-5 w-5 text-zenthea-purple" />
            <span>{procedure.type}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <ProcedureStatusBadge status={procedure.status} />
            <div className="text-sm text-text-tertiary">
              {procedureData.patientName} • DOB: {procedureData.patientDateOfBirth}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Tab Content - BaseCard handles tab navigation */}
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'tags' && renderTagsTab()}
        {activeTab === 'dueDate' && renderDueDateTab()}
        {activeTab === 'attachments' && renderAttachmentsTab()}
        {activeTab === 'notes' && renderNotesSection()}
        {activeTab === 'activity' && renderActivitySection()}
      </CardContent>
    </>
  );

  return (
    <BaseCardComponent
      {...baseProps}
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabNames={{
        info: 'Info',
        members: 'Members', 
        tags: 'Tags',
        dueDate: 'Due Date',
        attachments: 'Attachments',
        notes: 'Notes',
        activity: 'Activity'
      }}
      handlers={handlers || {} as CardEventHandlers}
      className="procedure-card"
    >
      {renderContent()}
    </BaseCardComponent>
  );
});

ProcedureCard.displayName = 'ProcedureCard';

export { ProcedureCard };
export type { ProcedureCardProps, ProcedureCardExtendedProps };

