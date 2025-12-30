'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useMutation } from 'convex/react';

// Type import for Id (always available at compile time)
import type { Id } from '@/convex/_generated/dataModel';

// Safely import Convex API with error handling
let api: any = undefined;
let isApiAvailable = false;

try {
  // Use dynamic import to avoid module resolution errors at build time
  const convexApi = require('@/convex/_generated/api');
  api = convexApi.api;
  isApiAvailable = typeof api !== 'undefined' && 
                   typeof api.messages !== 'undefined' && 
                   typeof api.messages.createMessage !== 'undefined';
} catch (error) {
  // API not available - will show fallback UI
  console.warn('Convex API not available:', error);
  isApiAvailable = false;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Send,
  Archive,
  Star,
  StarOff,
  Paperclip,
  Image,
  File,
  Download,
  Trash2,
  Edit,
  MoreHorizontal,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Mail,
  Phone,
  Video,
  Shield,
  Lock,
  Unlock,
  Mic,
  Smile,
  MessageSquare as SmsIcon
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority } from './types';
import { MessageThread } from './components/MessageThread';
import { MessageCardContent } from './components/MessageCardContent';
import { MessageCardHeader } from './components/MessageCardHeader';
import { MessageActions } from './components/MessageActions';
import { MessageAttachments } from './components/MessageAttachments';
import { MessageInfoContent } from './components/MessageInfoContent';
import { MessageMembersContent } from './components/MessageMembersContent';
import { MessageTagsContent } from './components/MessageTagsContent';
import { MessageDueDateContent } from './components/MessageDueDateContent';
import { MessageAttachmentsContent } from './components/MessageAttachmentsContent';
import { MessageNotesContent } from './components/MessageNotesContent';
import { MessageActivityContent } from './components/MessageActivityContent';
import { cn } from '@/lib/utils';

// Message Data Structure
export interface MessageData {
  id: string;
  patientId: string;
  patientName: string;
  
  // Message Thread Information
  threadId: string;
  subject: string;
  messageType: 'incoming' | 'outgoing' | 'system' | 'notification';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  
  // Sender Information
  sender: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    initials: string;
    isProvider: boolean;
  };
  
  // Recipient Information
  recipient: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    initials: string;
    isProvider: boolean;
  };
  
  // Message Content
  content: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  timestamp: string;
  sentAt: string;
  readAt?: string;
  
  // Thread Management
  threadMessages: {
    id: string;
    sender: {
      id: string;
      name: string;
      role: string;
      initials: string;
      isProvider: boolean;
    };
    content: string;
    timestamp: string;
    isRead: boolean;
    messageType?: 'incoming' | 'outgoing' | 'system' | 'notification';
    isInternal?: boolean;
    attachments?: string[];
  }[];
  
  // Attachments
  attachments: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    thumbnail?: string;
  }[];
  
  // Message Metadata
  tags: string[];
  isEncrypted: boolean;
  readReceipts: {
    delivered: boolean;
    read: boolean;
    readAt?: string;
  };
  
  // Thread Status
  threadStatus: 'active' | 'closed' | 'archived';
  lastActivity: string;
  
  // Message Actions
    canReply: boolean;
    canForward: boolean;
  canEdit: boolean;
  canDelete: boolean;
    canArchive: boolean;
    canStar: boolean;
  
  // Additional properties for the restored interface
  actions?: {
    canReply: boolean;
    canForward: boolean;
  canEdit: boolean;
  canDelete: boolean;
    canArchive: boolean;
    canStar: boolean;
    canMarkAsRead: boolean;
  };
  careTeam?: TeamMember[];
  documents?: Document[];
  comments?: CardComment[];
  isHIPAACompliant?: boolean;
}

export interface MessageCardProps extends BaseCardProps {
  messageData: MessageData;
  handlers?: CardEventHandlers & {
    onReply?: (content: string) => void;
    onForward?: () => void;
    onArchive?: () => void;
    onStar?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    onDownload?: (attachmentId: string) => void;
    onDeleteAttachment?: (attachmentId: string) => void;
    onMarkRead?: () => void;
    onCall?: () => void;
    onVideo?: () => void;
    onEmail?: () => void;
  };
}

export function MessageCard({ 
  messageData, 
  handlers,
  activeTab = 'info',
  onTabChange,
  ...props 
}: MessageCardProps & { handlers: CardEventHandlers }) {
  const { data: session } = useZentheaSession();
  // Safely handle useMutation - ensure API exists before calling
  // This prevents the "Cannot read properties of undefined (reading 'Symbol(functionName)')" error
  // in production when the API might not be fully generated
  // We must call useMutation unconditionally (React hooks rule)
  // If API is not available, the template will prevent this component from rendering,
  // but we still need to provide a valid function reference to satisfy React hooks rules
  // Use type assertion for fallback since template prevents rendering when API unavailable
  const createMessage = useMutation(
    (isApiAvailable && api.messages.createMessage
      ? api.messages.createMessage
      : (() => {
          throw new Error('Message creation API is not available. Please refresh the page.');
        }) as unknown as typeof api.messages.createMessage)
  );
  
  const { 
    patientName = 'Unknown Patient',
    threadId = 'unknown-thread',
    subject = 'No Subject',
    messageType = 'incoming',
    priority = 'normal',
    sender = { id: 'unknown', name: 'Unknown Sender', role: 'Unknown', initials: 'U', isProvider: false },
    recipient = { id: 'unknown', name: 'Unknown Recipient', role: 'Unknown', initials: 'U', isProvider: false },
    content = 'No content available',
    isRead = false,
    isStarred = false,
    isArchived = false,
    timestamp = new Date().toISOString(),
    threadMessages = [],
    attachments = [],
    actions = {
      canReply: true,
      canForward: true,
      canArchive: true,
      canDelete: true,
      canStar: true,
      canMarkAsRead: true
    },
    careTeam = [],
    documents = [],
    comments = [],
    isEncrypted = false,
    isHIPAACompliant = false
  } = messageData || {};

  // State for message input and interactions
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState({
    inApp: true,  // Default enabled
    email: false,
    sms: false
  });

  // Determine recipient ID based on current user
  const getRecipientId = (): Id<'users'> | null => {
    const currentUserId = session?.user?.id as Id<'users'> | undefined;
    if (!currentUserId) return null;
    
    // If current user is the sender, recipient is the recipient
    // If current user is the recipient, recipient is the sender
    if (sender.id === currentUserId) {
      return recipient.id as Id<'users'>;
    } else {
      return sender.id as Id<'users'>;
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;
    
    // Double-check that the API function exists
    if (!isApiAvailable || !api?.messages?.createMessage) {
      console.error('Message creation API function is undefined');
      alert('Unable to send message. The messaging API is not available. Please refresh the page and try again.');
      return;
    }
    
    const currentUserId = session?.user?.id as Id<'users'> | undefined;
    const recipientId = getRecipientId();
    const tenantId = session?.user?.tenantId || 'demo-tenant';
    
    if (!currentUserId || !recipientId) {
      console.error('Missing user ID or recipient ID');
      return;
    }

    setIsSending(true);
    
    try {
      await createMessage({
        tenantId,
        fromUserId: currentUserId,
        toUserId: recipientId,
        content: messageInput.trim(),
        threadId: threadId,
        messageType: 'general',
        priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal',
        attachments: []
      });
      
      // Clear input on success
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show user-friendly error message
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Demo typing indicator effect
  useEffect(() => {
    if (threadMessages.length > 0) {
      // Simulate someone typing after a delay
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTypingUser('Dr. Smith');
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
      setTypingUser(null);
    }
  }, [threadMessages.length]);

  // Tab content rendering functions


  // Main content renderer based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <MessageInfoContent
            messageData={messageData}
            isTyping={isTyping}
            typingUser={typingUser}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            deliveryOptions={deliveryOptions}
            setDeliveryOptions={setDeliveryOptions}
            onSendMessage={handleSendMessage}
            onReply={() => console.log('Reply action')}
            onForward={() => console.log('Forward action')}
            onArchive={() => console.log('Archive action')}
            onStar={() => console.log('Star action')}
            onUnstar={() => console.log('Unstar action')}
            isSending={isSending}
          />
        );
      case 'members':
        return <MessageMembersContent careTeam={careTeam} />;
      case 'tags':
        return <MessageTagsContent messageData={messageData} />;
      case 'dueDate':
        return <MessageDueDateContent dueDate={props.dueDate || new Date().toISOString()} priority={priority} />;
      case 'attachments':
        return <MessageAttachmentsContent messageData={messageData} />;
      case 'notes':
        return <MessageNotesContent comments={comments} />;
      case 'activity':
        return <MessageActivityContent messageData={messageData} />;
      default:
        return <MessageInfoContent
          messageData={messageData}
          isTyping={isTyping}
          typingUser={typingUser}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          deliveryOptions={deliveryOptions}
          setDeliveryOptions={setDeliveryOptions}
          onSendMessage={handleSendMessage}
          onReply={() => console.log('Reply action')}
          onForward={() => console.log('Forward action')}
          onArchive={() => console.log('Archive action')}
          onStar={() => console.log('Star action')}
          onUnstar={() => console.log('Unstar action')}
          isSending={isSending}
        />;
    }
  };

  return (
    <BaseCardComponent
      {...props}
      handlers={handlers || {} as CardEventHandlers}
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabNames={{ info: 'Message' }}
      className="message-card"
    >
      {/* Tab Content - BaseCard handles the tabs, we just provide content */}
      {renderContent()}
    </BaseCardComponent>
  );
}