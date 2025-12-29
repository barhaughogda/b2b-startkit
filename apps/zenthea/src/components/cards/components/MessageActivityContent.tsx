'use client';

import React from 'react';
import { MessageSquare, CheckCircle, Star } from 'lucide-react';
import { MessageData } from '../MessageCard';

interface MessageActivityContentProps {
  messageData: MessageData;
}

export const MessageActivityContent: React.FC<MessageActivityContentProps> = ({ messageData }) => {
  const { timestamp, isRead, readAt, isStarred } = messageData;

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Message Activity</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated">
              <div className="flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-status-info" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Message sent</div>
                <div className="text-xs text-text-tertiary">
                  {new Date(timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            
            {isRead && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-status-success" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Message read</div>
                  <div className="text-xs text-text-tertiary">
                    {readAt ? new Date(readAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
              </div>
            )}
            
            {isStarred && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated">
                <div className="flex-shrink-0">
                  <Star className="h-5 w-5 text-status-warning" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Message starred</div>
                  <div className="text-xs text-text-tertiary">Important message</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
