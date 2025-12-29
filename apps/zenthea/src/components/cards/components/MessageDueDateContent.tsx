'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface MessageDueDateContentProps {
  dueDate: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

export const MessageDueDateContent: React.FC<MessageDueDateContentProps> = ({ dueDate, priority }) => {
  const isOverdue = new Date(dueDate) < new Date();
  const isDueSoon = new Date(dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000); // Next 24 hours

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Due Date & Priority</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border-primary">
              <CalendarIcon className="h-5 w-5 text-status-info" />
              <div className="flex-1">
                <div className="text-sm font-medium">Due Date</div>
                <div className="text-sm text-text-secondary">
                  {new Date(dueDate).toLocaleDateString()} at {new Date(dueDate).toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
                {!isOverdue && isDueSoon && (
                  <Badge variant="default" className="text-xs">
                    Due Soon
                  </Badge>
                )}
                {!isOverdue && !isDueSoon && (
                  <Badge variant="secondary" className="text-xs">
                    On Track
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border-primary">
              <Clock className="h-5 w-5 text-status-warning" />
              <div className="flex-1">
                <div className="text-sm font-medium">Priority</div>
                <div className="text-sm text-text-secondary">
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                </div>
              </div>
              <Badge 
                variant={priority === 'urgent' ? 'destructive' : priority === 'high' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
