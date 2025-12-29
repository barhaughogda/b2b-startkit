'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Weight, 
  Ruler,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Stethoscope,
  X,
  Plus,
  Trash2,
  Paperclip,
  MessageSquare,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText,
  Activity as ActivityIcon,
  BarChart3,
  LineChart,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority } from './types';
import { VitalSignsTrendChart } from './VitalSignsTrendChart';
import { StandardTrendChart } from './StandardTrendChart';
import { VitalSignsDisplay } from './VitalSignsDisplay';

import { cn } from '@/lib/utils';

interface VitalSignsCardProps extends BaseCardProps {
  vitalSignsData: {
    id: string;
    patientId: string;
    patientName: string;
    date: string;
    time: string;
    readings: {
      bloodPressure: {
        systolic: number;
        diastolic: number;
        unit: string;
        status: 'normal' | 'elevated' | 'high' | 'critical';
      };
      heartRate: {
        value: number;
        unit: string;
        status: 'normal' | 'elevated' | 'high' | 'critical';
      };
      temperature: {
        value: number;
        unit: string;
        status: 'normal' | 'elevated' | 'high' | 'critical';
      };
      weight: {
        value: number;
        unit: string;
        status: 'normal' | 'elevated' | 'high' | 'critical';
      };
      height: {
        value: number;
        unit: string;
        status: 'normal' | 'elevated' | 'high' | 'critical';
      };
    };
    trends: {
      bloodPressure: 'improving' | 'stable' | 'declining';
      heartRate: 'improving' | 'stable' | 'declining';
      temperature: 'improving' | 'stable' | 'declining';
      weight: 'improving' | 'stable' | 'declining';
    };
    historicalData: {
      bloodPressure: { date: string; systolic: number; diastolic: number; flag: string }[];
      heartRate: { date: string; value: number; flag: string }[];
      temperature: { date: string; value: number; flag: string }[];
      weight: { date: string; value: number; flag: string }[];
      height: { date: string; value: number; flag: string }[];
    };
    notes?: string;
    careTeam?: TeamMember[];
    tags?: CardTag[];
    documents?: Document[];
    comments?: CardComment[];
    activity?: Array<{
      id: string;
      action: string;
      description: string;
      user: string;
      role: string;
      timestamp: string;
      icon: string;
      type: string;
    }>;
  };
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
  onUpdate?: (data: any) => void;
  handlers?: CardEventHandlers;
  activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity';
  onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void;
}


// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'normal':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'elevated':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Trend icon mapping
const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'stable':
      return <Activity className="h-4 w-4 text-blue-600" />;
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
};

// Vital signs status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'normal':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'elevated':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
};

const VitalSignsCard: React.FC<VitalSignsCardProps> = memo(({
  vitalSignsData,
  onClose,
  onMinimize,
  onMaximize,
  onResize,
  onMove,
  onUpdate,
  handlers,
  activeTab = 'info',
  onTabChange,
  ...baseProps
}) => {
  const [notes, setNotes] = useState(vitalSignsData.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showTrends, setShowTrends] = useState(false);

  // Use historical data from props or fallback to empty arrays
  const trendData = useMemo(() => ({
    bloodPressure: vitalSignsData.historicalData?.bloodPressure || [],
    heartRate: vitalSignsData.historicalData?.heartRate || [],
    temperature: vitalSignsData.historicalData?.temperature || [],
    weight: vitalSignsData.historicalData?.weight || [],
    height: vitalSignsData.historicalData?.height || []
  }), [vitalSignsData.historicalData]);

  const handleNotesSave = useCallback(() => {
    if (onUpdate) {
      onUpdate({ ...vitalSignsData, notes });
    }
    setIsEditingNotes(false);
  }, [notes, onUpdate, vitalSignsData]);

  const handleCommentSubmit = useCallback(() => {
    if (newComment.trim() && onUpdate) {
      const comment: CardComment = {
        id: Date.now().toString(),
        content: newComment,
        author: 'Current User',
        authorRole: 'Provider',
        timestamp: new Date().toISOString(),
        isInternal: false
      };
      onUpdate({
        ...vitalSignsData,
        comments: [...(vitalSignsData.comments || []), comment]
      });
      setNewComment('');
    }
  }, [newComment, onUpdate, vitalSignsData]);

  const renderInfoTab = () => (
    <div className="space-y-6">

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blood Pressure */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium text-gray-900">Blood Pressure</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(vitalSignsData.readings.bloodPressure.status)}
              {getTrendIcon(vitalSignsData.trends.bloodPressure)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vitalSignsData.readings.bloodPressure.systolic}/{vitalSignsData.readings.bloodPressure.diastolic}
          </div>
          <div className="text-sm text-gray-600">{vitalSignsData.readings.bloodPressure.unit}</div>
          <Badge className={cn("mt-2", getStatusColor(vitalSignsData.readings.bloodPressure.status))}>
            {vitalSignsData.readings.bloodPressure.status}
          </Badge>
        </div>

        {/* Heart Rate */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium text-gray-900">Heart Rate</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(vitalSignsData.readings.heartRate.status)}
              {getTrendIcon(vitalSignsData.trends.heartRate)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vitalSignsData.readings.heartRate.value}
          </div>
          <div className="text-sm text-gray-600">{vitalSignsData.readings.heartRate.unit}</div>
          <Badge className={cn("mt-2", getStatusColor(vitalSignsData.readings.heartRate.status))}>
            {vitalSignsData.readings.heartRate.status}
          </Badge>
        </div>

        {/* Temperature */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-gray-900">Temperature</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(vitalSignsData.readings.temperature.status)}
              {getTrendIcon(vitalSignsData.trends.temperature)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vitalSignsData.readings.temperature.value}°
          </div>
          <div className="text-sm text-gray-600">{vitalSignsData.readings.temperature.unit}</div>
          <Badge className={cn("mt-2", getStatusColor(vitalSignsData.readings.temperature.status))}>
            {vitalSignsData.readings.temperature.status}
          </Badge>
        </div>

        {/* Weight */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-green-500" />
              <span className="font-medium text-gray-900">Weight</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(vitalSignsData.readings.weight.status)}
              {getTrendIcon(vitalSignsData.trends.weight)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vitalSignsData.readings.weight.value}
          </div>
          <div className="text-sm text-gray-600">{vitalSignsData.readings.weight.unit}</div>
          <Badge className={cn("mt-2", getStatusColor(vitalSignsData.readings.weight.status))}>
            {vitalSignsData.readings.weight.status}
          </Badge>
        </div>
      </div>

      {/* Height */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-gray-900">Height</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(vitalSignsData.readings.height.status)}
            <Activity className="h-4 w-4 text-gray-600" />
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {vitalSignsData.readings.height.value}
        </div>
        <div className="text-sm text-gray-600">{vitalSignsData.readings.height.unit}</div>
        <Badge className={cn("mt-2", getStatusColor(vitalSignsData.readings.height.status))}>
          {vitalSignsData.readings.height.status}
        </Badge>
      </div>

      {/* Trends Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTrends(!showTrends)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {showTrends ? 'Hide' : 'Show'} Trends
        </Button>
        <div className="text-sm text-gray-600">
          Last updated: {vitalSignsData.date} at {vitalSignsData.time}
        </div>
      </div>

      {/* Trends Display */}
      {showTrends && (
        <div className="space-y-6 min-h-[400px]">
          <h4 className="text-lg font-semibold text-gray-900">Trend Analysis</h4>
          
          {/* Blood Pressure Trend */}
          {trendData.bloodPressure.length > 0 && (
            <div className="mb-6">
              <StandardTrendChart
                historicalData={trendData.bloodPressure.map(item => ({
                  date: item.date,
                  value: item.systolic,
                  flag: item.flag
                }))}
                chartTitle="Blood Pressure (Systolic)"
              />
            </div>
          )}
          
          {/* Heart Rate Trend */}
          {trendData.heartRate.length > 0 && (
            <div className="mb-6">
              <StandardTrendChart
                historicalData={trendData.heartRate}
                chartTitle="Heart Rate"
              />
            </div>
          )}
          
          {/* Temperature Trend */}
          {trendData.temperature.length > 0 && (
            <div className="mb-6">
              <StandardTrendChart
                historicalData={trendData.temperature}
                chartTitle="Temperature"
              />
            </div>
          )}
          
          {/* Weight Trend */}
          {trendData.weight.length > 0 && (
            <div className="mb-6">
              <StandardTrendChart
                historicalData={trendData.weight}
                chartTitle="Weight"
              />
            </div>
          )}
          
          {/* Height Trend */}
          {trendData.height && trendData.height.length > 0 && (
            <div className="mb-6">
              <StandardTrendChart
                historicalData={trendData.height}
                chartTitle="Height"
              />
            </div>
          )}
          
          {/* No data message */}
          {trendData.bloodPressure.length === 0 && 
           trendData.heartRate.length === 0 && 
           trendData.temperature.length === 0 && 
           trendData.weight.length === 0 && 
           (!trendData.height || trendData.height.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No Historical Data Available</p>
              <p className="text-sm">Trend analysis requires multiple data points over time.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMembersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Care Team</h4>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>
      <div className="space-y-3">
        {(vitalSignsData.careTeam || []).map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar} />
              <AvatarFallback>{member.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-600">{member.role}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTagsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Tags</h4>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Tag
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(vitalSignsData.tags || []).map((tag) => (
          <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
            {tag.name}
            <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-gray-500 hover:text-red-600">
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );

  const renderDueDateTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Due Date</h4>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Set Due Date
        </Button>
      </div>
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>No due date set</span>
        </div>
      </div>
    </div>
  );

  const renderAttachmentsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Attachments</h4>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Upload File
        </Button>
      </div>
      <div className="space-y-2">
        {(vitalSignsData.documents || []).map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="p-2 bg-gray-100 rounded">
              <FileText className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{doc.name}</p>
              <p className="text-sm text-gray-600">{doc.size}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Notes</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditingNotes(!isEditingNotes)}
          className="flex items-center gap-2"
        >
          {isEditingNotes ? 'Save' : 'Edit'}
        </Button>
      </div>
      {isEditingNotes ? (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add clinical notes about vital signs..."
          className="min-h-[100px]"
        />
      ) : (
        <div className="p-4 border border-gray-200 rounded-lg min-h-[100px]">
          {notes || <span className="text-gray-500">No notes added yet</span>}
        </div>
      )}
      {isEditingNotes && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleNotesSave}>
            Save Notes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Activity</h4>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Export
        </Button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {(vitalSignsData.activity || []).map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="p-2 bg-gray-100 rounded">
              <ActivityIcon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{entry.action}</p>
              <p className="text-sm text-gray-600">{entry.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{entry.user}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{entry.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab();
      case 'members':
        return renderMembersTab();
      case 'dueDate':
        return renderDueDateTab();
      case 'attachments':
        return renderAttachmentsTab();
      case 'notes':
        return renderNotesTab();
      case 'activity':
        return renderActivityTab();
      default:
        return renderInfoTab();
    }
  };

  return (
    <BaseCardComponent
      {...baseProps}
      type="vitalSigns"
      title={`Vital Signs - ${vitalSignsData.patientName}`}
      activeTab={activeTab}
      onTabChange={onTabChange}
      handlers={handlers || {} as CardEventHandlers}
    >
      {renderTabContent()}
    </BaseCardComponent>
  );
});

VitalSignsCard.displayName = 'VitalSignsCard';

export default VitalSignsCard;
