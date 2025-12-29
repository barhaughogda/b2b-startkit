'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (avatarUrl: string) => void;
  disabled?: boolean;
}

export function AvatarUpload({ currentAvatar, onAvatarChange, disabled = false }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB for avatars)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB');
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
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onAvatarChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentAvatar || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setPreview(null);
    onAvatarChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-border-primary bg-surface-interactive flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Profile avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-16 h-16 text-text-secondary" />
          )}
        </div>
        
        {!disabled && (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-zenthea-teal text-white rounded-full flex items-center justify-center hover:bg-zenthea-teal-600 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Upload Controls */}
      {!disabled && (
        <div className="flex flex-col items-center space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleClick}
              disabled={isUploading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            
            {preview && (
              <Button
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-destructive text-destructive max-w-md">
          {error}
        </Alert>
      )}

      {/* Help Text */}
      {!disabled && (
        <p className="text-sm text-text-secondary text-center max-w-md">
          Upload a professional photo. Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.
        </p>
      )}
    </div>
  );
}
