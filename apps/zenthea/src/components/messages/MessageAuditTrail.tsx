'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, Forward, CheckCircle2, XCircle, Clock, Loader2, MessageSquare, User } from 'lucide-react';

interface MessageAuditTrailProps {
  messageId: Id<'messages'>;
  tenantId: string;
  className?: string;
}

/**
 * Component that shows the complete audit trail for a message
 * 
 * Displays:
 * - All assignment history
 * - Who assigned, who responded
 * - Timestamps for HIPAA compliance
 */
export function MessageAuditTrail({
  messageId,
  tenantId,
  className,
}: MessageAuditTrailProps) {
  const assignmentHistory = useQuery(
    api.messageAssignments.getMessageAssignmentHistory,
    messageId && tenantId ? { messageId, tenantId } : 'skip'
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          color: 'text-status-warning',
          bgColor: 'bg-status-warning/10',
        };
      case 'in_progress':
        return {
          icon: Loader2,
          label: 'In Progress',
          color: 'text-status-info',
          bgColor: 'bg-status-info/10',
          iconClassName: 'animate-spin',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          color: 'text-status-success',
          bgColor: 'bg-status-success/10',
        };
      case 'declined':
        return {
          icon: XCircle,
          label: 'Declined',
          color: 'text-status-error',
          bgColor: 'bg-status-error/10',
        };
      default:
        return {
          icon: Forward,
          label: status,
          color: 'text-text-secondary',
          bgColor: 'bg-background-secondary',
        };
    }
  };

  if (assignmentHistory === undefined) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </CardContent>
      </Card>
    );
  }

  if (assignmentHistory.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Assignment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            This message has not been assigned to anyone.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Assignment History
        </CardTitle>
        <CardDescription className="text-xs">
          Complete audit trail for this message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignmentHistory.map((assignment: { 
          _id: string; 
          status: string; 
          createdAt: number;
          assigner?: { name?: string; email?: string } | null;
          assignee?: { name?: string; email?: string } | null;
          notes?: string;
          respondedAt?: number;
          responseMessage?: { subject?: string } | null;
          [key: string]: unknown 
        }, index: number) => {
          const statusConfig = getStatusConfig(assignment.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div key={assignment._id}>
              {index > 0 && <Separator className="my-4" />}
              
              <div className="space-y-3">
                {/* Assignment Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${statusConfig.bgColor}`}>
                      <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color} ${statusConfig.iconClassName || ''}`} />
                    </div>
                    <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.color} border-transparent`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {formatDate(assignment.createdAt)}
                  </span>
                </div>

                {/* Assignment Details */}
                <div className="space-y-2 pl-8">
                  {/* Assigned By */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="text-text-secondary">Assigned by:</span>
                    <span className="font-medium">
                      {assignment.assigner?.name || assignment.assigner?.email || 'Unknown'}
                    </span>
                  </div>

                  {/* Assigned To */}
                  <div className="flex items-center gap-2 text-sm">
                    <Forward className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="text-text-secondary">Assigned to:</span>
                    <span className="font-medium">
                      {assignment.assignee?.name || assignment.assignee?.email || 'Unknown'}
                    </span>
                  </div>

                  {/* Notes */}
                  {assignment.notes && (
                    <div className="mt-2 p-2 bg-background-secondary rounded text-sm">
                      <p className="text-text-secondary italic">&quot;{assignment.notes}&quot;</p>
                    </div>
                  )}

                  {/* Response Info (if completed) */}
                  {assignment.status === 'completed' && assignment.respondedAt && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-status-success">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Responded on {formatDate(assignment.respondedAt)}</span>
                    </div>
                  )}

                  {/* Response Message Link */}
                  {assignment.responseMessage && (
                    <div className="mt-2 p-2 bg-status-success/5 border border-status-success/20 rounded text-sm">
                      <p className="text-text-secondary">
                        Response: <span className="font-medium">{assignment.responseMessage.subject || 'No subject'}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* HIPAA Compliance Footer */}
        <div className="mt-4 pt-4 border-t border-border-primary">
          <p className="text-xs text-text-tertiary">
            This audit trail is maintained for HIPAA compliance. All message assignments and responses are logged.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

