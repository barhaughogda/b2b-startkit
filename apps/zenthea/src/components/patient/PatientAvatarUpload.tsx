'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AvatarCropDialog } from './AvatarCropDialog';
import { MAX_AVATAR_SIZE, ALLOWED_AVATAR_TYPES } from '@/lib/avatar-constants';

interface PatientAvatarUploadProps {
  currentAvatar?: string;
  patientName?: string;
  onAvatarChange: (avatarUrl: string) => void;
  disabled?: boolean;
  helpText?: string;
  variant?: 'round' | 'square'; // 'round' for users/patients, 'square' for company logos
}

export function PatientAvatarUpload({ 
  currentAvatar, 
  patientName,
  onAvatarChange, 
  disabled = false,
  helpText = 'Upload a professional photo. Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.',
  variant = 'round' // Default to round for user avatars
}: PatientAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [error, setError] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFailedRef = useRef<boolean>(false);
  const lastUploadedUrlRef = useRef<string | null>(null);
  const isUploadingRef = useRef<boolean>(false);

  // Keep ref in sync with state
  useEffect(() => {
    isUploadingRef.current = isUploading;
  }, [isUploading]);

  // Sync preview state when currentAvatar prop changes (e.g., after parent re-fetches data)
  // Only sync if not currently uploading and if preview doesn't already match currentAvatar
  useEffect(() => {
    // Skip sync if we're currently uploading (use ref to avoid stale closure)
    if (isUploadingRef.current) {
      return;
    }
    
    // Skip sync if currentAvatar matches the URL we just uploaded (prevents overwriting new upload)
    // This prevents the useEffect from overwriting the preview immediately after upload completes
    if (lastUploadedUrlRef.current && currentAvatar === lastUploadedUrlRef.current) {
      // Clear the ref to allow future syncs once parent has updated
      lastUploadedUrlRef.current = null;
      return;
    }
    
    // Only sync if preview doesn't already match currentAvatar (avoid unnecessary updates)
    // Use functional update to get latest preview value without including it in dependencies
    setPreview((currentPreview) => {
      if (currentPreview !== currentAvatar) {
        return currentAvatar || null;
      }
      return currentPreview;
    });
  }, [currentAvatar]); // Only depend on currentAvatar to sync when parent updates

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type as typeof ALLOWED_AVATAR_TYPES[number])) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB for avatars)
    if (file.size > MAX_AVATAR_SIZE) {
      setError(`Image size must be less than ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Read file and show crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setImageToCrop(imageSrc);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    // Reset upload failure flag
    uploadFailedRef.current = false;

    // Create preview from cropped blob
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    setPreview(previewUrl);

    // Upload cropped file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedImageBlob, 'avatar.jpg');
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Use the standardized error message format (message field preferred, fallback to error)
        const errorMessage = errorData.message || errorData.error || 'Upload failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Track the uploaded URL to prevent useEffect from overwriting it
      lastUploadedUrlRef.current = data.url;
      onAvatarChange(data.url);
      // Set preview to uploaded URL after successful upload
      setPreview(data.url);
      
      // Clean up the blob URL
      URL.revokeObjectURL(previewUrl);
    } catch (err) {
      // Mark upload as failed to prevent FileReader callback from setting preview
      uploadFailedRef.current = true;
      setError(err instanceof Error ? err.message : 'Upload failed');
      // Revert preview to current avatar on error
      setPreview(currentAvatar || null);
    } finally {
      setIsUploading(false);
      setShowCropDialog(false);
      setImageToCrop(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar className={`w-32 h-32 border-4 border-border-primary ${variant === 'square' ? '!rounded-lg' : ''}`}>
          <AvatarImage 
            src={preview || undefined} 
            alt="Profile avatar" 
            className={variant === 'square' ? '!rounded-lg' : ''} 
          />
          <AvatarFallback className={`bg-zenthea-teal text-white text-2xl ${variant === 'square' ? '!rounded-lg' : ''}`}>
            {getInitials(patientName)}
          </AvatarFallback>
        </Avatar>
        
        {!disabled && (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-zenthea-teal text-white rounded-full flex items-center justify-center hover:bg-zenthea-teal-600 transition-colors disabled:opacity-50 shadow-lg"
            aria-label="Upload profile photo"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* File Input */}
      {!disabled && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select profile photo"
        />
      )}

      {/* Remove Button */}
      {!disabled && preview && (
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

      {/* Error Message */}
      {error && (
        <Alert className="border-destructive text-destructive max-w-md">
          {error}
        </Alert>
      )}

      {/* Help Text */}
      {!disabled && (
        <p className="text-sm text-text-secondary text-center max-w-md">
          {helpText}
        </p>
      )}

      {/* Crop Dialog */}
      {imageToCrop && (
        <AvatarCropDialog
          imageSrc={imageToCrop}
          open={showCropDialog}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

