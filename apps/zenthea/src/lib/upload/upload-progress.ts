/**
 * Upload Progress Tracking and Timeout Management
 * 
 * Handles large file uploads with progress tracking, timeout management,
 * and chunked upload support to prevent timeouts.
 */

import { logger } from '@/lib/logger';

export interface UploadProgress {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'timeout';
  startTime: number;
  lastUpdate: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface ChunkedUploadOptions {
  chunkSize: number;
  maxRetries: number;
  timeoutMs: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

export class UploadProgressManager {
  private static uploads = new Map<string, UploadProgress>();
  private static readonly DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Start tracking upload progress
   */
  static startUpload(
    id: string,
    fileName: string,
    fileSize: number,
    options: ChunkedUploadOptions = {
      chunkSize: 1024 * 1024, // 1MB default
      maxRetries: 3,
      timeoutMs: 30000
    }
  ): UploadProgress {
    const progress: UploadProgress = {
      id,
      fileName,
      fileSize,
      uploadedBytes: 0,
      percentage: 0,
      status: 'pending',
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    this.uploads.set(id, progress);
    logger.info(`Started tracking upload: ${fileName} (${fileSize} bytes)`);
    
    return progress;
  }

  /**
   * Update upload progress
   */
  static updateProgress(
    id: string,
    uploadedBytes: number,
    status?: UploadProgress['status']
  ): UploadProgress | null {
    const progress = this.uploads.get(id);
    if (!progress) {
      logger.warn(`Upload progress not found for ID: ${id}`);
      return null;
    }

    const now = Date.now();
    const timeElapsed = now - progress.startTime;
    const bytesPerSecond = uploadedBytes / (timeElapsed / 1000);
    const remainingBytes = progress.fileSize - uploadedBytes;
    const estimatedTimeRemaining = remainingBytes / bytesPerSecond;

    progress.uploadedBytes = uploadedBytes;
    progress.percentage = Math.round((uploadedBytes / progress.fileSize) * 100);
    progress.lastUpdate = now;
    progress.estimatedTimeRemaining = estimatedTimeRemaining;

    if (status) {
      progress.status = status;
    }

    // Check for timeout
    if (timeElapsed > this.DEFAULT_TIMEOUT) {
      progress.status = 'timeout';
      progress.error = 'Upload timeout exceeded';
      logger.warn(`Upload timeout for ${progress.fileName}`);
    }

    this.uploads.set(id, progress);
    return progress;
  }

  /**
   * Complete upload tracking
   */
  static completeUpload(id: string, success: boolean = true, error?: string): UploadProgress | null {
    const progress = this.uploads.get(id);
    if (!progress) return null;

    progress.status = success ? 'completed' : 'failed';
    progress.percentage = success ? 100 : progress.percentage;
    progress.lastUpdate = Date.now();
    
    if (error) {
      progress.error = error;
    }

    this.uploads.set(id, progress);
    logger.info(`Upload ${success ? 'completed' : 'failed'}: ${progress.fileName}`);
    
    return progress;
  }

  /**
   * Get current upload progress
   */
  static getProgress(id: string): UploadProgress | null {
    return this.uploads.get(id) || null;
  }

  /**
   * Clean up completed uploads older than 1 hour
   */
  static cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [id, progress] of this.uploads.entries()) {
      if (progress.lastUpdate < oneHourAgo && 
          (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'timeout')) {
        this.uploads.delete(id);
      }
    }
  }

  /**
   * Get all active uploads
   */
  static getActiveUploads(): UploadProgress[] {
    return Array.from(this.uploads.values()).filter(
      progress => progress.status === 'uploading' || progress.status === 'processing'
    );
  }
}

/**
 * Chunked Upload Handler
 * 
 * Handles large file uploads by splitting them into chunks to prevent timeouts
 */
export class ChunkedUploadHandler {
  private progress: UploadProgress;
  private options: ChunkedUploadOptions;
  private chunks: Blob[] = [];
  private currentChunk = 0;
  private retryCount = 0;

  constructor(
    progress: UploadProgress,
    options: ChunkedUploadOptions
  ) {
    this.progress = progress;
    this.options = {
      ...options,
    };
  }

  private static readonly DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Split file into chunks
   */
  static createChunks(file: File, chunkSize: number = this.DEFAULT_CHUNK_SIZE): Blob[] {
    const chunks: Blob[] = [];
    let offset = 0;

    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      chunks.push(file.slice(offset, end));
      offset = end;
    }

    return chunks;
  }

  /**
   * Upload file in chunks
   */
  async uploadChunked(
    file: File,
    uploadEndpoint: string,
    additionalData: Record<string, any> = {}
  ): Promise<{ success: boolean; error?: string; url?: string }> {
    try {
      this.chunks = ChunkedUploadHandler.createChunks(file, this.options.chunkSize);
      this.currentChunk = 0;
      this.retryCount = 0;

      UploadProgressManager.updateProgress(this.progress.id, 0, 'uploading');

      // Upload each chunk
      for (let i = 0; i < this.chunks.length; i++) {
        await this.uploadChunk(i, uploadEndpoint, additionalData);
        this.currentChunk = i + 1;
        
        const uploadedBytes = (i + 1) * this.options.chunkSize;
        UploadProgressManager.updateProgress(
          this.progress.id,
          Math.min(uploadedBytes, file.size),
          'uploading'
        );

        this.options.onChunkComplete?.(i + 1, this.chunks.length);
      }

      // Finalize upload
      const result = await this.finalizeUpload(uploadEndpoint, additionalData);
      
      if (result.success) {
        UploadProgressManager.completeUpload(this.progress.id, true);
        return result;
      } else {
        UploadProgressManager.completeUpload(this.progress.id, false, result.error);
        return result;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      UploadProgressManager.completeUpload(this.progress.id, false, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload individual chunk
   */
  private async uploadChunk(
    chunkIndex: number,
    uploadEndpoint: string,
    additionalData: Record<string, any>
  ): Promise<void> {
    const chunk = this.chunks[chunkIndex];
    const formData = new FormData();
    
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', this.chunks.length.toString());
    formData.append('fileName', this.progress.fileName);
    formData.append('fileSize', this.progress.fileSize.toString());
    formData.append('uploadId', this.progress.id);

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Chunk upload failed');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (this.retryCount < this.options.maxRetries) {
        this.retryCount++;
        logger.warn(`Chunk ${chunkIndex} failed, retrying (${this.retryCount}/${this.options.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount)); // Exponential backoff
        return this.uploadChunk(chunkIndex, uploadEndpoint, additionalData);
      } else {
        throw error;
      }
    }
  }

  /**
   * Finalize chunked upload
   */
  private async finalizeUpload(
    uploadEndpoint: string,
    additionalData: Record<string, any>
  ): Promise<{ success: boolean; error?: string; url?: string }> {
    const formData = new FormData();
    formData.append('action', 'finalize');
    formData.append('fileName', this.progress.fileName);
    formData.append('fileSize', this.progress.fileSize.toString());
    formData.append('uploadId', this.progress.id);
    formData.append('totalChunks', this.chunks.length.toString());

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Finalize upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Finalize upload failed';
      return { success: false, error: errorMessage };
    }
  }
}

// Cleanup old uploads every 5 minutes
setInterval(() => {
  UploadProgressManager.cleanup();
}, 5 * 60 * 1000);
