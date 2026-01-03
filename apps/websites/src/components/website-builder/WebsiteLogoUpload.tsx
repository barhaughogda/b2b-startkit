'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogoCropDialog } from './LogoCropDialog';
import { createImagePreviewUrl } from '@/lib/images/crop-image';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface WebsiteLogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// =============================================================================
// COMPONENT
// =============================================================================

export function WebsiteLogoUpload({
  value,
  onChange,
  disabled = false,
  className,
}: WebsiteLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError('');

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('Image must be less than 10MB');
        return;
      }

      // Create preview URL and open crop dialog
      const previewUrl = createImagePreviewUrl(file);
      setSelectedImageSrc(previewUrl);
      setCropDialogOpen(true);

      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setIsUploading(true);
      setError('');

      try {
        // Create FormData with the cropped blob
        const formData = new FormData();
        formData.append('file', croppedBlob, 'website-logo.png');
        formData.append('imageType', 'logo');

        // Upload to Cloudinary via our API
        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        });

        // Handle non-JSON responses (like 404 HTML pages)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          logger.error('Non-JSON response from upload API:', text.slice(0, 200));
          throw new Error('Server returned an invalid response. Please check if the upload service is available.');
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Upload failed');
        }

        const data = await response.json();
        const imageUrl = data.secureUrl || data.url || data.publicId;
        onChange(imageUrl);
      } catch (err) {
        logger.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        // Clean up the preview URL
        if (selectedImageSrc) {
          URL.revokeObjectURL(selectedImageSrc);
          setSelectedImageSrc('');
        }
      }
    },
    [onChange, selectedImageSrc]
  );

  const handleRemove = useCallback(() => {
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const triggerFileSelect = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  // Cleanup preview URL on dialog close
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setCropDialogOpen(open);
      if (!open && selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc('');
      }
    },
    [selectedImageSrc]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="sr-only"
        disabled={disabled || isUploading}
      />

      {/* Logo Preview / Upload Area */}
      {value ? (
        <div className="space-y-3">
          {/* Preview */}
          <div
            className="relative w-full h-24 bg-surface-secondary rounded-lg border-2 border-border-primary overflow-hidden flex items-center justify-center"
            style={{ aspectRatio: '4 / 1' }}
          >
            <img
              src={value}
              alt="Website logo preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerFileSelect}
              disabled={isUploading || disabled}
              className="flex-1"
              type="button"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Replace
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading || disabled}
              className="text-status-error hover:text-status-error"
              type="button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
          className={cn(
            'w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors',
            'border-border-secondary bg-surface-secondary hover:border-border-focus hover:bg-surface-interactive',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50'
          )}
          style={{ aspectRatio: '4 / 1' }}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
              <span className="text-sm text-text-tertiary">Uploading...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-text-tertiary" />
              <span className="text-sm text-text-tertiary font-medium">
                Click to upload logo
              </span>
              <span className="text-xs text-text-tertiary">
                4:1 aspect ratio • Max 10MB
              </span>
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-status-error">{error}</p>}

      {/* Crop Dialog */}
      <LogoCropDialog
        open={cropDialogOpen}
        onOpenChange={handleDialogOpenChange}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

export default WebsiteLogoUpload;

