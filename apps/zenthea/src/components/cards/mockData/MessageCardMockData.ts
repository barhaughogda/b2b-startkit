import { MessageData } from '../MessageCard';
import { TeamMember, CardComment, Document } from '../types';

// Mock event handlers
export const mockMessageHandlers = {
  onResize: () => {},
  onDrag: () => {},
  onMinimize: () => {},
  onExpand: () => {},
  onMaximize: () => {},
  onClose: () => {},
  onFocus: () => {},
  onStatusChange: () => {},
  onPriorityChange: () => {},
  onAssignmentChange: () => {},
  onCommentAdd: () => {},
  onAIAssignment: () => {}
};

// Mock care team members
export const mockCareTeam: TeamMember[] = [
  {
    id: 'provider-1',
    name: 'Dr. Sarah Johnson',
    role: 'Primary Care Physician',
    initials: 'SJ',
    avatar: undefined,
    isActive: true
  },
  {
    id: 'nurse-1',
    name: 'Nurse Mary Wilson',
    role: 'Registered Nurse',
    initials: 'MW',
    avatar: undefined,
    isActive: true
  },
  {
    id: 'specialist-1',
    name: 'Dr. Michael Chen',
    role: 'Cardiologist',
    initials: 'MC',
    avatar: undefined,
    isActive: false
  }
];

// Mock clinical notes/comments
export const mockComments: CardComment[] = [
  {
    id: 'comment-1',
    author: 'Dr. Sarah Johnson',
    authorRole: 'Primary Care Physician',
    content: 'Patient reports improvement in symptoms. Continue current medication.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isInternal: true
  },
  {
    id: 'comment-2',
    author: 'Nurse Mary Wilson',
    authorRole: 'Registered Nurse',
    content: 'Patient called with questions about side effects. Provided reassurance.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isInternal: true
  }
];

// Mock documents
export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Lab Results - Blood Work.pdf',
    type: 'application/pdf',
    size: '245760',
    url: '/documents/lab-results.pdf',
    uploadedBy: 'Dr. Sarah Johnson',
    uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'doc-2',
    name: 'Patient Chart - Recent Visit.png',
    type: 'image/png',
    size: '1024000',
    url: '/documents/patient-chart.png',
    uploadedBy: 'Nurse Mary Wilson',
    uploadedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

// Comprehensive mock message data
export const createMockMessageData = (overrides: Partial<MessageData> = {}): MessageData => {
  const baseData: MessageData = {
    id: 'message-123',
    patientId: 'patient-456',
    patientName: 'John Doe',
    threadId: 'thread-123',
    subject: 'Follow-up on Lab Results',
    messageType: 'incoming',
    priority: 'high',
    sender: {
      id: 'provider-123',
      name: 'Dr. Sarah Johnson',
      role: 'Primary Care Physician',
      initials: 'SJ',
      isProvider: true
    },
    recipient: {
      id: 'patient-456',
      name: 'John Doe',
      role: 'Patient',
      initials: 'JD',
      isProvider: false
    },
    content: 'Hi John, I wanted to follow up on your recent lab results. The blood work looks good overall, but I noticed a few values that we should discuss. Your cholesterol levels are slightly elevated, and I\'d like to schedule a follow-up appointment to discuss lifestyle changes and possibly adjust your medication.',
    isRead: false,
    isStarred: true,
    isArchived: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readAt: undefined,
    threadMessages: [
      {
        id: 'msg-1',
        sender: {
          id: 'provider-123',
          name: 'Dr. Sarah Johnson',
          role: 'Primary Care Physician',
          initials: 'SJ',
          isProvider: true
        },
        content: 'Hi John, I wanted to follow up on your recent lab results. The blood work looks good overall, but I noticed a few values that we should discuss.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        messageType: 'incoming',
        isInternal: false,
        attachments: ['Lab Results - Blood Work.pdf']
      },
      {
        id: 'msg-2',
        sender: {
          id: 'patient-456',
          name: 'John Doe',
          role: 'Patient',
          initials: 'JD',
          isProvider: false
        },
        content: 'Thank you for reaching out, Dr. Johnson. I\'m available tomorrow afternoon for a call. What specific values are you concerned about?',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        messageType: 'outgoing',
        isInternal: false
      },
      {
        id: 'msg-3',
        sender: {
          id: 'provider-123',
          name: 'Dr. Sarah Johnson',
          role: 'Primary Care Physician',
          initials: 'SJ',
          isProvider: true
        },
        content: 'Great! I\'ll call you tomorrow at 2 PM. The main concerns are your cholesterol levels - they\'re slightly elevated at 220 mg/dL. We should discuss dietary changes and possibly adjust your statin dosage.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: false,
        messageType: 'incoming',
        isInternal: false
      }
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'Lab Results - Blood Work.pdf',
        type: 'application/pdf',
        size: 245760,
        url: '/documents/lab-results.pdf',
        thumbnail: '/thumbnails/lab-results-thumb.png'
      },
      {
        id: 'att-2',
        name: 'Patient Chart - Recent Visit.png',
        type: 'image/png',
        size: 1024000,
        url: '/documents/patient-chart.png',
        thumbnail: '/thumbnails/patient-chart-thumb.png'
      }
    ],
    tags: ['follow-up', 'lab-results', 'cholesterol', 'high-priority'],
    isEncrypted: true,
    readReceipts: {
      delivered: true,
      read: false,
      readAt: undefined
    },
    threadStatus: 'active',
    lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    canReply: true,
    canForward: true,
    canEdit: false,
    canDelete: true,
    canArchive: true,
    canStar: true,
    actions: {
      canReply: true,
      canForward: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      canStar: true,
      canMarkAsRead: true
    },
    careTeam: mockCareTeam,
    documents: mockDocuments,
    comments: mockComments,
    isHIPAACompliant: true
  };

  return { ...baseData, ...overrides };
};

// Create different types of mock messages
export const mockMessageVariants = {
  urgent: (): MessageData => createMockMessageData({
    id: 'message-urgent',
    subject: 'URGENT: Severe Symptoms Report',
    priority: 'urgent',
    content: 'I am experiencing severe chest pain and shortness of breath. The pain started about 30 minutes ago and is getting worse. I\'m also feeling dizzy and nauseous. Should I go to the emergency room?',
    messageType: 'incoming',
    threadMessages: [
      {
        id: 'urgent-msg-1',
        sender: {
          id: 'patient-urgent',
          name: 'Robert Brown',
          role: 'Patient',
          initials: 'RB',
          isProvider: false
        },
        content: 'I am experiencing severe chest pain and shortness of breath. The pain started about 30 minutes ago and is getting worse.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: false,
        messageType: 'incoming',
        isInternal: false
      }
    ],
    tags: ['urgent', 'chest-pain', 'emergency']
  }),

  medicationQuestion: (): MessageData => createMockMessageData({
    id: 'message-medication',
    subject: 'Medication Side Effects Question',
    priority: 'normal',
    content: 'Hi Dr. Johnson, I\'ve been taking the new medication you prescribed for a week now. I\'m experiencing some mild nausea and headaches. Is this normal? Should I continue taking it?',
    messageType: 'incoming',
    threadMessages: [
      {
        id: 'med-msg-1',
        sender: {
          id: 'patient-med',
          name: 'Emily Wilson',
          role: 'Patient',
          initials: 'EW',
          isProvider: false
        },
        content: 'Hi Dr. Johnson, I\'ve been taking the new medication you prescribed for a week now. I\'m experiencing some mild nausea and headaches.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        messageType: 'incoming',
        isInternal: false
      },
      {
        id: 'med-msg-2',
        sender: {
          id: 'provider-123',
          name: 'Dr. Sarah Johnson',
          role: 'Primary Care Physician',
          initials: 'SJ',
          isProvider: true
        },
        content: 'Hi Emily, those side effects are common in the first week. Try taking the medication with food and increase your water intake. If symptoms persist beyond 2 weeks, let me know.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        messageType: 'outgoing',
        isInternal: false
      }
    ],
    tags: ['medication', 'side-effects', 'follow-up']
  }),

  appointmentRequest: (): MessageData => createMockMessageData({
    id: 'message-appointment',
    subject: 'Appointment Rescheduling Request',
    priority: 'low',
    content: 'Hi Dr. Johnson, I need to reschedule my appointment for next week. Something came up with work. Could we move it to Thursday afternoon instead?',
    messageType: 'incoming',
    threadMessages: [
      {
        id: 'apt-msg-1',
        sender: {
          id: 'patient-apt',
          name: 'Mike Davis',
          role: 'Patient',
          initials: 'MD',
          isProvider: false
        },
        content: 'Hi Dr. Johnson, I need to reschedule my appointment for next week. Something came up with work.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        messageType: 'incoming',
        isInternal: false
      }
    ],
    tags: ['appointment', 'reschedule', 'scheduling']
  })
};

// Export default mock data
export const defaultMockMessageData = createMockMessageData();
