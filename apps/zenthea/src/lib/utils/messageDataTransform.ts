import type { MessageData } from '@/components/cards/types';

/**
 * Interface for the simple Message format used in patient list components
 */
export interface SimpleMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  type: 'incoming' | 'outgoing';
}

/**
 * Transforms a simple Message object to MessageData format required by the card system.
 * 
 * This utility function handles the conversion from the simplified message format
 * used in patient list components to the comprehensive MessageData structure
 * required by the card system.
 * 
 * @param message - The simple message object to transform
 * @param patientId - Optional patient ID (falls back to message.id if not provided)
 * @param patientName - Optional patient name (falls back to 'Patient' if not provided)
 * @returns MessageData object ready for use with the card system
 */
export function transformMessageToCardData(
  message: SimpleMessage,
  patientId?: string,
  patientName?: string
): MessageData {
  // Helper function to generate initials from a name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const isIncoming = message.type === 'incoming';
  const patientNameValue = patientName || 'Patient';
  const patientIdValue = patientId || message.id;

  // Map priority from message format to card format
  const cardPriority: MessageData['priority'] = 
    message.priority === 'high' ? 'high' : 
    message.priority === 'medium' ? 'normal' : 
    'low';

  return {
    id: message.id,
    patientId: patientIdValue,
    patientName: patientNameValue,
    threadId: `thread-${message.id}`,
    subject: message.subject,
    messageType: message.type,
    priority: cardPriority,
    sender: {
      id: isIncoming ? 'sender-id' : 'patient-id',
      name: isIncoming ? message.from : patientNameValue,
      role: isIncoming ? 'Provider' : 'Patient',
      initials: isIncoming ? getInitials(message.from) : getInitials(patientNameValue),
      isProvider: isIncoming,
    },
    recipient: {
      id: isIncoming ? 'patient-id' : 'recipient-id',
      name: isIncoming ? patientNameValue : message.to,
      role: isIncoming ? 'Patient' : 'Provider',
      initials: isIncoming ? getInitials(patientNameValue) : getInitials(message.to),
      isProvider: !isIncoming,
    },
    content: message.content,
    isRead: message.isRead,
    isStarred: false,
    isArchived: false,
    timestamp: message.timestamp,
    sentAt: message.timestamp,
    readAt: message.isRead ? message.timestamp : undefined,
    threadMessages: [
      {
        id: message.id,
        sender: {
          id: isIncoming ? 'sender-id' : 'patient-id',
          name: isIncoming ? message.from : patientNameValue,
          role: isIncoming ? 'Provider' : 'Patient',
          initials: isIncoming ? getInitials(message.from) : getInitials(patientNameValue),
          isProvider: isIncoming,
        },
        content: message.content,
        timestamp: message.timestamp,
        isRead: message.isRead,
        messageType: message.type,
      },
    ],
    attachments: [],
    tags: [],
    isEncrypted: false,
    readReceipts: {
      delivered: true,
      read: message.isRead,
      readAt: message.isRead ? message.timestamp : undefined,
    },
    threadStatus: 'active',
    lastActivity: message.timestamp,
    canReply: true,
    canForward: true,
    canEdit: false,
    canDelete: false,
    canArchive: true,
    canStar: true,
    actions: {
      canReply: true,
      canForward: true,
      canEdit: false,
      canDelete: false,
      canArchive: true,
      canStar: true,
      canMarkAsRead: true,
    },
  };
}

