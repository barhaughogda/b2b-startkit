'use client';

// Force dynamic rendering - this page uses useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useMemo } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useConversations } from '@/hooks/useConversations';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { createMockMessageData, mockMessageHandlers } from '@/components/cards/mockData/MessageCardMockData';
import { MessageSquare, User, Clock, MoreHorizontal, Archive, Reply, Forward, Star, CheckCircle, Plus, Trash2, Loader2, UserCheck } from 'lucide-react';
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
  careTeamMemberId: string;
  careTeamMemberName: string;
  careTeamMemberEmail: string;
  subject: string;
  preview: string;
  time: string;
  date: string | undefined;
  unread: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in-progress' | 'replied' | 'archived';
  attachments: number;
  threadCount: number;
  lastActivity: string;
  threadId: string;
}

export default function PatientMessagesPage() {
  const { data: session } = useZentheaSession();
  const { openCard } = useCardSystem();
  
  // Bulk selection state
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const currentUserId = session?.user?.id;

  // Fetch conversations from Postgres
  const { conversations, isLoading } = useConversations();

  // Transform conversations to Message format for DataTable
  const transformConversationsToMessages = (convs: any[]): Message[] => {
    if (!convs) return [];
    
    return convs.map((conv) => {
      const otherUser = conv.otherUser;
      const lastMsg = conv.lastMessage;
      const careTeamMemberName = otherUser 
        ? otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Unknown Provider'
        : 'Unknown Provider';
      
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

      return {
        id: conv.threadId,
        careTeamMemberId: otherUser?.id || '',
        careTeamMemberName,
        careTeamMemberEmail: otherUser?.email || '',
        subject: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
        preview: lastMsg.content,
        time,
        date: date.toISOString().split('T')[0]!,
        unread: conv.unreadCount > 0,
        priority,
        status,
        attachments: 0,
        threadCount: 1, 
        lastActivity: time,
        threadId: conv.threadId,
      };
    });
  };

  const messages = transformConversationsToMessages(conversations);

  // Sort messages by priority and urgency
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime();
  }), [messages]);

  const handleRowClick = async (message: Message) => {
    try {
      const res = await fetch(`/api/messages/thread?threadId=${message.threadId}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const threadMessages = await res.json();

      const conversation = conversations?.find((c: any) => c.threadId === message.threadId);
      const otherUser = conversation?.otherUser;

      const mappedThreadMessages = threadMessages.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.fromUserId,
          name: msg.fromUserName || 'Unknown',
          role: msg.fromUserId === currentUserId ? 'patient' : 'provider',
          initials: msg.fromUserName ? msg.fromUserName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U',
          isProvider: msg.fromUserId !== currentUserId
        },
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.isRead,
        messageType: msg.fromUserId === currentUserId ? 'outgoing' : 'incoming',
        isInternal: false,
        attachments: []
      }));

      const firstMessage = mappedThreadMessages.length > 0 ? mappedThreadMessages[0] : null;
      const mainContent = firstMessage?.content || message.preview;

      const sender = {
        id: otherUser?.id || 'unknown',
        name: otherUser ? (otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim()) : 'Unknown',
        role: 'provider',
        initials: otherUser ? `${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}` : 'U',
        isProvider: true
      };

      const recipient = {
        id: session?.user?.id || '',
        name: session?.user?.name || 'You',
        role: 'patient',
        initials: session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U',
        isProvider: false
      };

      const priorityMap: Record<'low' | 'medium' | 'high' | 'critical', 'urgent' | 'high' | 'normal' | 'low'> = {
        'low': 'low',
        'medium': 'normal',
        'high': 'high',
        'critical': 'urgent'
      };

      const mockMsgData = createMockMessageData({
        id: message.threadId,
        patientId: session?.user?.id || '',
        patientName: session?.user?.name || 'You',
        subject: message.subject,
        content: mainContent,
        priority: priorityMap[message.priority],
        isRead: !message.unread,
        timestamp: firstMessage?.timestamp || new Date(message.date ?? 0).toISOString(),
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
        patientId: session?.user?.id || '',
        patientName: session?.user?.name || 'You',
        dueDate: message.date,
        size: { min: 400, max: 800, default: 600, current: 600 },
        position: { x: 100, y: 100 },
        dimensions: { width: 600, height: 700 },
        isMinimized: false,
        isMaximized: false,
        zIndex: 1000,
        config: {
          type: 'message',
          color: 'bg-green-50 border-green-200',
          icon: () => null,
          size: { min: 400, max: 800, default: 600, current: 600 },
          layout: 'vertical',
          interactions: {
            resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true
          },
          priority: {
            color: 'text-green-600', borderColor: 'border-green-500', icon: <div>Icon</div>, badge: 'Message'
          }
        },
        createdAt: new Date(message.date ?? 0).toISOString(),
        accessCount: 0
      });
    } catch (error) {
      console.error('Error opening message card:', error);
    }
  };

  const handleCreateNewMessage = useCallback(() => {
    // Simplified compose logic for now
    openCard('message', {
      mode: 'compose',
      patientId: session?.user?.id,
      patientName: session?.user?.name,
    }, {
      id: `new-message-${Date.now()}`,
      type: 'message',
      title: 'New Message',
      content: null,
      priority: 'medium',
      status: 'new',
      patientId: session?.user?.id || '',
      patientName: session?.user?.name || 'Patient',
      createdAt: new Date().toISOString(),
      accessCount: 0
    });
  }, [session, openCard]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Define columns
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
      key: 'careTeamMemberName',
      label: 'Care Team Member',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-zenthea-teal text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium">{row.careTeamMemberName}</div>
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
          critical: 'bg-red-100 text-red-800 hover:bg-red-200',
          high: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
          medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          low: 'bg-green-100 text-green-800 hover:bg-green-200',
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
          new: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          'in-progress': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          replied: 'bg-green-100 text-green-800 hover:bg-green-200',
          archived: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
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
        </div>
      ),
    },
    {
      key: 'actions' as keyof Message,
      label: 'Actions',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
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
                <Star className="mr-2 h-4 w-4" />
                Star
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
          <p className="text-text-secondary">Communicate with your care team</p>
        </div>
        <Button 
          size="sm" 
          className="bg-zenthea-teal hover:bg-zenthea-teal-600 text-white rounded-full w-[50px] h-[50px] p-0"
          onClick={handleCreateNewMessage}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {selectedMessages.length > 0 && (
        <div className="bg-zenthea-teal/10 border border-zenthea-teal/20 rounded-lg p-4">
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

      <DataTable
        data={sortedMessages}
        columns={columns}
        searchKeys={['careTeamMemberName', 'careTeamMemberEmail', 'preview']}
        filterOptions={filterOptions}
        onRowClick={handleRowClick}
        searchPlaceholder="Search messages, care team members, or content..."
        entityLabel="messages"
      />
    </div>
  );
}
