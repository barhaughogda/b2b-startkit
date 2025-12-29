import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageCard } from '../MessageCard';
import { BaseCardProps, CardEventHandlers } from '../types';

// Mock event handlers
const mockHandlers: CardEventHandlers = {
  onResize: vi.fn(),
  onDrag: vi.fn(),
  onMinimize: vi.fn(),
  onExpand: vi.fn(),
  onMaximize: vi.fn(),
  onClose: vi.fn(),
  onFocus: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
  onAssignmentChange: vi.fn(),
  onCommentAdd: vi.fn(),
  onAIAssignment: vi.fn()
};

// Mock BaseCardProps
const mockBaseProps: BaseCardProps = {
  id: 'test-message-1',
  type: 'message',
  title: 'Follow-up on Lab Results',
  content: null,
  priority: 'high',
  status: 'new',
  patientId: 'patient-123',
  patientName: 'John Doe',
  dueDate: '2024-01-20',
  size: {
    min: 300,
    max: 600,
    default: 400,
    current: 400
  },
  position: {
    x: 100,
    y: 100
  },
  dimensions: {
    width: 400,
    height: 500
  },
  isMinimized: false,
  isMaximized: false,
  zIndex: 1000,
  comments: [],
  tags: [],
  documents: [],
  careTeam: [],
  auditTrail: [],
  aiAssigned: false,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  accessCount: 0
};

// Mock message data
const mockMessageData = {
  id: 'test-message-1',
  patientId: 'patient-123',
  patientName: 'John Doe',
  threadId: 'thread-123',
  subject: 'Follow-up on Lab Results',
  messageType: 'incoming' as const,
  priority: 'high' as const,
  sender: {
    id: 'provider-1',
    name: 'Dr. Sarah Johnson',
    role: 'Primary Care Physician',
    initials: 'SJ',
    isProvider: true
  },
  recipient: {
    id: 'patient-1',
    name: 'John Doe',
    role: 'Patient',
    initials: 'JD',
    isProvider: false
  },
  content: 'Hi John, I wanted to follow up on your recent lab results. The blood work looks good overall, but I noticed a few values that we should discuss.',
  isRead: false,
  isStarred: true,
  isArchived: false,
  timestamp: '2024-01-15T10:30:00Z',
  sentAt: '2024-01-15T10:30:00Z',
  threadMessages: [
    {
      id: 'msg-1',
      sender: {
        id: 'provider-1',
        name: 'Dr. Sarah Johnson',
        role: 'Provider',
        initials: 'SJ',
        isProvider: true
      },
      content: 'Initial message about lab results',
      timestamp: '2024-01-15T10:30:00Z',
      isRead: true,
      messageType: 'incoming' as const
    },
    {
      id: 'msg-2',
      sender: {
        id: 'patient-1',
        name: 'John Doe',
        role: 'Patient',
        initials: 'JD',
        isProvider: false
      },
      content: 'Thank you for reaching out. I\'m available tomorrow afternoon.',
      timestamp: '2024-01-15T14:20:00Z',
      isRead: true,
      messageType: 'outgoing' as const
    }
  ],
  attachments: [
    {
      id: 'att-1',
      name: 'Lab Results - Blood Work.pdf',
      type: 'document' as const,
      size: '2.3 MB',
      url: '/documents/lab-results.pdf'
    }
  ],
  actions: {
    canReply: true,
    canForward: true,
    canArchive: true,
    canDelete: true,
    canStar: true,
    canMarkAsRead: true
  },
  isEncrypted: true,
  isHIPAACompliant: true,
  retentionPolicy: '7 years',
  auditTrail: true
};

describe('MessageCard Debug', () => {
  it('debugs what is actually rendered', () => {
    render(
      <MessageCard 
        {...mockBaseProps} 
        messageData={mockMessageData} 
        handlers={mockHandlers} 
      />
    );
    
    // Print the entire DOM structure
    const cardElement = screen.getByTestId('card-system-card');
    console.log('Rendered HTML:', cardElement.innerHTML);
    
    // Try to find any text containing "Sarah"
    const sarahElements = screen.queryAllByText(/Sarah/i);
    console.log('Elements containing "Sarah":', sarahElements.length);
    
    // Try to find any text containing "Johnson"
    const johnsonElements = screen.queryAllByText(/Johnson/i);
    console.log('Elements containing "Johnson":', johnsonElements.length);
    
    // Try to find any text containing "Dr"
    const drElements = screen.queryAllByText(/Dr/i);
    console.log('Elements containing "Dr":', drElements.length);
    
    // Get all text content
    const allText = cardElement.textContent;
    console.log('All text content:', allText);
    
    // This test will always pass, it's just for debugging
    expect(true).toBe(true);
  });
});
