import React from 'react';
import { MessageSquare } from 'lucide-react';
import { CardType, CardTemplate, BaseCardProps, CardEventHandlers } from '../types';
import { MessageCard, MessageData } from '../MessageCard';
import { createMessageCard, createSampleMessageCard } from '../utils/MessageSampleData';

// Safely import Convex API with error handling
let api: any = undefined;
let isMessageApiAvailable = false;

try {
  // Use dynamic import to avoid module resolution errors at build time
  const convexApi = require('@/convex/_generated/api');
  api = convexApi.api;
  isMessageApiAvailable = typeof api !== 'undefined' && 
                          typeof api.messages !== 'undefined' && 
                          typeof api.messages.createMessage !== 'undefined';
} catch (error) {
  // API not available - will show fallback UI
  console.warn('Convex API not available:', error);
  isMessageApiAvailable = false;
}

export const messageTemplate: CardTemplate = {
  type: 'message',
  config: {
    type: 'message',
    color: 'bg-green-50 border-green-200',
    icon: MessageSquare,
    size: {
      min: 300,
      max: 500,
      default: 400,
      current: 400
    },
    layout: 'vertical',
    interactions: {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: {
      color: 'text-green-600',
      borderColor: 'border-green-500',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: 'Message'
    }
  },
  render: (props: BaseCardProps) => {
    // Use custom messageData if provided, otherwise create default
    const messageData: MessageData = props.messageData || {
      id: props.id,
      patientId: props.patientId || '',
      patientName: props.patientName || '',
      
      // Message Thread Information
      threadId: `thread-${props.id}`,
      subject: props.title || 'New Message',
      messageType: 'incoming' as const,
      priority: 'normal' as const,
      
      // Sender Information
      sender: {
        id: 'provider-1',
        name: 'Dr. Sarah Johnson',
        role: 'Internal Medicine Physician',
        avatar: undefined,
        initials: 'SJ',
        isProvider: true
      },
      
      // Recipient Information
      recipient: {
        id: props.patientId || 'patient-1',
        name: props.patientName || 'Patient',
        role: 'Patient',
        avatar: undefined,
        initials: (props.patientName || 'P').split(' ').map(n => n[0]).join('').toUpperCase(),
        isProvider: false
      },
      
      // Message Content
      content: 'This is a sample message content.',
      isRead: false,
      isStarred: false,
      isArchived: false,
      timestamp: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      readAt: undefined,
      
      // Thread Management
      threadMessages: [],
      
      // Attachments
      attachments: [],
      
      // Message Metadata
      tags: ['new', 'urgent'],
      isEncrypted: false,
      readReceipts: {
        delivered: true,
        read: false
      },
      
      // Thread Status
      threadStatus: 'active' as const,
      lastActivity: new Date().toISOString(),
      
      // Message Actions
      canReply: true,
      canForward: true,
      canEdit: true,
      canDelete: true,
      canArchive: true,
      canStar: true,
      
      // Additional properties
      actions: {
        canReply: true,
        canForward: true,
        canEdit: true,
        canArchive: true,
        canDelete: true,
        canStar: true,
        canMarkAsRead: true
      },
      careTeam: [],
      documents: [],
      comments: [],
      isHIPAACompliant: true
    };
    
    // Check if API is available before rendering MessageCard
    // This prevents the hooks violation error when useMutation is called with undefined
    if (!isMessageApiAvailable) {
      return (
        <div className="p-4 text-sm text-muted-foreground border border-border-primary rounded-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Message card is temporarily unavailable. Please refresh the page.</span>
          </div>
        </div>
      );
    }
    
    return <MessageCard 
      {...props} 
      messageData={messageData}
      handlers={props.handlers || {} as CardEventHandlers}
    />;
  },
  validate: (props: BaseCardProps) => {
    // Validate that required message data is present
    return props.type === 'message' && 
           Boolean(props.patientId) && 
           Boolean(props.patientName);
  }
};
