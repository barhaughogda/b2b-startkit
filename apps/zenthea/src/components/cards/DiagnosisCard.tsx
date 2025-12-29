'use client';

import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertCircle, 
  X,
  Plus,
  Trash2,
  Paperclip,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, DiagnosisCardProps } from './types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { DiagnosisInfoTab } from './components/DiagnosisInfoTab';
import { DiagnosisNotesTab } from './components/DiagnosisNotesTab';
import { DiagnosisActivityTab } from './components/DiagnosisActivityTab';
import { DiagnosisStatusBadge } from './components/DiagnosisStatusBadge';

interface DiagnosisCardExtendedProps extends DiagnosisCardProps {
  isLoading?: boolean;
}

const DiagnosisCard = memo<DiagnosisCardExtendedProps>(({ 
  diagnosisData, 
  handlers = {} as CardEventHandlers,
  activeTab = 'info',
  onTabChange,
  isLoading = false,
  ...baseProps 
}) => {
  const [notes, setNotes] = useState('Patient responding well to treatment plan.');

  // Validate required data BEFORE destructuring - handle invalid/missing diagnosis data gracefully
  if (!diagnosisData || !diagnosisData.diagnosis) {
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
        className="diagnosis-card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-text-primary flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-status-error" />
            <span>Invalid Diagnosis Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-status-error mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">Invalid Diagnosis Data</p>
              <p className="text-xs text-text-tertiary">The diagnosis information is missing or invalid. Please contact support if this issue persists.</p>
            </div>
          </div>
        </CardContent>
      </BaseCardComponent>
    );
  }

  // Safe destructuring after validation
  const {
    diagnosis,
    provider,
    relatedConditions,
    treatmentPlan,
    careTeam = [],
    tags = [],
    documents = [],
    comments = []
  } = diagnosisData;

  const renderInfoTab = () => (
    <div className="p-4">
      <DiagnosisInfoTab diagnosisData={diagnosisData} />
    </div>
  );

  const renderMembersTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Care Team</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add Member</span>
          </Button>
        </div>
        
        <div className="space-y-3">
          {careTeam.map((member) => (
            <div key={member.id} className="flex items-center space-x-3 p-3 border border-border-primary rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{member.name}</p>
                <p className="text-xs text-text-secondary">{member.role}</p>
              </div>
              <div className="flex items-center space-x-2">
                {member.isActive ? (
                  <Badge className="text-xs bg-status-success text-white">Active</Badge>
                ) : (
                  <Badge className="text-xs bg-text-tertiary text-white">Inactive</Badge>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTagsTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Tags</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add Tag</span>
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} className="flex items-center space-x-1">
              <span>{tag.name}</span>
              <Button size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1">
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDueDateTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Due Date</h3>
          <Button size="sm" variant="outline">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        
        {baseProps.dueDate && (
          <div className="p-4 border border-border-primary rounded-lg">
            <p className="text-sm text-text-secondary">Due Date</p>
            <p className="text-lg font-semibold text-text-primary">{formatDate(baseProps.dueDate)}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAttachmentsTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Attachments</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add File</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border border-border-primary rounded-lg">
              <div className="flex items-center space-x-3">
                <Paperclip className="h-5 w-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                  <p className="text-xs text-text-secondary">{doc.size}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotesSection = () => (
    <div className="p-4">
      <DiagnosisNotesTab
        cardId={baseProps.id}
        notes={notes}
        onNotesChange={setNotes}
        handlers={handlers || {} as CardEventHandlers}
      />
    </div>
  );

  const renderActivitySection = () => (
    <div className="p-4">
      <DiagnosisActivityTab
        diagnosisData={diagnosisData}
        handlers={handlers || {} as CardEventHandlers}
      />
    </div>
  );

  const renderContent = () => {
    // Determine which tab content to render
    let tabContent;
    switch (activeTab) {
      case 'info':
        tabContent = renderInfoTab();
        break;
      case 'members':
        tabContent = renderMembersTab();
        break;
      case 'tags':
        tabContent = renderTagsTab();
        break;
      case 'dueDate':
        tabContent = renderDueDateTab();
        break;
      case 'attachments':
        tabContent = renderAttachmentsTab();
        break;
      case 'notes':
        tabContent = renderNotesSection();
        break;
      case 'activity':
        tabContent = renderActivitySection();
        break;
      default:
        tabContent = renderInfoTab();
    }

    return (
      <>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-status-error" />
              <span>{diagnosis.code}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <DiagnosisStatusBadge status={diagnosis.status} severity={diagnosis.severity} />
              <div className="text-sm text-text-tertiary">
                {diagnosisData.patientName} • DOB: {diagnosisData.patientDateOfBirth}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {tabContent}
        </CardContent>
      </>
    );
  };

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
      className="diagnosis-card"
    >
      {renderContent()}
    </BaseCardComponent>
  );
});

DiagnosisCard.displayName = 'DiagnosisCard';

export { DiagnosisCard };
export type { DiagnosisCardProps, DiagnosisCardExtendedProps };

