import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, FileText, Activity, Calendar as CalendarIcon } from 'lucide-react';
import { LabResultData } from '../LabResultCard';
import { TeamMember, Document as CardDocument } from '../types';

interface TabRenderersProps {
  labData: LabResultData;
  clinicalNotes: string;
  onNotesChange: (notes: string) => void;
}

export function renderCareTeam({ labData }: { labData: LabResultData }) {
  return (
    <div className="p-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">Care Team</h4>
        {labData.careTeam && labData.careTeam.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {labData.careTeam.map((member) => (
              <div key={member.id} className="flex items-center gap-2 bg-surface-elevated p-2 rounded-lg">
                <div className="h-6 w-6 rounded-full bg-interactive-primary flex items-center justify-center">
                  <span className="text-xs text-white">{member.initials}</span>
                </div>
                <div>
                  <p className="text-xs font-medium">{member.name}</p>
                  <p className="text-xs text-text-secondary">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary">No team members assigned</p>
            <Button size="sm" variant="outline" className="mt-2">
              <Plus className="h-3 w-3 mr-1" />
              Add Member
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function renderDueDate() {
  return (
    <div className="p-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">Due Date</h4>
        <div className="bg-surface-elevated p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-zenthea-teal-600" />
            <span className="text-sm">No due date set</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderDocuments({ labData }: { labData: LabResultData }) {
  return (
    <div className="p-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">Attachments</h4>
        {labData.documents && labData.documents.length > 0 ? (
          <div className="space-y-2">
            {labData.documents.map((doc: CardDocument) => (
              <div key={doc.id} className="flex items-center gap-2 bg-surface-elevated p-2 rounded-lg">
                <FileText className="h-4 w-4 text-text-secondary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-text-secondary">{doc.size}</p>
                </div>
                <Button size="sm" variant="ghost">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary">No attachments</p>
            <Button size="sm" variant="outline" className="mt-2">
              <Plus className="h-3 w-3 mr-1" />
              Add File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function renderNotes({ clinicalNotes, onNotesChange }: { clinicalNotes: string; onNotesChange: (notes: string) => void }) {
  return (
    <div className="p-4 border-t border-border-primary">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">Notes</h4>
        <Textarea
          placeholder="Add clinical notes..."
          value={clinicalNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}

export function renderActivity() {
  const auditTrail = [
    {
      id: '1',
      action: 'Lab Results Received',
      description: 'Lab results uploaded and processed',
      user: 'Lab System',
      role: 'System',
      timestamp: '2024-01-15 08:30 AM',
      icon: 'FileText',
      type: 'upload'
    },
    {
      id: '2',
      action: 'Results Reviewed',
      description: 'Results reviewed by Dr. Smith',
      user: 'Dr. Smith',
      role: 'Provider',
      timestamp: '2024-01-15 09:15 AM',
      icon: 'Eye',
      type: 'review'
    },
    {
      id: '3',
      action: 'Flagged Abnormal',
      description: 'Results flagged as abnormal values detected',
      user: 'Dr. Smith',
      role: 'Provider',
      timestamp: '2024-01-15 09:20 AM',
      icon: 'AlertTriangle',
      type: 'flag'
    },
    {
      id: '4',
      action: 'Patient Notified',
      description: 'Patient notified of results via message',
      user: 'Dr. Smith',
      role: 'Provider',
      timestamp: '2024-01-15 10:30 AM',
      icon: 'MessageSquare',
      type: 'notification'
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-text-primary">Activity Log</h4>
        <Button variant="ghost" size="sm">
          <Activity className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-3">
        {auditTrail.map((entry) => (
          <div key={entry.id} className="flex gap-3 p-3 bg-surface-elevated rounded-lg border border-border-primary">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-interactive-primary flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-text-primary">{entry.action}</span>
                <span className="text-xs text-text-secondary">{entry.timestamp}</span>
              </div>
              <p className="text-sm text-text-primary mb-1">{entry.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">by</span>
                <span className="text-xs font-medium text-text-primary">{entry.user}</span>
                <span className="text-xs text-text-tertiary">({entry.role})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
