'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Paperclip, 
  X, 
  File, 
  Image, 
  FileText, 
  Download,
  Loader2
} from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface FileAttachmentProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export function FileAttachment({ 
  attachments, 
  onAttachmentsChange, 
  disabled = false 
}: FileAttachmentProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/patient/messages/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          newAttachments.push(result.file);
        } else {
          const error = await response.json();
          alert(`Failed to upload ${file.name}: ${error.error}`);
        }
      }

      // Add new attachments to existing ones
      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (attachmentId: string) => {
    onAttachmentsChange(attachments.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) {
      return 'bg-status-success-bg text-status-success border border-status-success border-opacity-30';
    } else if (type === 'application/pdf') {
      return 'bg-status-error-bg text-status-error border border-status-error border-opacity-30';
    } else if (type.includes('word') || type.includes('document')) {
      return 'bg-status-info-bg text-status-info border border-status-info border-opacity-30';
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return 'bg-status-success-bg text-status-success border border-status-success border-opacity-30';
    } else {
      return 'bg-surface-secondary text-text-primary';
    }
  };

  return (
    <div className="space-y-2">
      {/* File Input */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {uploading ? 'Uploading...' : 'Attach Files'}
        </Button>
        {attachments.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
          </span>
        )}
      </div>

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(attachment.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getFileTypeColor(attachment.type)}`}
                        >
                          {attachment.type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(attachment.url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(attachment.id)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
