import { ReactNode } from 'react';
import { MessageData } from './MessageCard';
import { LabResultData } from './LabResultCard';

// Re-export MessageData for use in other components
export type { MessageData };

// Card Types
export type CardType = 
  | 'appointment'
  | 'message'
  | 'labResult'
  | 'vitalSigns'
  | 'soapNote'
  | 'prescription'
  | 'procedure'
  | 'diagnosis';

// Task States
export type TaskStatus = 
  | 'new'
  | 'inProgress'
  | 'deferred'
  | 'waitingFor'
  | 'cancelled'
  | 'completed';

// Priority Levels
export type Priority = 
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

// Assignment Types
export type AssignmentType = 
  | 'provider'
  | 'nurse'
  | 'administration'
  | 'patient'
  | 'aiAssistant';

// Card Size Configuration
export interface CardSize {
  min: number;
  max: number;
  default: number;
  current: number;
}

// Card Position
export interface CardPosition {
  x: number;
  y: number;
}

// Card Dimensions
export interface CardDimensions {
  width: number;
  height: number;
}

// Previous State (for state restoration)
export interface PreviousState {
  isMaximized: boolean;
  position: CardPosition;
  dimensions: CardDimensions;
}

// Card Interactions
export interface CardInteractions {
  resizable: boolean;
  draggable: boolean;
  stackable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  closable: boolean;
}

// Priority Configuration
export interface PriorityConfig {
  color: string;
  borderColor: string;
  icon: ReactNode;
  badge: string;
}

// Card Configuration
export interface CardConfig {
  type: CardType;
  color: string;
  icon: React.ComponentType<any>;
  size: CardSize;
  layout: 'horizontal' | 'vertical' | 'compact' | 'detailed';
  interactions: CardInteractions;
  priority: PriorityConfig;
}

// Base Card Props
export interface BaseCardProps {
  id: string;
  type: CardType;
  title: string;
  content: ReactNode;
  priority: Priority;
  status: TaskStatus;
  assignedTo?: string;
  assignmentType?: AssignmentType;
  patientId: string;
  patientName: string;
  patientDateOfBirth?: string;
  dueDate?: string;
  size: CardSize;
  position: CardPosition;
  dimensions: CardDimensions;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  config: CardConfig;
  // Tab navigation
  activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity';
  onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void;
  // Custom tab names (optional)
  tabNames?: {
    info?: string;
    members?: string;
    tags?: string;
    dueDate?: string;
    attachments?: string;
    notes?: string;
    activity?: string;
  };
  // Task management
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  // Comments and discussion
  comments?: CardComment[];
  // Audit trail
  auditTrail?: CardAuditEntry[];
  // AI integration
  aiAssigned?: boolean;
  aiCompleted?: boolean;
  aiNeedsHumanInput?: boolean;
  // State restoration
  previousState?: PreviousState;
  // Event handlers
  handlers?: CardEventHandlers;
  // Message-specific data (for message cards)
  messageData?: MessageData;
  // Appointment-specific data (for appointment cards)
  appointmentData?: {
    id: string;
    patientId: string;
    patientName: string;
    time: string;
    date: string;
    duration: number;
    type: string;
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
    location?: string;
    locationId?: string;
    provider?: string;
    notes?: string;
    reminders?: string[];
    careTeam?: TeamMember[];
    tags?: Tag[];
    documents?: Document[];
    comments?: CardComment[];
    mode?: 'view' | 'edit' | 'create';
  };
}

// Team Member
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  initials: string;
  isActive: boolean;
}

// Card Tag
export interface Tag {
  id: string;
  name: string;
  color: string;
  category: 'medical' | 'priority' | 'status' | 'custom';
}

// Document
export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Card Comment
export interface CardComment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

// Card Audit Entry
export interface CardAuditEntry {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
}

// Card Event Handlers
export interface CardEventHandlers {
  onResize?: (id: string, dimensions: CardDimensions) => void;
  onDrag?: (id: string, position: CardPosition) => void;
  onMinimize?: (id: string) => void;
  onExpand?: (id: string) => void;
  onMaximize?: (id: string) => void;
  onClose?: (id: string) => void;
  onFocus?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  onPriorityChange?: (id: string, priority: Priority) => void;
  onAssignmentChange?: (id: string, assignedTo: string, assignmentType: AssignmentType) => void;
  onTabChange?: (id: string, tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void;
  onCommentAdd?: (id: string, comment: CardComment) => void;
  onAIAssignment?: (id: string, aiAssigned: boolean) => void;
  // Message specific handlers
  onReply?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  onMarkRead?: () => void;
  // Lab Result specific handlers
  onValueClick?: (testName: string) => void;
  onToggleTrends?: () => void;
  onCategoryChange?: (categoryId: string) => void;
  onSearchChange?: (query: string) => void;
  onReview?: () => void;
  onOrderFollowUp?: () => void;
  onNotifyPatient?: () => void;
  onPrint?: () => void;
  // Appointment specific handlers
  onAppointmentDataChange?: (id: string, appointmentData: Record<string, unknown>) => void;
}

// Card Stack
export interface CardStack {
  id: string;
  name: string;
  cards: string[];
  groupBy: 'priority' | 'type' | 'provider' | 'patient' | 'dueDate';
  position: CardPosition;
  isMinimized: boolean;
}

// Desktop Controls
export interface DesktopControls {
  onTileAll: () => void;
  onMinimizeAll: () => void;
  onCloseAll: () => void;
  onRestoreAll: () => void;
  onStackByPriority: () => void;
  onStackByType: () => void;
  onStackByProvider: () => void;
  onStackByPatient: () => void;
  onStackByDueDate: () => void;
  onFocusMode: () => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
}

// Card Template Interface
export interface CardTemplate {
  type: CardType;
  config: CardConfig;
  render: (props: BaseCardProps) => ReactNode;
  validate: (props: BaseCardProps) => boolean;
}

// Template Registry
export interface TemplateRegistry {
  [key: string]: CardTemplate;
}

// Message Card Props
export interface MessageCardProps extends BaseCardProps {
  messageData: MessageData;
  handlers?: CardEventHandlers;
}

// Lab Result Card Props  
export interface LabResultCardProps extends BaseCardProps {
  labData: LabResultData;
  handlers?: CardEventHandlers;
}

// Prescription Card Props
export interface PrescriptionCardProps extends BaseCardProps {
  prescriptionData: {
    id: string;
    patientId: string;
    patientName: string;
    patientDateOfBirth: string;
    medication: {
      name: string;
      genericName: string;
      strength: string;
      form: string;
      drugClass: string;
      ndc: string;
      manufacturer: string;
      controlledSubstance: boolean;
      schedule: string | null;
    };
    prescription: {
      status: 'active' | 'discontinued' | 'completed' | 'on-hold';
      dosage: string;
      frequency: string;
      quantity: number;
      refills: number;
      daysSupply: number;
      startDate: string;
      endDate: string | null;
      instructions: string;
      indication: string;
    };
    prescriber: {
      name: string;
      specialty: string;
      npi: string;
      dea: string;
      phone: string;
      email: string;
    };
    pharmacy: {
      name: string;
      address: string;
      phone: string;
      ncpdp: string;
      preferred: boolean;
    };
    interactions: {
      id: string;
      name: string;
      severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
      description: string;
    }[];
    allergies: {
      id: string;
      name: string;
      reaction: string;
      severity: 'mild' | 'moderate' | 'severe';
    }[];
    monitoring: {
      labTests: string[];
      vitalSigns: string[];
      symptoms: string[];
      frequency: string;
      followUp: string;
    };
    refillHistory: {
      id: string;
      date: string;
      pharmacy: string;
      quantity: number;
    }[];
    careTeam: TeamMember[];
    tags: Tag[];
    documents: Document[];
    comments: CardComment[];
  };
  handlers?: CardEventHandlers;
}

// Procedure Card Props
export interface ProcedureCardProps extends BaseCardProps {
  procedureData: {
    id: string;
    patientId: string;
    patientName: string;
    patientDateOfBirth: string;
    procedure: {
      type: string;
      code: string;
      description: string;
      category: string;
      duration: string;
      status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
      scheduledDate: string;
      performedDate: string | null;
      location: string;
      facility: string;
      anesthesia: string;
      preparation: string | null;
      instructions: string | null;
      indication: string;
      findings: string | null;
      complications: string | null;
      followUp: string | null;
    };
    provider: {
      name: string;
      npi: string;
      specialty: string;
      credentials: string;
      phone: string;
      email: string;
    };
    outcomes: {
      id: string;
      type: string;
      description: string;
      timestamp: string;
    }[];
    careTeam: TeamMember[];
    tags: Tag[];
    documents: Document[];
    comments: CardComment[];
  };
  handlers?: CardEventHandlers;
}

// Diagnosis Card Props
export interface DiagnosisCardProps extends BaseCardProps {
  diagnosisData: {
    id: string;
    patientId: string;
    patientName: string;
    patientDateOfBirth: string;
    diagnosis: {
      code: string;
      description: string;
      category: string;
      severity: 'mild' | 'moderate' | 'severe' | 'critical';
      status: 'active' | 'resolved' | 'chronic' | 'inactive';
      onsetDate: string;
      diagnosisDate: string;
      confirmedDate: string | null;
      icd10Code: string;
      snomedCode?: string;
    };
    provider: {
      name: string;
      npi: string;
      specialty: string;
      credentials: string;
      phone: string;
      email: string;
    };
    relatedConditions: {
      id: string;
      code: string;
      description: string;
      relationship: 'comorbid' | 'related' | 'complication';
    }[];
    treatmentPlan: {
      medications: {
        id: string;
        name: string;
        dosage: string;
        frequency: string;
      }[];
      lifestyle: string[];
      monitoring: string[];
      followUp: string;
    };
    careTeam: TeamMember[];
    tags: Tag[];
    documents: Document[];
    comments: CardComment[];
  };
  handlers?: CardEventHandlers;
}

// Card System Context
export interface CardSystemContext {
  cards: BaseCardProps[];
  stacks: CardStack[];
  activeCardId?: string;
  controls: DesktopControls;
  handlers: CardEventHandlers;
  templates: TemplateRegistry;
}
