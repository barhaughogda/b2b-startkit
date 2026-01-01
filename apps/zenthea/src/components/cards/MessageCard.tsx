'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
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
  threadId: string;
  subject: string;
  messageType: 'incoming' | 'outgoing' | 'system' | 'notification';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  sender: { id: string; name: string; role: string; avatar?: string; initials: string; isProvider: boolean; };
  recipient: { id: string; name: string; role: string; avatar?: string; initials: string; isProvider: boolean; };
  content: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  timestamp: string;
  sentAt: string;
  readAt?: string;
  threadMessages: {
    id: string;
    sender: { id: string; name: string; role: string; initials: string; isProvider: boolean; };
    content: string;
    timestamp: string;
    isRead: boolean;
    messageType?: 'incoming' | 'outgoing' | 'system' | 'notification';
    isInternal?: boolean;
    attachments?: string[];
  }[];
  attachments: { id: string; name: string; type: string; size: number; url: string; thumbnail?: string; }[];
  tags: string[];
  isEncrypted: boolean;
  readReceipts: { delivered: boolean; read: boolean; readAt?: string; };
  threadStatus: 'active' | 'closed' | 'archived';
  lastActivity: string;
  canReply: boolean;
  canForward: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canStar: boolean;
  actions?: { canReply: boolean; canForward: boolean; canEdit: boolean; canDelete: boolean; canArchive: boolean; canStar: boolean; canMarkAsRead: boolean; };
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
  
  const { 
    sender = { id: 'unknown', name: 'Unknown Sender', role: 'Unknown', initials: 'U', isProvider: false },
    recipient = { id: 'unknown', name: 'Unknown Recipient', role: 'Unknown', initials: 'U', isProvider: false },
    threadId = 'unknown-thread',
    priority = 'normal',
    threadMessages = [],
    careTeam = [],
    comments = []
  } = messageData || {};

  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState({ inApp: true, email: false, sms: false });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;
    
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;

    setIsSending(true);
    try {
      const recipientId = sender.id === currentUserId ? recipient.id : sender.id;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: recipientId,
          content: messageInput.trim(),
          threadId: threadId,
          messageType: 'general',
          priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal',
        }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (threadMessages.length > 0) {
      const timer = setTimeout(() => { setIsTyping(true); setTypingUser('Dr. Smith'); }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
      setTypingUser(null);
    }
  }, [threadMessages.length]);

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return <MessageInfoContent messageData={messageData} isTyping={isTyping} typingUser={typingUser} messageInput={messageInput} setMessageInput={setMessageInput} deliveryOptions={deliveryOptions} setDeliveryOptions={setDeliveryOptions} onSendMessage={handleSendMessage} onReply={() => {}} onForward={() => {}} onArchive={() => {}} onStar={() => {}} onUnstar={() => {}} isSending={isSending} />;
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
        return null;
    }
  };

  return (
    <BaseCardComponent {...props} handlers={handlers || {} as CardEventHandlers} activeTab={activeTab} onTabChange={onTabChange} tabNames={{ info: 'Message' }} className="message-card">
      {renderContent()}
    </BaseCardComponent>
  );
}
