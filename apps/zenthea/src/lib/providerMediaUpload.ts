/**
 * Provider Media Upload Utilities
 * 
 * Client-side utilities for uploading provider profile media (photos, videos)
 * with progress tracking and error handling
 */

export interface MediaUploadOptions {
  file: File;
  mediaType: 'photo' | 'video';
  altText?: string;
  onProgress?: (progress: number) => void;
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  status?: 'pending-approval' | 'approved' | 'rejected';
}

/**
 * Upload provider profile media (photo or video)
 */
export async function uploadProviderMedia(
  options: MediaUploadOptions
): Promise<MediaUploadResult> {
  const { file, mediaType, altText, onProgress } = options;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    if (altText) {
      formData.append('altText', altText);
    }

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              url: response.url,
              key: response.key,
              status: response.status
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse response'
            });
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            resolve({
              success: false,
              error: error.error || 'Upload failed'
            });
          } catch {
            resolve({
              success: false,
              error: `Upload failed with status ${xhr.status}`
            });
          }
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error during upload'
        });
      });

      xhr.open('POST', '/api/provider/profile/media/upload');
      xhr.send(formData);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only MP4, WebM, and QuickTime videos are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 100MB.'
    };
  }

  return { valid: true };
}

