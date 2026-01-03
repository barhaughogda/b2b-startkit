'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Aspect ratio for the upload preview area */
  aspectRatio?: 'landscape' | 'square' | 'portrait' | 'portrait-9-16';
  maxSize?: number; // in MB
  className?: string;
  imageType?: 'hero' | 'block' | 'general' | 'logo';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  aspectRatio = 'landscape',
  maxSize = 10,
  className,
  imageType = 'general',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when value changes externally
  React.useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const aspectRatioClasses = {
    landscape: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    'portrait-9-16': 'aspect-[9/16]',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Image must be less than ${maxSize}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('imageType', imageType);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please check if the upload service is available.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      // Use secureUrl if available, otherwise fall back to url
      const imageUrl = data.secureUrl || data.url || data.publicId;
      onChange(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(value || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = useCallback(() => {
    setPreview(null);
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

  return (
    <div className={cn('space-y-2', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="sr-only"
        disabled={disabled || isUploading}
      />

      {/* Image Preview / Upload Area */}
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        onClick={triggerFileSelect}
        onKeyDown={(e) => {
          if (!disabled && !isUploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            triggerFileSelect();
          }
        }}
        aria-disabled={disabled || isUploading}
        aria-label="Upload image"
        className={cn(
          'relative w-full border-2 border-dashed rounded-lg overflow-hidden transition-colors cursor-pointer',
          aspectRatioClasses[aspectRatio],
          preview
            ? 'border-border-primary bg-surface-primary'
            : 'border-border-secondary bg-surface-secondary hover:border-border-focus hover:bg-surface-interactive',
          (disabled || isUploading) && 'cursor-not-allowed opacity-50',
          isUploading && 'cursor-wait'
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Background preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay with remove button */}
            {!disabled && !isUploading && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="flex items-center gap-2"
                  type="button"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Click to upload image</span>
                <span className="text-xs mt-1">
                  JPEG, PNG, GIF, WebP • Max {maxSize}MB
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-status-error">{error}</p>
      )}

      {/* Action buttons when image is present */}
      {preview && !disabled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileSelect}
            disabled={isUploading}
            className="flex-1"
            type="button"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Replace'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isUploading}
            className="text-status-error hover:text-status-error"
            type="button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
