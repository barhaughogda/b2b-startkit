'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageData } from '../MessageCard';

interface MessageTagsContentProps {
  messageData: MessageData;
}

export const MessageTagsContent: React.FC<MessageTagsContentProps> = ({ messageData }) => {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Message Tags</h4>
          <div className="flex flex-wrap gap-2">
            {messageData.tags?.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(!messageData.tags || messageData.tags.length === 0) && (
              <div className="text-sm text-text-tertiary">No tags assigned</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
