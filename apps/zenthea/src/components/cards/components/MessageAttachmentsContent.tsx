'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, File, Image } from 'lucide-react';
import { MessageData } from '../MessageCard';

interface MessageAttachmentsContentProps {
  messageData: MessageData;
}

export const MessageAttachmentsContent: React.FC<MessageAttachmentsContentProps> = ({ messageData }) => {
  const { attachments = [], threadMessages = [] } = messageData;

  // Collect all attachments from both messageData.attachments and thread messages
  const allAttachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    thumbnail?: string;
  }> = [];

  // Add attachments from messageData.attachments
  attachments.forEach((att) => {
    if (!allAttachments.find(a => a.id === att.id)) {
      allAttachments.push(att);
    }
  });

  // Collect attachments from thread messages
  threadMessages.forEach((msg: any) => {
    if (msg.attachments && Array.isArray(msg.attachments)) {
      msg.attachments.forEach((att: any) => {
        // Avoid duplicates
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

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-status-info" />;
    }
    return <File className="h-4 w-4 text-text-tertiary" />;
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Attachments</h4>
          <div className="space-y-2">
            {allAttachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-primary">
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-text-tertiary">
                    {attachment.type} • {(attachment.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {allAttachments.length === 0 && (
              <div className="text-sm text-text-tertiary text-center py-4">
                No attachments
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
