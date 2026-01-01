'use client';

// Force dynamic rendering - this page uses useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { createMockMessageData, mockMessageHandlers } from '@/components/cards/mockData/MessageCardMockData';
import { MessageSquare, User, MoreHorizontal, Mail, Phone, Calendar, Archive, Reply, Forward, Star, Trash2, CheckCircle, Plus, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTable, Column, FilterOption } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  subject: string;
  preview: string;
  time: string;
  date: string;
  unread: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in-progress' | 'replied' | 'archived';
  attachments: number;
  threadCount: number;
  lastActivity: string;
  aiSuggestion?: string;
  threadId: string;
}

export default function MessagesPage() {
  const { data: session } = useZentheaSession();
  const router = useRouter();
  const { openCard } = useCardSystem();
  
  // Bulk selection state
  const [selectedMessages, setSelectedMessages] = React.useState<string[]>([]);

  const currentUserId = session?.user?.id;

  // Fetch conversations from Postgres
  const { conversations, isLoading, error } = useConversations();

  // Transform conversations to Message format for DataTable
  const transformConversationsToMessages = (convs: any[]): Message[] => {
    if (!convs) return [];
    
    return convs
      .filter(conv => conv.otherUser?.role === 'patient') // Only show conversations with patients
      .map((conv) => {
        const otherUser = conv.otherUser;
        const lastMsg = conv.lastMessage;
        const patientName = otherUser 
          ? otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Unknown Patient'
          : 'Unknown Patient';
        
        // Determine priority from message priority
        const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
          'low': 'low',
          'normal': 'medium',
          'high': 'high',
          'urgent': 'critical'
        };
        const priority = priorityMap[lastMsg.priority] || 'medium';

        // Determine status based on unread count and last message
        let status: 'new' | 'in-progress' | 'replied' | 'archived' = 'new';
        if (conv.unreadCount === 0) {
          status = lastMsg.fromUserId === currentUserId ? 'replied' : 'in-progress';
        }

        // Format time
        const date = new Date(lastMsg.createdAt);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        let time = '';
        if (diffInHours < 1) {
          const minutes = Math.floor(diffInHours * 60);
          time = minutes === 0 ? 'Just now' : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
          time = `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 168) {
          const days = Math.floor(diffInHours / 24);
          time = `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
          time = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        const dateStr = date.toISOString().split('T')[0]!;

        return {
          id: conv.threadId,
          patientId: otherUser?.id || '',
          patientName,
          patientEmail: otherUser?.email || '',
          subject: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
          preview: lastMsg.content,
          time,
          date: dateStr,
          unread: conv.unreadCount > 0,
          priority,
          status,
          attachments: lastMsg.attachments?.length || 0,
          threadCount: 1, 
          lastActivity: time,
          threadId: conv.threadId,
        };
      });
  };

  const messages = transformConversationsToMessages(conversations);

  // Sort messages by priority and urgency
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => {
    // First sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by unread status (unread first)
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    
    // Finally sort by time (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }), [messages]);

  const handleRowClick = async (message: Message) => {
    try {
      const res = await fetch(`/api/messages/thread?threadId=${message.threadId}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const threadMessages = await res.json();

      const conversation = conversations?.find((c: any) => c.threadId === message.threadId);
      const otherUser = conversation?.otherUser;

      // Map thread messages with proper structure
      const mappedThreadMessages = threadMessages.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.fromUserId,
          name: msg.fromUserName || 'Unknown',
          role: msg.fromUserId === currentUserId ? 'provider' : 'patient',
          initials: msg.fromUserName ? msg.fromUserName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U',
          isProvider: msg.fromUserId === currentUserId
        },
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.isRead,
        messageType: msg.fromUserId === currentUserId ? 'outgoing' : 'incoming',
        isInternal: false,
        attachments: [] 
      }));

      // Use first thread message content, fall back to preview
      const firstMessage = mappedThreadMessages.length > 0 ? mappedThreadMessages[0] : null;
      const mainContent = firstMessage?.content || message.preview;

      const sender = {
        id: otherUser?.id || 'unknown',
        name: otherUser ? (otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim()) : 'Unknown',
        role: 'patient',
        initials: otherUser ? `${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}` : 'U',
        isProvider: false
      };

      const recipient = {
        id: session?.user?.id || '',
        name: session?.user?.name || 'You',
        role: session?.user?.role || 'provider',
        initials: session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U',
        isProvider: true
      };

      const priorityMap: Record<'low' | 'medium' | 'high' | 'critical', 'urgent' | 'high' | 'normal' | 'low'> = {
        'low': 'low',
        'medium': 'normal',
        'high': 'high',
        'critical': 'urgent'
      };

      const mockMsgData = createMockMessageData({
        id: message.threadId,
        patientId: message.patientId,
        patientName: message.patientName,
        subject: message.subject,
        content: mainContent,
        priority: priorityMap[message.priority],
        isRead: !message.unread,
        timestamp: firstMessage?.timestamp || new Date(message.date).toISOString(),
        sender,
        recipient,
        threadMessages: mappedThreadMessages.map((msg: any) => ({
          ...msg,
          messageType: msg.messageType as 'incoming' | 'outgoing' | 'system' | 'notification'
        })),
        attachments: []
      });

      openCard('message', {
        messageData: mockMsgData,
        handlers: mockMessageHandlers
      }, {
        id: message.threadId,
        priority: message.priority === 'critical' ? 'high' : message.priority === 'high' ? 'high' : 'medium',
        status: message.unread ? 'new' : 'inProgress',
        patientId: message.patientId,
        patientName: message.patientName,
        dueDate: message.date,
        size: { min: 400, max: 800, default: 600, current: 600 },
        position: { x: 100, y: 100 },
        dimensions: { width: 600, height: 700 },
        isMinimized: false,
        isMaximized: false,
        zIndex: 1000,
        config: {
          type: 'message',
          color: 'bg-status-success/5 border-status-success/20',
          icon: () => null,
          size: { min: 400, max: 800, default: 600, current: 600 },
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
            color: 'text-status-success',
            borderColor: 'border-status-success',
            icon: <div>Icon</div>,
            badge: 'Message'
          }
        },
        createdAt: new Date(message.date).toISOString(),
        accessCount: 0
      });
    } catch (error) {
      console.error('Error fetching conversation thread:', error);
    }
  };

  // Define table columns
  const columns: Column<Message>[] = [
    {
      key: 'id',
      label: (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedMessages.length === sortedMessages.length && sortedMessages.length > 0}
            onChange={() => {
              if (selectedMessages.length === sortedMessages.length) {
                setSelectedMessages([]);
              } else {
                setSelectedMessages(sortedMessages.map(msg => msg.id));
              }
            }}
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
        </div>
      ),
      sortable: false,
      render: (value, row) => (
        <input
          type="checkbox"
          checked={selectedMessages.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (selectedMessages.includes(row.id)) {
              setSelectedMessages(prev => prev.filter(id => id !== row.id));
            } else {
              setSelectedMessages(prev => [...prev, row.id]);
            }
          }}
          className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
        />
      ),
    },
    {
      key: 'patientName',
      label: 'Patient',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} alt={row.patientName} />
            <AvatarFallback className="bg-zenthea-teal text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium">{row.patientName}</div>
              {row.unread && (
                <div className="w-2 h-2 bg-zenthea-teal rounded-full"></div>
              )}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-1 mb-1">
              {row.preview}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value) => {
        const priorityColors = {
          critical: 'bg-status-critical/10 text-status-critical border-status-critical/20',
          high: 'bg-status-error/10 text-status-error border-status-error/20',
          medium: 'bg-status-warning/10 text-status-warning border-status-warning/20',
          low: 'bg-status-success/10 text-status-success border-status-success/20',
        };
        return (
          <Badge 
            variant="secondary"
            className={priorityColors[value as keyof typeof priorityColors]}
          >
            {value}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => {
        const statusColors = {
          new: 'bg-status-info/10 text-status-info border-status-info/20',
          'in-progress': 'bg-status-warning/10 text-status-warning border-status-warning/20',
          replied: 'bg-status-success/10 text-status-success border-status-success/20',
          archived: 'bg-text-tertiary/10 text-text-tertiary border-border-primary/20',
        };
        return (
          <Badge 
            variant="secondary"
            className={statusColors[value as keyof typeof statusColors]}
          >
            {value}
          </Badge>
        );
      },
    },
    {
      key: 'time',
      label: 'Time',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col items-end">
          <div className="text-sm font-medium text-muted-foreground">{row.time}</div>
          {row.threadCount > 1 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 bg-zenthea-teal rounded-full"></div>
              <span className="text-xs text-muted-foreground">{row.threadCount}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions' as keyof Message,
      label: 'Actions',
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Message Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Forward className="mr-2 h-4 w-4" />
              Forward
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="mr-2 h-4 w-4" />
              Star
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Phone className="mr-2 h-4 w-4" />
              Call Patient
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Email Patient
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              Add Appointment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'new', label: 'New' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'replied', label: 'Replied' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      key: 'date',
      label: 'Date',
      type: 'date-range',
    },
  ];

  if (isLoading) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 relative">
            <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
            <p className="text-text-secondary mt-1">Communicate with your patients and colleagues</p>
            <Button 
              size="sm" 
              className="absolute top-0 right-0 bg-zenthea-teal hover:bg-zenthea-teal-600 text-white rounded-full w-[50px] h-[50px] p-0"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedMessages.length > 0 && (
            <div className="bg-zenthea-teal/10 border border-zenthea-teal/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zenthea-teal">
                    {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-zenthea-teal border-zenthea-teal hover:bg-zenthea-teal hover:text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Read
                    </Button>
                    <Button variant="outline" size="sm" className="text-zenthea-teal-purple border-zenthea-purple hover:bg-zenthea-purple hover:text-white">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMessages([])} className="text-text-secondary">
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            data={sortedMessages}
            columns={columns}
            searchKeys={['patientName', 'patientEmail', 'preview']}
            filterOptions={filterOptions}
            onRowClick={handleRowClick}
            searchPlaceholder="Search messages, patients, or content..."
            entityLabel="messages"
            customActions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Message Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Clock className="w-4 h-4 mr-2" />
                    Message Templates
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archived Messages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </div>
      </div>
    </ClinicLayout>
  );
}
