// Mock messaging data for testing
export const mockMessages = [
  {
    id: 'msg-001',
    from: {
      id: 'provider-123',
      name: 'Dr. Sarah Johnson',
      type: 'provider'
    },
    to: {
      id: 'patient-456',
      name: 'John Doe',
      type: 'patient'
    },
    subject: 'Lab Results Available',
    content: 'Your recent lab results are now available in your patient portal. Please review them and let me know if you have any questions.',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'read',
    attachments: [
      {
        id: 'att-001',
        name: 'lab-results.pdf',
        type: 'application/pdf',
        size: 245760
      }
    ]
  },
  {
    id: 'msg-002',
    from: {
      id: 'patient-456',
      name: 'John Doe',
      type: 'patient'
    },
    to: {
      id: 'provider-123',
      name: 'Dr. Sarah Johnson',
      type: 'provider'
    },
    subject: 'Question about medication',
    content: 'I have a question about my recent prescription. Should I take it with food?',
    timestamp: '2024-01-16T14:20:00Z',
    status: 'sent',
    attachments: []
  }
];

export const mockNewMessage = {
  providerId: 'provider-123',
  subject: 'Question about appointment',
  content: 'I have a question about my upcoming appointment. What should I bring?',
  priority: 'normal'
};

export const mockMessageResponse = {
  success: true,
  message: {
    id: 'msg-003',
    subject: 'Question about appointment',
    content: 'I have a question about my upcoming appointment. What should I bring?',
    timestamp: '2024-01-17T09:15:00Z',
    status: 'sent'
  }
};
