'use client';

import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Stethoscope, 
  ClipboardList,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  User as UserIcon,
  X,
  Plus,
  Trash2,
  Paperclip,
  MessageSquare,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  Activity as ActivityIcon,
  Edit,
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  BookOpen,
  PenTool,
  Clipboard,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority } from './types';
import { cn } from '@/lib/utils';

interface SOAPNoteCardProps extends BaseCardProps {
  soapNoteData: {
    id: string;
    patientId: string;
    patientName: string;
    provider: string;
    date: string;
    subjective: {
      chiefComplaint: string;
      historyOfPresentIllness: string;
      reviewOfSystems: string;
      socialHistory: string;
      familyHistory: string;
    };
    objective: {
      vitalSigns: string;
      physicalExam: string;
      laboratoryResults: string;
      imagingResults: string;
      otherFindings: string;
    };
    assessment: {
      diagnosis: string;
      differentialDiagnosis: string[];
      clinicalImpression: string;
      riskFactors: string[];
    };
    plan: {
      medications: string[];
      procedures: string[];
      followUp: string;
      patientEducation: string;
      referrals: string[];
    };
    status: 'draft' | 'inReview' | 'signed' | 'finalized';
    careTeam?: TeamMember[];
    tags?: CardTag[];
    documents?: Document[];
    comments?: CardComment[];
  };
}

export function SOAPNoteCard({ 
  soapNoteData, 
  handlers,
  activeTab = 'info',
  onTabChange,
  ...props 
}: SOAPNoteCardProps & { handlers: CardEventHandlers; activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity'; onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void }) {
  const { 
    patientName, 
    provider, 
    date, 
    subjective, 
    objective, 
    assessment, 
    plan,
    status,
    careTeam = [],
    tags = [],
    documents = [],
    comments = []
  } = soapNoteData;

  const [expandedSections, setExpandedSections] = useState({
    subjective: true,
    objective: true,
    assessment: true,
    plan: true
  });

  // Use the task status config from BaseCard
  const taskStatusConfig = {
    new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
    inProgress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
    deferred: { color: 'bg-gray-100 text-gray-800', label: 'Deferred' },
    waitingFor: { color: 'bg-purple-100 text-purple-800', label: 'Waiting For' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  };

  const statusInfo = taskStatusConfig[props.status] || taskStatusConfig.new;

  // SOAP Note status configuration
  const soapStatusConfig = {
    draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Edit },
    inReview: { color: 'bg-yellow-100 text-yellow-800', label: 'In Review', icon: Eye },
    signed: { color: 'bg-green-100 text-green-800', label: 'Signed', icon: CheckCircle },
    finalized: { color: 'bg-blue-100 text-blue-800', label: 'Finalized', icon: Save },
  };

  const soapStatusInfo = soapStatusConfig[status] || soapStatusConfig.draft;
  const StatusIcon = soapStatusInfo.icon;



  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Info Tab - SOAP-specific content
  const renderInfo = () => (
    <div className="p-4">
      <div className="space-y-6">
        {/* Provider Information */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Provider:</span>
              <span className="text-sm text-gray-900">{provider}</span>
            </div>
            {/* Status Display */}
            <div className="flex items-center space-x-2">
              <StatusIcon className="h-4 w-4" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${soapStatusInfo.color}`}>
                {soapStatusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* SOAP Sections */}
        <div className="space-y-4">
          {/* Subjective Section */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => toggleSection('subjective')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-blue-900">Subjective</CardTitle>
                </div>
                {expandedSections.subjective ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.subjective && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Chief Complaint</label>
                    <p className="text-sm text-gray-900 mt-1">{subjective.chiefComplaint}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">History of Present Illness</label>
                    <p className="text-sm text-gray-900 mt-1">{subjective.historyOfPresentIllness}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Review of Systems</label>
                    <p className="text-sm text-gray-900 mt-1">{subjective.reviewOfSystems}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Social History</label>
                    <p className="text-sm text-gray-900 mt-1">{subjective.socialHistory}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Family History</label>
                    <p className="text-sm text-gray-900 mt-1">{subjective.familyHistory}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Objective Section */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => toggleSection('objective')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm font-semibold text-green-900">Objective</CardTitle>
                </div>
                {expandedSections.objective ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.objective && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Vital Signs</label>
                    <p className="text-sm text-gray-900 mt-1">{objective.vitalSigns}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Physical Exam</label>
                    <p className="text-sm text-gray-900 mt-1">{objective.physicalExam}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Laboratory Results</label>
                    <p className="text-sm text-gray-900 mt-1">{objective.laboratoryResults}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Imaging Results</label>
                    <p className="text-sm text-gray-900 mt-1">{objective.imagingResults}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Other Findings</label>
                    <p className="text-sm text-gray-900 mt-1">{objective.otherFindings}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Assessment Section */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => toggleSection('assessment')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-sm font-semibold text-orange-900">Assessment</CardTitle>
                </div>
                {expandedSections.assessment ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.assessment && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Primary Diagnosis</label>
                    <p className="text-sm text-gray-900 mt-1">{assessment.diagnosis}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Differential Diagnosis</label>
                    <div className="mt-1 space-y-1">
                      {assessment.differentialDiagnosis.map((dx, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{dx}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Clinical Impression</label>
                    <p className="text-sm text-gray-900 mt-1">{assessment.clinicalImpression}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Risk Factors</label>
                    <div className="mt-1 space-y-1">
                      {assessment.riskFactors.map((risk, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-sm text-gray-900">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Plan Section */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => toggleSection('plan')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-semibold text-purple-900">Plan</CardTitle>
                </div>
                {expandedSections.plan ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.plan && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Medications</label>
                    <div className="mt-1 space-y-1">
                      {plan.medications.map((med, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{med}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Procedures</label>
                    <div className="mt-1 space-y-1">
                      {plan.procedures.map((proc, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{proc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Follow-up</label>
                    <p className="text-sm text-gray-900 mt-1">{plan.followUp}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patient Education</label>
                    <p className="text-sm text-gray-900 mt-1">{plan.patientEducation}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Referrals</label>
                    <div className="mt-1 space-y-1">
                      {plan.referrals.map((ref, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{ref}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4 border-t">
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Edit className="h-3 w-3" />
            <span>Edit Note</span>
          </Button>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>Review</span>
          </Button>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Save className="h-3 w-3" />
            <span>Sign & Finalize</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // Universal sections (shared across all cards)
  const renderMembers = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Care Team</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Plus className="h-3 w-3" />
            <span>Add Member</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          {careTeam.map((member, index) => (
            <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{member.role}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  const renderDueDate = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Due Date</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <CalendarIcon className="h-3 w-3" />
            <span>Set Date</span>
          </Button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">No due date set</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttachments = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Attachments</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Paperclip className="h-3 w-3" />
            <span>Upload</span>
          </Button>
        </div>
        
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <FileTextIcon className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.size}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Notes</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <Edit className="h-3 w-3" />
            <span>Edit</span>
          </Button>
        </div>
        
        <Textarea 
          placeholder="Add clinical notes or observations..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Activity</h3>
          <Button size="sm" variant="outline" className="flex items-center space-x-1">
            <ActivityIcon className="h-3 w-3" />
            <span>Export</span>
          </Button>
        </div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((comment, index) => (
            <div key={index} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{comment.author.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                  <span className="text-xs text-gray-500">{comment.timestamp}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfo();
      case 'members':
        return renderMembers();
      case 'dueDate':
        return renderDueDate();
      case 'attachments':
        return renderAttachments();
      case 'notes':
        return renderNotes();
      case 'activity':
        return renderActivity();
      default:
        return renderInfo();
    }
  };

  return (
    <BaseCardComponent
      {...props}
      handlers={handlers || {} as CardEventHandlers}
      type="soapNote"
      title={`SOAP Note - ${patientName}`}
      activeTab={activeTab}
      onTabChange={onTabChange}
      patientDateOfBirth={props.patientDateOfBirth}
    >
      {renderTabContent()}
    </BaseCardComponent>
  );
}

export default memo(SOAPNoteCard);
