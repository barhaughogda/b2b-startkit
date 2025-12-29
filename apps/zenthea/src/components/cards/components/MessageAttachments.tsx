'use client';

import React from 'react';
import { Download, Trash2, Eye, File, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  onDownload?: (attachmentId: string) => void;
  onDelete?: (attachmentId: string) => void;
  onPreview?: (attachmentId: string) => void;
  canDelete?: boolean;
  canDownload?: boolean;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments,
  onDownload,
  onDelete,
  onPreview,
  canDelete = true,
  canDownload = true
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
      return <ImageIcon className="h-5 w-5 text-green-600" />;
    } else if (type === 'application/pdf') {
      return <File className="h-5 w-5 text-red-600" />;
    } else {
      return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) {
      return 'border-green-200 bg-green-50';
    } else if (type === 'application/pdf') {
      return 'border-red-200 bg-red-50';
    } else {
      return 'border-gray-200 bg-gray-50';
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Attachments</h4>
        <span className="text-xs text-gray-500">{attachments.length} file(s)</span>
      </div>
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border",
              getFileTypeColor(attachment.type)
            )}
          >
            {/* File Icon */}
            <div className="flex-shrink-0">
              {getFileIcon(attachment.type)}
            </div>
            
            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.name}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 capitalize">
                  {attachment.type.split('/')[1]}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {onPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(attachment.id)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              
              {canDownload && onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(attachment.id)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(attachment.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { MessageAttachments };
