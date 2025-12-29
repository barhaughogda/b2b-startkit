import React from 'react';
import { DiagnosisCardProps, CardEventHandlers } from '../types';
import { Activity as ActivityIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

interface DiagnosisActivityTabProps {
  diagnosisData: DiagnosisCardProps['diagnosisData'];
  handlers: CardEventHandlers;
}

export const DiagnosisActivityTab: React.FC<DiagnosisActivityTabProps> = ({
  diagnosisData,
  handlers
}) => {
  // Generate audit trail from diagnosis data and comments
  const auditEntries = [
    {
      id: '1',
      action: 'Diagnosis Created',
      description: `Diagnosis ${diagnosisData.diagnosis.code} - ${diagnosisData.diagnosis.description} was created`,
      user: diagnosisData.provider.name,
      role: 'Provider',
      timestamp: diagnosisData.diagnosis.diagnosisDate,
      icon: 'alert-circle',
      type: 'create'
    },
    ...(diagnosisData.diagnosis.confirmedDate ? [{
      id: '2',
      action: 'Diagnosis Confirmed',
      description: `Diagnosis was confirmed on ${new Date(diagnosisData.diagnosis.confirmedDate).toLocaleDateString()}`,
      user: diagnosisData.provider.name,
      role: 'Provider',
      timestamp: diagnosisData.diagnosis.confirmedDate,
      icon: 'check-circle',
      type: 'confirm'
    }] : []),
    ...diagnosisData.comments.map((comment, index) => ({
      id: `comment-${index + 3}`,
      action: 'Note Added',
      description: comment.content,
      user: comment.author,
      role: 'Provider',
      timestamp: comment.timestamp,
      icon: 'message-square',
      type: 'comment'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary flex items-center space-x-2">
          <ActivityIcon className="h-5 w-5 text-status-info" />
          <span>Activity Log</span>
        </h3>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {auditEntries.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          auditEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 border border-border-primary rounded-lg bg-background-secondary"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{entry.action}</span>
                    <span className="text-xs text-text-tertiary">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{entry.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-text-tertiary">{entry.user}</span>
                    <span className="text-xs text-text-tertiary">•</span>
                    <span className="text-xs text-text-tertiary">{entry.role}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

