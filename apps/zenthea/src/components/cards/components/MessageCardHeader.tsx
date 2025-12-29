'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertCircle, CheckCircle, Star, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageCardHeaderProps {
  message: {
    subject: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    priority: 'urgent' | 'high' | 'normal' | 'low';
    messageType: 'incoming' | 'outgoing' | 'system' | 'notification';
  };
  sender: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    initials: string;
    isProvider: boolean;
  };
  onStar?: () => void;
  onMarkRead?: () => void;
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

const MESSAGE_TYPE_ICONS = {
  incoming: User,
  outgoing: User,
  system: AlertCircle,
  notification: CheckCircle
} as const;

const MessageCardHeader: React.FC<MessageCardHeaderProps> = ({
  message,
  sender,
  onStar,
  onMarkRead
}) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const IconComponent = MESSAGE_TYPE_ICONS[message.messageType] || User;
  const priorityColor = PRIORITY_COLORS[message.priority] || PRIORITY_COLORS.normal;

  return (
    <div className="flex items-start justify-between p-4 border-b border-gray-200">
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={sender.avatar} alt={sender.name} />
          <AvatarFallback className="bg-blue-100 text-blue-800">
            {sender.initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {message.subject}
            </h3>
            {!message.isRead && (
              <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-sm text-gray-600">From: {sender.name}</p>
            <Badge variant="outline" className={cn("text-xs", priorityColor)}>
              {message.priority}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <IconComponent className="h-4 w-4" />
              <span className="capitalize">{message.messageType}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onStar}
          className={cn(
            "p-1 rounded-full transition-colors",
            message.isStarred 
              ? "text-yellow-500 hover:text-yellow-600" 
              : "text-gray-400 hover:text-yellow-500"
          )}
        >
          {message.isStarred ? (
            <Star className="h-4 w-4 fill-current" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </button>
        
        {!message.isRead && (
          <button
            onClick={onMarkRead}
            className="p-1 text-gray-400 hover:text-blue-600 rounded-full transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export { MessageCardHeader };
