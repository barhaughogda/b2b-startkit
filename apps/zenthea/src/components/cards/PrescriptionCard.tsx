'use client';

import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Pill, 
  X,
  Plus,
  Trash2,
  Paperclip,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority, PrescriptionCardProps } from './types';
import { cn } from '@/lib/utils';
import { PrescriptionInfoTab } from './components/PrescriptionInfoTab';
import { PrescriptionNotesTab } from './components/PrescriptionNotesTab';
import { PrescriptionActivityTab } from './components/PrescriptionActivityTab';


const PrescriptionCard = memo<PrescriptionCardProps>(({ 
  prescriptionData, 
  handlers = {} as CardEventHandlers,
  activeTab = 'info',
  onTabChange,
  ...baseProps 
}) => {
  const [notes, setNotes] = useState('Monitor blood pressure and heart rate. Watch for dizziness or swelling.');

  const {
    medication,
    prescription,
    prescriber,
    pharmacy,
    interactions,
    allergies,
    refillHistory,
    monitoring,
    careTeam,
    tags,
    documents,
    comments
  } = prescriptionData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'discontinued': return 'text-red-600 bg-red-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'on-hold': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getInteractionSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'text-blue-600 bg-blue-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'major': return 'text-orange-600 bg-orange-50';
      case 'contraindicated': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'minor': return <Info className="h-4 w-4" />;
      case 'moderate': return <AlertTriangle className="h-4 w-4" />;
      case 'major': return <AlertCircle className="h-4 w-4" />;
      case 'contraindicated': return <X className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const renderInfoTab = () => (
    <div className="p-4">
      <PrescriptionInfoTab prescriptionData={prescriptionData} />
    </div>
  );

  const renderMembersTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Care Team</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add Member</span>
          </Button>
        </div>
        
        <div className="space-y-3">
          {careTeam.map((member) => (
            <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </div>
              <div className="flex items-center space-x-2">
                {member.isActive ? (
                  <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge className="text-xs bg-gray-100 text-gray-800">Inactive</Badge>
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
          <h3 className="font-semibold text-gray-900">Tags</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add Tag</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                <span>{tag.name}</span>
                <Button size="sm" variant="ghost" className="h-4 w-4 p-0 hover:bg-red-100">
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDueDateTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Due Date</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <CalendarIcon className="h-3 w-3" />
            <span>Edit</span>
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="p-3 border rounded-lg">
            <p className="text-sm font-medium text-gray-900">Next Refill Due</p>
            <p className="text-sm text-gray-500">March 15, 2024</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttachmentsTab = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Documents</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Paperclip className="h-3 w-3" />
            <span>Upload</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-3 p-2 border rounded">
              <FileTextIcon className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.size}</p>
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
    <PrescriptionNotesTab
      prescriptionData={prescriptionData}
      handlers={handlers || {} as CardEventHandlers}
      initialNotes={notes}
    />
  );

  const renderActivitySection = () => (
    <PrescriptionActivityTab
      prescriptionData={prescriptionData}
      handlers={handlers || {} as CardEventHandlers}
    />
  );

  const renderContent = () => (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Pill className="h-5 w-5 text-yellow-600" />
            <span>{medication.name}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={cn("px-2 py-1 text-xs font-medium", getStatusColor(prescription.status))}>
              {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
            </Badge>
            <div className="text-sm text-gray-500">
              {prescriptionData.patientName} • DOB: {prescriptionData.patientDateOfBirth}
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
      className="prescription-card"
    >
      {renderContent()}
    </BaseCardComponent>
  );
});

PrescriptionCard.displayName = 'PrescriptionCard';

export { PrescriptionCard };
export type { PrescriptionCardProps };
