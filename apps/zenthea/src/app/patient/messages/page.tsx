'use client';

// Force dynamic rendering - this page uses useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { createMockMessageData, mockMessageVariants, mockMessageHandlers } from '@/components/cards/mockData/MessageCardMockData';
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

interface Conversation {
  threadId: string;
  lastMessage: {
    _id: string;
    content: string;
    fromUserId: string;
    toUserId: string;
    fromUser: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
    toUser: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
    isRead: boolean;
    createdAt: number;
    messageType: string;
    priority: string;
    attachments?: Array<{ id: string; name: string; type: string; size: number; url: string }>;
  };
  unreadCount: number;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export default function PatientMessagesPage() {
  const { data: session } = useSession();
  const { openCard } = useCardSystem();
  
  // Bulk selection state
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const tenantId = session?.user?.tenantId || 'demo-tenant';
  // Use the session user ID directly - it should be the Convex ID after our auth fix
  const sessionUserId = session?.user?.id;
  
  // Check if userId is a valid Convex ID format (starts with 'j' or 'k' followed by alphanumeric)
  const isValidConvexId = sessionUserId && typeof sessionUserId === 'string' && /^[jk][a-z0-9]{15,}$/.test(sessionUserId);
  const userId = isValidConvexId ? (sessionUserId as Id<'users'>) : undefined;
  
  // Get the patient record for the current user by email to find their primary provider
  const userEmail = session?.user?.email;
  const patientRecord = useQuery(
    api.patients.getPatientByEmail,
    userEmail && tenantId ? { email: userEmail, tenantId } : 'skip'
  );
  
  // Get primary provider for the patient
  const primaryProvider = useQuery(
    api.careTeam.getPrimaryProvider,
    patientRecord?._id && tenantId
      ? { patientId: patientRecord._id as Id<'patients'>, tenantId }
      : 'skip'
  );

  // Fetch conversations directly from Convex using hooks (bypasses API route cookie issue)
  const conversations = useQuery(
    api.messages.getConversations,
    userId && tenantId ? {
      tenantId,
      userId,
      limit: 50
    } : 'skip'
  ) as Conversation[] | undefined;

  // Loading state - Convex queries return undefined while loading
  // Only show loading if we have a valid userId and query is not skipped
  const querySkipped = !userId || !tenantId;
  const loading = !querySkipped && conversations === undefined && session?.user !== undefined;
  
  // Debug logging
  if (session?.user && !isValidConvexId) {
    console.warn('⚠️ Session userId is not a valid Convex ID format:', sessionUserId);
  }

  // Transform conversations to Message format for DataTable
  const transformConversationsToMessages = (convs: Conversation[] | undefined): Message[] => {
    if (!convs) return [];
    
    return convs.map((conv) => {
      const otherUser = conv.otherUser;
      const lastMsg = conv.lastMessage;
      const careTeamMemberName = otherUser 
        ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Unknown Provider'
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
        status = lastMsg.fromUser?.role === 'patient' ? 'replied' : 'in-progress';
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
        careTeamMemberEmail: '', // Not available in conversation data
        subject: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
        preview: lastMsg.content,
        time,
        date: date.toISOString().split('T')[0]!,
        unread: conv.unreadCount > 0,
        priority,
        status,
        attachments: lastMsg.attachments?.length || 0,
        threadCount: 1, // We'd need to fetch thread messages to get actual count
        lastActivity: time,
        threadId: conv.threadId,
      };
    });
  };

  const messages = transformConversationsToMessages(conversations);

  // Sort messages by priority and urgency
  const sortedMessages = [...messages].sort((a, b) => {
    // First sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by unread status (unread first)
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    
    // Finally sort by time (newest first)
    return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime();
  });

  // Define table columns
  const columns: Column<Message>[] = [
    // Checkbox column for bulk selection
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
            <AvatarImage src={undefined} alt={row.careTeamMemberName} />
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
        <div onClick={(e) => e.stopPropagation()} data-prevent-row-click>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" data-prevent-row-click>
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

  // Define filter options
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

  const handleRowClick = async (message: Message) => {
    console.log('Row clicked:', message);
    
    // Fetch the full conversation thread
    try {
      const conversation = conversations?.find(c => c.threadId === message.threadId);
      const otherUser = conversation?.otherUser;
      
      let threadMessages: any[] = [];
      
      try {
        const response = await fetch(`/api/patient/conversations/${message.threadId}`, {
          headers: {
            'X-Tenant-ID': 'demo-tenant'
          }
        });
        
        if (response.ok) {
          threadMessages = await response.json();
        } else {
          console.warn('Failed to fetch conversation thread:', response.status, response.statusText);
          // Continue with empty thread messages - we'll use the conversation data we have
        }
      } catch (fetchError) {
        console.warn('Error fetching thread messages, using available data:', fetchError);
        // Continue with empty thread messages
      }

      // Map thread messages with proper structure
      const mappedThreadMessages = threadMessages.map((msg: any) => ({
          id: msg._id,
          sender: {
            id: msg.fromUser?.id || msg.fromUserId,
            name: msg.fromUser ? `${msg.fromUser.firstName || ''} ${msg.fromUser.lastName || ''}`.trim() : 'Unknown',
            role: msg.fromUser?.role || 'provider',
            initials: msg.fromUser ? `${msg.fromUser.firstName?.[0] || ''}${msg.fromUser.lastName?.[0] || ''}` : 'U',
            isProvider: msg.fromUser?.role !== 'patient'
          },
          content: msg.content,
          timestamp: new Date(msg.createdAt).toISOString(),
          isRead: msg.isRead,
          messageType: msg.fromUser?.role === 'patient' ? 'outgoing' : 'incoming',
          isInternal: false,
          attachments: msg.attachments || []
        }));

        // Use first thread message content, fall back to preview
        const firstMessage = mappedThreadMessages.length > 0 ? mappedThreadMessages[0] : null;
        const mainContent = firstMessage?.content || message.preview;

        // Collect all attachments from thread messages
        const allAttachments: Array<{
          id: string;
          name: string;
          type: string;
          size: number;
          url: string;
          thumbnail?: string;
        }> = [];
        
        mappedThreadMessages.forEach((msg: any) => {
          if (msg.attachments && Array.isArray(msg.attachments)) {
            msg.attachments.forEach((att: any) => {
              // Avoid duplicates by checking if attachment with same id already exists
              if (!allAttachments.find(a => a.id === att.id)) {
                allAttachments.push({
                  id: att.id || `att-${Date.now()}-${Math.random()}`,
                  name: att.name || 'Attachment',
                  type: att.type || 'application/octet-stream',
                  size: att.size || 0,
                  url: att.url || '',
                  thumbnail: att.thumbnail
                });
              }
            });
          }
        });

        // Determine sender and recipient based on first message
        const sender = firstMessage?.sender || {
          id: otherUser?.id || 'unknown',
          name: otherUser ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() : 'Unknown',
          role: otherUser?.role || 'provider',
          initials: otherUser ? `${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}` : 'U',
          isProvider: otherUser?.role !== 'patient'
        };

        const recipient = {
          id: session?.user?.id || '',
          name: session?.user?.name || 'You',
          role: 'patient',
          initials: session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U',
          isProvider: false
        };

        // Create message data for card
        const mockMessageData = createMockMessageData({
          id: message.threadId,
          patientId: session?.user?.id || '',
          patientName: session?.user?.name || 'You',
          subject: message.subject,
          content: mainContent,
          priority: message.priority === 'critical' ? 'urgent' : message.priority === 'medium' ? 'normal' : message.priority,
          isRead: !message.unread,
          timestamp: firstMessage?.timestamp || new Date(message.date ?? 0).toISOString(),
          sender,
          recipient,
          threadMessages: mappedThreadMessages.map(msg => ({
            ...msg,
            messageType: msg.messageType as 'incoming' | 'outgoing' | 'system' | 'notification'
          })),
          attachments: allAttachments
        });

        // Open message card
        console.log('Opening message card with data:', mockMessageData);
        openCard('message', {
          messageData: mockMessageData,
          handlers: mockMessageHandlers
        }, {
          id: message.threadId,
          priority: message.priority === 'critical' ? 'high' : message.priority === 'high' ? 'high' : 'medium',
          status: message.unread ? 'new' : 'inProgress',
          patientId: otherUser?.id || '',
          patientName: message.careTeamMemberName,
          dueDate: message.date,
          size: {
            min: 400,
            max: 800,
            default: 600,
            current: 600
          },
          position: {
            x: 100,
            y: 100
          },
          dimensions: {
            width: 600,
            height: 700
          },
          isMinimized: false,
          isMaximized: false,
          zIndex: 1000,
          config: {
            type: 'message',
            color: 'bg-green-50 border-green-200',
            icon: () => null,
            size: {
              min: 400,
              max: 800,
              default: 600,
              current: 600
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
              icon: <div>Icon</div>,
              badge: 'Message'
            }
          },
          createdAt: new Date(message.date ?? 0).toISOString(),
          accessCount: 0
        });
        console.log('Card opened successfully');
    } catch (error) {
      console.error('Error opening message card:', error);
      // Show user-friendly error message
      alert('Failed to open message. Please try again.');
    }
  };

  // Bulk action handlers
  const handleBulkArchive = async () => {
    try {
      for (const threadId of selectedMessages) {
        await fetch('/api/patient/conversations/archive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'demo-tenant'
          },
          body: JSON.stringify({
            threadId,
            userId: session?.user?.id
          })
        });
      }
      // Conversations will update automatically via Convex real-time
      setSelectedMessages([]);
    } catch (error) {
      console.error('Error archiving messages:', error);
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      for (const threadId of selectedMessages) {
        await fetch(`/api/patient/conversations/${threadId}`, {
          method: 'PATCH',
          headers: {
            'X-Tenant-ID': 'demo-tenant'
          }
        });
      }
      // Conversations will update automatically via Convex real-time
      setSelectedMessages([]);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleBulkDelete = () => {
    console.log('Deleting messages:', selectedMessages);
    // TODO: Implement bulk delete functionality
    setSelectedMessages([]);
  };

  // Handle creating a new message - defaults to primary provider
  const handleCreateNewMessage = useCallback(() => {
    if (!session?.user) return;
    
    // Get recipient - default to primary provider if available
    const recipient = primaryProvider?.hasProvider && primaryProvider.primaryProvider
      ? {
          id: primaryProvider.primaryProvider._id,
          name: primaryProvider.primaryProvider.name,
          role: 'provider',
          initials: primaryProvider.primaryProvider.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          isProvider: true
        }
      : null;
    
    // Create a new thread ID for this conversation
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Open message card in compose mode
    openCard('message', {
      id: `new-message-${Date.now()}`,
      patientId: patientRecord?._id || session.user.id,
      patientName: session.user.name || 'Patient',
      threadId: newThreadId,
      subject: '',
      messageType: 'outgoing',
      priority: 'normal',
      sender: {
        id: session.user.id,
        name: session.user.name || 'Patient',
        role: 'patient',
        initials: session.user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'P',
        isProvider: false
      },
      recipient: recipient || {
        id: '',
        name: 'Select Provider',
        role: 'provider',
        initials: '?',
        isProvider: true
      },
      content: '',
      timestamp: new Date().toISOString(),
      isRead: true,
      thread: [],
      attachments: [],
      isStarred: false,
      isArchived: false,
      tags: [],
      mode: 'compose'
    }, {
      id: `new-message-${Date.now()}`,
      type: 'message',
      title: recipient 
        ? `New Message to ${recipient.name}` 
        : 'New Message',
      content: null,
      priority: 'medium',
      status: 'new',
      patientId: patientRecord?._id || session.user.id,
      patientName: session.user.name || 'Patient',
      createdAt: new Date().toISOString(),
      accessCount: 0
    });
  }, [session, primaryProvider, patientRecord, openCard]);

  // Show loading state while fetching conversations
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show message if no session
  if (session === null || !session?.user) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <p className="text-muted-foreground mb-4">You need to be logged in to view messages.</p>
          <a href="/" className="text-zenthea-teal hover:underline">Go to login page</a>
        </div>
      </div>
    );
  }

  // Show message if userId is invalid (query was skipped)
  if (querySkipped && session?.user) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold mb-4">Unable to load messages</h2>
          <p className="text-muted-foreground mb-4">
            Your user account needs to be properly configured. Please contact support.
          </p>
          <p className="text-sm text-muted-foreground">
            User ID: {sessionUserId || 'Not available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
          <p className="text-text-secondary">Communicate with your care team</p>
        </div>
        <div className="flex items-center gap-2">
          {primaryProvider?.hasProvider && primaryProvider.primaryProvider && (
            <div className="flex items-center gap-2 text-sm text-text-secondary bg-interactive-primary/10 px-3 py-1 rounded-full">
              <UserCheck className="h-4 w-4 text-interactive-primary" />
              <span>Primary: {primaryProvider.primaryProvider.name}</span>
            </div>
          )}
          <Button 
            size="sm" 
            className="bg-zenthea-teal hover:bg-zenthea-teal-600 text-white rounded-full w-[50px] h-[50px] p-0"
            onClick={handleCreateNewMessage}
            title={primaryProvider?.hasProvider 
              ? `New message to ${primaryProvider.primaryProvider?.name}` 
              : 'New message'}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedMessages.length > 0 && (
        <div className="bg-zenthea-teal/10 border border-zenthea-teal/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-zenthea-teal">
                {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkAsRead}
                  className="text-zenthea-teal border-zenthea-teal hover:bg-zenthea-teal hover:text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  className="text-zenthea-purple border-zenthea-purple hover:bg-zenthea-purple hover:text-white"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMessages([])}
              className="text-gray-600"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={sortedMessages}
        columns={columns}
        searchKeys={['careTeamMemberName', 'careTeamMemberEmail', 'preview']}
        filterOptions={filterOptions}
        onRowClick={handleRowClick}
        searchPlaceholder="Search messages, care team members, or content..."
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
  );
}
