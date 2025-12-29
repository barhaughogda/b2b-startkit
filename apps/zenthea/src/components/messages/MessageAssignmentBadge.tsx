'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Forward, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface MessageAssignmentBadgeProps {
  messageId: Id<'messages'>;
  tenantId: string;
  className?: string;
}

/**
 * Badge component that shows if a message has been assigned
 * 
 * Displays:
 * - Assignment status (pending, in_progress, completed, declined)
 * - Assignee name
 * - Tooltip with more details
 */
export function MessageAssignmentBadge({
  messageId,
  tenantId,
  className,
}: MessageAssignmentBadgeProps) {
  const assignmentInfo = useQuery(
    api.messageAssignments.hasActiveAssignment,
    messageId && tenantId ? { messageId, tenantId } : 'skip'
  );

  if (!assignmentInfo?.hasActive) {
    return null;
  }

  const assignment = assignmentInfo.assignment;
  if (!assignment) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-status-warning/10 text-status-warning border-status-warning/30',
        };
      case 'in_progress':
        return {
          icon: Loader2,
          label: 'In Progress',
          className: 'bg-status-info/10 text-status-info border-status-info/30',
          iconClassName: 'animate-spin',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          className: 'bg-status-success/10 text-status-success border-status-success/30',
        };
      case 'declined':
        return {
          icon: XCircle,
          label: 'Declined',
          className: 'bg-status-error/10 text-status-error border-status-error/30',
        };
      default:
        return {
          icon: Forward,
          label: 'Assigned',
          className: 'bg-background-secondary text-text-secondary border-border-primary',
        };
    }
  };

  const config = getStatusConfig(assignment.status);
  const Icon = config.icon;
  const assigneeName = assignment.assignee?.name || assignment.assignee?.email || 'Unknown';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.className} cursor-help ${className}`}
          >
            <Icon className={`h-3 w-3 mr-1 ${config.iconClassName || ''}`} />
            <span className="truncate max-w-[100px]">
              {assigneeName}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Message Assignment</p>
            <p className="text-text-secondary">
              Assigned to: {assigneeName}
            </p>
            <p className="text-text-secondary">
              Status: {config.label}
            </p>
            {assignment.notes && (
              <p className="text-text-secondary mt-1 italic">
                &quot;{assignment.notes}&quot;
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

