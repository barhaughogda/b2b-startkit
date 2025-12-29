'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { transformMessageToCardData } from '@/lib/utils/messageDataTransform';

interface Message {
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

interface PatientMessagesListProps {
  messages?: Message[];
  onMessageClick?: (message: Message) => void;
  className?: string;
  patientId?: string;
  patientName?: string;
  patientDateOfBirth?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    from: 'Dr. Sarah Johnson',
    to: 'Patient',
    subject: 'Test Results Available',
    content: 'Your recent blood work results are now available in your patient portal. Please review them and let me know if you have any questions.',
    timestamp: '2 hours ago',
    isRead: false,
    priority: 'high',
    type: 'incoming'
  },
  {
    id: '2',
    from: 'Nurse Practitioner Lisa',
    to: 'Patient',
    subject: 'Prescription Refill Approved',
    content: 'Your prescription for Lisinopril has been refilled and is ready for pickup at your preferred pharmacy.',
    timestamp: '1 day ago',
    isRead: true,
    priority: 'medium',
    type: 'incoming'
  },
  {
    id: '3',
    from: 'Dr. Michael Chen',
    to: 'Patient',
    subject: 'Appointment Reminder',
    content: 'This is a reminder that you have an appointment scheduled for Friday, January 20th at 2:30 PM. Please arrive 15 minutes early.',
    timestamp: '3 days ago',
    isRead: true,
    priority: 'medium',
    type: 'incoming'
  },
  {
    id: '4',
    from: 'Patient',
    to: 'Dr. Sarah Johnson',
    subject: 'Thank you for the update',
    content: 'Thank you for the update on my test results. When should I schedule my next appointment?',
    timestamp: '1 hour ago',
    isRead: true,
    priority: 'low',
    type: 'outgoing'
  },
  {
    id: '5',
    from: 'Dr. Sarah Johnson',
    to: 'Patient',
    subject: 'Follow-up Recommendation',
    content: 'Based on your results, I\'d recommend scheduling a follow-up in 3 months. I\'ll send you available time slots shortly.',
    timestamp: '45 minutes ago',
    isRead: true,
    priority: 'medium',
    type: 'incoming'
  },
  {
    id: '6',
    from: 'Patient',
    to: 'Dr. Sarah Johnson',
    subject: 'Perfect, thank you!',
    content: 'Perfect, thank you!',
    timestamp: '30 minutes ago',
    isRead: true,
    priority: 'low',
    type: 'outgoing'
  }
];

const priorityConfig = {
  high: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    dotColor: 'bg-red-500',
    label: 'High Priority'
  },
  medium: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    dotColor: 'bg-yellow-500',
    label: 'Medium Priority'
  },
  low: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    dotColor: 'bg-green-500',
    label: 'Low Priority'
  }
};

export function PatientMessagesList({ 
  messages = mockMessages, 
  onMessageClick,
  className,
  patientId,
  patientName,
  patientDateOfBirth
}: PatientMessagesListProps) {
  const { openCard } = useCardSystem();
  
  // Sort messages by timestamp (most recent first)
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  // Handle message click - open card instead of modal
  const handleMessageClick = (message: Message) => {
    // Call optional callback for analytics or other side effects
    onMessageClick?.(message);

    // Transform message to MessageData format using utility function
    const messageData = transformMessageToCardData(message, patientId, patientName);

    // Map priority from message to card priority
    const cardPriority: Priority = message.priority === 'high' ? 'high' : message.priority === 'medium' ? 'medium' : 'low';
    
    // Map status based on read state
    const cardStatus: TaskStatus = message.isRead ? 'completed' : 'new';

    // Open the card
    // Type assertion needed because MessageData interface lacks index signature
    // required by openCard's Record<string, unknown> parameter.
    // The double cast (as unknown as Record<string, unknown>) is necessary
    // to satisfy TypeScript's type checking while maintaining type safety.
    openCard('message' as CardType, messageData as unknown as Record<string, unknown>, {
      patientId: patientId || message.id,
      patientName: patientName || 'Patient',
      patientDateOfBirth: patientDateOfBirth,
      priority: cardPriority,
      status: cardStatus
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {sortedMessages.map((message) => {
        const priorityStyle = priorityConfig[message.priority];
        
        return (
          <Card 
            key={message.id}
            className={cn(
              "cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
              message.isRead 
                ? "bg-muted/30 border-muted-foreground/20" 
                : "bg-blue-50/50 border-blue-200",
              message.priority === 'high' && "border-l-red-500",
              message.priority === 'medium' && "border-l-yellow-500",
              message.priority === 'low' && "border-l-green-500"
            )}
            onClick={() => handleMessageClick(message)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'incoming' 
                      ? "bg-blue-100" 
                      : "bg-green-100"
                  )}>
                    <Mail className={cn(
                      "h-4 w-4",
                      message.type === 'incoming' 
                        ? "text-blue-600" 
                        : "text-green-600"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.type === 'incoming' ? message.from : message.to}
                      </span>
                      {!message.isRead && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          New
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", priorityStyle.color)}
                      >
                        {priorityStyle.label}
                      </Badge>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground mb-1">
                      {message.subject}
                    </p>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {message.timestamp}
                  </div>
                  
                  {/* Priority indicator dot */}
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    priorityStyle.dotColor
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
