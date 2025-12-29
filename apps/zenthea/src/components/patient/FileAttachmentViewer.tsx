'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  Image,
  File,
  Video,
  Music,
  Archive,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  category: 'lab-result' | 'imaging' | 'document' | 'prescription' | 'report';
  description?: string;
  thumbnail?: string;
}

interface FileAttachmentViewerProps {
  attachments: FileAttachment[];
  onView?: (attachment: FileAttachment) => void;
  onDownload?: (attachment: FileAttachment) => void;
  onDelete?: (attachment: FileAttachment) => void;
  showActions?: boolean;
  maxHeight?: string;
}

export function FileAttachmentViewer({ 
  attachments, 
  onView, 
  onDownload, 
  onDelete,
  showActions = true,
  maxHeight = "400px"
}: FileAttachmentViewerProps) {
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getFileIcon = (type: string) => {
    const fileType = type.toLowerCase();
    
    if (fileType.includes('pdf')) return <File className="h-6 w-6 text-status-error" />;
    if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png') || fileType.includes('gif')) {
      return <FileImage className="h-6 w-6 text-status-info" />;
    }
    if (fileType.includes('video') || fileType.includes('mp4') || fileType.includes('avi')) {
      return <FileVideo className="h-6 w-6 text-zenthea-purple" />;
    }
    if (fileType.includes('audio') || fileType.includes('mp3') || fileType.includes('wav')) {
      return <FileAudio className="h-6 w-6 text-status-success" />;
    }
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-6 w-6 text-status-success" />;
    }
    if (fileType.includes('zip') || fileType.includes('rar')) {
      return <Archive className="h-6 w-6 text-status-warning" />;
    }
    
    return <File className="h-6 w-6 text-text-secondary" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab-result':
        return 'bg-status-success-bg text-status-success border border-status-success border-opacity-30';
      case 'imaging':
        return 'bg-status-info-bg text-status-info border border-status-info border-opacity-30';
      case 'document':
        return 'bg-surface-secondary text-text-primary border border-border-primary';
      case 'prescription':
        return 'bg-zenthea-purple-50 text-zenthea-purple border border-zenthea-purple border-opacity-30';
      case 'report':
        return 'bg-status-warning-bg text-status-warning border border-status-warning border-opacity-30';
      default:
        return 'bg-surface-secondary text-text-primary border-border-primary';
    }
  };

  const formatFileSize = (size: string) => {
    // In a real app, this would parse the actual file size
    return size;
  };

  const handleView = (attachment: FileAttachment) => {
    setSelectedFile(attachment);
    onView?.(attachment);
  };

  const handleDownload = (attachment: FileAttachment) => {
    onDownload?.(attachment);
    // In a real app, this would trigger the actual download
    console.log('Downloading:', attachment.name);
  };

  const handleDelete = (attachment: FileAttachment) => {
    onDelete?.(attachment);
  };

  if (attachments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No attachments</h3>
          <p className="text-muted-foreground">
            No file attachments are available for this record.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* File List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {attachment.name}
                    </h4>
                    <Badge className={getCategoryColor(attachment.category)}>
                      {attachment.category}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p><strong>Type:</strong> {attachment.type}</p>
                    <p><strong>Size:</strong> {formatFileSize(attachment.size)}</p>
                    <p><strong>Uploaded:</strong> {attachment.uploadDate}</p>
                    {attachment.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {attachment.description}
                      </p>
                    )}
                  </div>
                  
                  {showActions && (
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleView(attachment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {onDelete && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(attachment)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <div className={`fixed inset-0 bg-background-overlay flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
          <Card className={`bg-background ${isFullscreen ? 'w-full h-full' : 'max-w-4xl max-h-[80vh]'} flex flex-col`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-2">
                {getFileIcon(selectedFile.type)}
                <div>
                  <CardTitle className="text-lg">{selectedFile.name}</CardTitle>
                  <CardDescription>
                    {selectedFile.type} • {formatFileSize(selectedFile.size)} • {selectedFile.uploadDate}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4">
                {/* File Preview Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  {selectedFile.type.toLowerCase().includes('image') ? (
                    <div className="space-y-4">
                      <Image className="h-16 w-16 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Image preview would be displayed here</p>
                    </div>
                  ) : selectedFile.type.toLowerCase().includes('pdf') ? (
                    <div className="space-y-4">
                      <File className="h-16 w-16 text-status-error mx-auto" />
                      <p className="text-muted-foreground">PDF viewer would be displayed here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getFileIcon(selectedFile.type)}
                      <p className="text-muted-foreground">File preview not available for this file type</p>
                    </div>
                  )}
                </div>
                
                {/* File Actions */}
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => handleDownload(selectedFile)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
