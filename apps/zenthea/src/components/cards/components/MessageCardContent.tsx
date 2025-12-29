'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MessageCardContentProps {
  message: {
    content: string;
    messageType: 'incoming' | 'outgoing' | 'system' | 'notification';
    isRead: boolean;
  };
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
}

const MessageCardContent: React.FC<MessageCardContentProps> = ({
  message,
  attachments = []
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type === 'application/pdf') {
      return '📄';
    } else if (type.startsWith('text/')) {
      return '📝';
    } else {
      return '📎';
    }
  };

  const renderMessageContent = () => {
    if (message.messageType === 'system') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-blue-600 rounded-full" />
            <span className="text-sm font-medium text-blue-800">System Message</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">{message.content}</p>
        </div>
      );
    }

    if (message.messageType === 'notification') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-yellow-600 rounded-full" />
            <span className="text-sm font-medium text-yellow-800">Notification</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">{message.content}</p>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Message Body */}
      <div className="space-y-2">
        {renderMessageContent()}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Attachments:</span>
            <span className="text-sm text-gray-500">({attachments.length})</span>
          </div>
          
          <div className="grid gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-lg">{getFileIcon(attachment.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <span className={cn(
            "px-2 py-1 rounded-full",
            message.isRead 
              ? "bg-green-100 text-green-800" 
              : "bg-blue-100 text-blue-800"
          )}>
            {message.isRead ? 'Read' : 'Unread'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="capitalize">{message.messageType}</span>
        </div>
      </div>
    </div>
  );
};

export { MessageCardContent };
