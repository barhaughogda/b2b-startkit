'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Activity,
  Eye,
  Edit,
  FileText,
  Download,
  Trash2,
  UserPlus,
  UserMinus,
  Settings,
  Shield,
  Calendar,
  MessageSquare,
  Loader2,
  Filter,
  ChevronDown,
  Clock,
  User
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, subWeeks, subMonths } from 'date-fns';

interface PatientActivityTabProps {
  patientId: Id<'patients'>;
  tenantId: string;
}

// Action type icons and labels
const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  view_patient: { icon: <Eye className="h-4 w-4" />, label: 'Viewed', color: 'text-status-info' },
  view_patient_record: { icon: <Eye className="h-4 w-4" />, label: 'Viewed Record', color: 'text-status-info' },
  patient_accessed: { icon: <Eye className="h-4 w-4" />, label: 'Accessed', color: 'text-status-info' },
  patient_created: { icon: <UserPlus className="h-4 w-4" />, label: 'Created', color: 'text-status-success' },
  patient_updated: { icon: <Edit className="h-4 w-4" />, label: 'Updated', color: 'text-status-warning' },
  patient_deleted: { icon: <Trash2 className="h-4 w-4" />, label: 'Deleted', color: 'text-status-error' },
  medical_record_created: { icon: <FileText className="h-4 w-4" />, label: 'Record Created', color: 'text-status-success' },
  medical_record_accessed: { icon: <Eye className="h-4 w-4" />, label: 'Record Accessed', color: 'text-status-info' },
  medical_record_updated: { icon: <Edit className="h-4 w-4" />, label: 'Record Updated', color: 'text-status-warning' },
  medical_record_deleted: { icon: <Trash2 className="h-4 w-4" />, label: 'Record Deleted', color: 'text-status-error' },
  appointment_scheduled: { icon: <Calendar className="h-4 w-4" />, label: 'Appointment Scheduled', color: 'text-status-success' },
  appointment_updated: { icon: <Calendar className="h-4 w-4" />, label: 'Appointment Updated', color: 'text-status-warning' },
  appointment_cancelled: { icon: <Calendar className="h-4 w-4" />, label: 'Appointment Cancelled', color: 'text-status-error' },
  message_sent: { icon: <MessageSquare className="h-4 w-4" />, label: 'Message Sent', color: 'text-interactive-primary' },
  message_read: { icon: <MessageSquare className="h-4 w-4" />, label: 'Message Read', color: 'text-status-info' },
  data_export: { icon: <Download className="h-4 w-4" />, label: 'Data Exported', color: 'text-status-warning' },
  care_team_member_added: { icon: <UserPlus className="h-4 w-4" />, label: 'Care Team Added', color: 'text-status-success' },
  care_team_member_removed: { icon: <UserMinus className="h-4 w-4" />, label: 'Care Team Removed', color: 'text-status-error' },
  primary_provider_changed: { icon: <Shield className="h-4 w-4" />, label: 'Primary Provider Changed', color: 'text-interactive-primary' },
  permission_changed: { icon: <Settings className="h-4 w-4" />, label: 'Permission Changed', color: 'text-status-warning' },
  default: { icon: <Activity className="h-4 w-4" />, label: 'Activity', color: 'text-text-secondary' },
};

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Past Week' },
  { value: 'month', label: 'Past Month' },
  { value: '3months', label: 'Past 3 Months' },
  { value: 'all', label: 'All Time' },
];

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'view', label: 'Views Only' },
  { value: 'edit', label: 'Edits Only' },
  { value: 'create', label: 'Creates Only' },
  { value: 'delete', label: 'Deletes Only' },
];

/**
 * Patient Activity Tab Component
 * 
 * Displays audit trail of all activities related to a patient.
 * Shows who accessed the patient record, when, and what they did.
 * 
 * Features:
 * - Filter by date range
 * - Filter by action type
 * - Pagination with "load more"
 * - User name resolution
 * - Formatted timestamps
 */
export function PatientActivityTab({
  patientId,
  tenantId,
}: PatientActivityTabProps) {
  // State
  const [dateRange, setDateRange] = useState<string>('month');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [limit, setLimit] = useState<number>(20);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range
  const dateRangeValues = useMemo(() => {
    const now = Date.now();
    let startDate: number | undefined;
    
    switch (dateRange) {
      case 'today':
        startDate = subDays(now, 1).getTime();
        break;
      case 'week':
        startDate = subWeeks(now, 1).getTime();
        break;
      case 'month':
        startDate = subMonths(now, 1).getTime();
        break;
      case '3months':
        startDate = subMonths(now, 3).getTime();
        break;
      case 'all':
      default:
        startDate = undefined;
    }
    
    return { startDate, endDate: undefined };
  }, [dateRange]);

  // Query audit logs
  const auditLogs = useQuery(
    api.audit.getPHIAccessLogs,
    patientId && tenantId ? {
      tenantId,
      patientId,
      startDate: dateRangeValues.startDate,
      endDate: dateRangeValues.endDate,
      limit: limit + 1, // Fetch one extra to check if there are more
    } : 'skip'
  );

  // Query general audit logs (for non-PHI actions)
  const generalLogs = useQuery(
    api.auditLogs.getAuditLogs,
    patientId && tenantId ? {
      tenantId,
      resource: 'patient',
      startDate: dateRangeValues.startDate,
      endDate: dateRangeValues.endDate,
      limit: limit + 1,
    } : 'skip'
  );

  // Combine and filter logs
  const combinedLogs = useMemo(() => {
    const phiLogs = auditLogs?.logs || [];
    const otherLogs = (generalLogs?.logs || []).filter(log => 
      log.resourceId === patientId
    );
    
    // Combine and deduplicate by ID
    const logMap = new Map();
    [...phiLogs, ...otherLogs].forEach(log => {
      if (!logMap.has(log._id)) {
        logMap.set(log._id, log);
      }
    });
    
    let logs = Array.from(logMap.values());
    
    // Apply action filter
    if (actionFilter !== 'all') {
      logs = logs.filter(log => {
        const action = log.action.toLowerCase();
        switch (actionFilter) {
          case 'view':
            return action.includes('view') || action.includes('access') || action.includes('read');
          case 'edit':
            return action.includes('update') || action.includes('edit') || action.includes('change');
          case 'create':
            return action.includes('create') || action.includes('add') || action.includes('schedule');
          case 'delete':
            return action.includes('delete') || action.includes('remove') || action.includes('cancel');
          default:
            return true;
        }
      });
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    return logs;
  }, [auditLogs, generalLogs, actionFilter, patientId]);

  // Check if there are more logs
  const hasMore = combinedLogs.length > limit;
  const displayLogs = combinedLogs.slice(0, limit);

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || ACTION_CONFIG.default;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (diffDays < 7) {
      return format(date, 'EEEE \'at\' h:mm a');
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  // Loading state
  if (auditLogs === undefined) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-text-secondary" />
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {combinedLogs.length} {combinedLogs.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Complete audit trail of all activities related to this patient
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex gap-3 mb-4 p-3 bg-background-secondary rounded-lg">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Activity List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {displayLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No activity found for the selected filters</p>
              <p className="text-sm text-text-tertiary mt-1">
                Try adjusting the date range or action filter
              </p>
            </div>
          ) : (
            displayLogs.map((log) => {
              const config = getActionConfig(log.action);
              
              return (
                <div 
                  key={log._id} 
                  className="flex gap-3 p-3 bg-surface-elevated rounded-lg border border-border-primary hover:border-border-focus transition-colors"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary text-sm">
                        {config.label}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.resource}
                      </Badge>
                    </div>
                    
                    {/* User info */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                      <User className="h-3 w-3" />
                      <span>
                        {log.userId ? `User ID: ${log.userId.slice(-8)}` : 'System'}
                      </span>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                    
                    {/* PHI Access Details */}
                    {log.phiAccessed && (
                      <div className="mt-2 p-2 bg-background-secondary rounded text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-3 w-3 text-status-warning" />
                          <span className="font-medium text-text-primary">PHI Access</span>
                        </div>
                        <div className="text-text-secondary">
                          <span className="font-medium">Purpose:</span> {log.phiAccessed.purpose}
                        </div>
                        {log.phiAccessed.dataElements && log.phiAccessed.dataElements.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {log.phiAccessed.dataElements.slice(0, 5).map((element: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {element}
                              </Badge>
                            ))}
                            {log.phiAccessed.dataElements.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{log.phiAccessed.dataElements.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Additional Details */}
                    {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs text-text-tertiary">
                        {log.details.patientName && (
                          <span>Patient: {log.details.patientName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setLimit(prev => prev + 20)}
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

