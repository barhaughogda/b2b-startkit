import React from 'react';
import { BaseCardProps, CardEventHandlers } from '../types';
import { MessageCard, MessageData } from '../MessageCard';

// Sample data factory for testing
export function createSampleMessageCard(
  id: string,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>,
  handlers: CardEventHandlers
): React.ReactElement {
  const sampleMessageData: MessageData = {
    id,
    patientId: 'patient-001',
    patientName: 'John Doe',
    threadId: 'thread-001',
    subject: 'Follow-up on test results',
    messageType: 'incoming',
    priority: 'normal',
    sender: {
      id: 'provider-001',
      name: 'Dr. Sarah Johnson',
      role: 'Primary Care Physician',
      initials: 'SJ',
      isProvider: true
    },
    recipient: {
      id: 'patient-001',
      name: 'John Doe',
      role: 'Patient',
      initials: 'JD',
      isProvider: false
    },
    content: 'Hi John, I wanted to follow up on your recent lab results. Everything looks good, but I\'d like to schedule a follow-up appointment to discuss the results in detail.',
    isRead: false,
    isStarred: false,
    isArchived: false,
    timestamp: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    threadMessages: [],
    attachments: [],
    tags: ['follow-up', 'test-results'],
    isEncrypted: false,
    readReceipts: {
      delivered: true,
      read: false
    },
    threadStatus: 'active',
    lastActivity: new Date().toISOString(),
    canReply: true,
    canForward: true,
    canEdit: false,
    canDelete: true,
    canArchive: true,
    canStar: true
  };

  return <MessageCard 
    id={id}
    type="message"
    content={null}
    messageData={sampleMessageData} 
    handlers={handlers} 
    {...baseProps} 
  />;
}

// Factory function for creating MessageCard with custom data
export function createMessageCard(
  messageData: MessageData,
  handlers: CardEventHandlers,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>
): React.ReactElement {
  return <MessageCard 
    id={messageData.id}
    type="message"
    content={null}
    messageData={messageData} 
    handlers={handlers} 
    {...baseProps} 
  />;
}
