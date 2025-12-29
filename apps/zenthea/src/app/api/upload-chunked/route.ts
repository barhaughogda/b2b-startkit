/**
 * Chunked Upload API
 * 
 * Handles large file uploads by processing them in chunks to prevent timeouts.
 * Supports resumable uploads and progress tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { UploadProgressManager } from '@/lib/upload/upload-progress';
import { ImageOptimizer } from '@/lib/images/image-optimizer';
import { CDNPerformanceManager } from '@/lib/cdn/performance-headers';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const mkdirAsync = promisify(mkdir);

interface ChunkedUploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  chunks: { [chunkIndex: number]: Buffer };
  startTime: number;
  lastActivity: number;
  metadata?: any;
}

// In-memory storage for upload sessions (in production, use Redis or database)
const uploadSessions = new Map<string, ChunkedUploadSession>();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    if (action === 'finalize') {
      return await handleFinalizeUpload(formData, request);
    } else {
      return await handleChunkUpload(formData, request);
    }

  } catch (error) {
    logger.error('Chunked upload error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        success: false, 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    logger.info(`Chunked upload operation completed in ${duration}ms`);
  }
}

/**
 * Handle individual chunk upload
 */
async function handleChunkUpload(
  formData: FormData,
  request: NextRequest
): Promise<NextResponse> {
  const chunk = formData.get('chunk') as File;
  const chunkIndex = parseInt(formData.get('chunkIndex') as string);
  const totalChunks = parseInt(formData.get('totalChunks') as string);
  const fileName = formData.get('fileName') as string;
  const fileSize = parseInt(formData.get('fileSize') as string);
  const uploadId = formData.get('uploadId') as string;
  const imageType = formData.get('imageType') as string || 'hero';
  const useCase = formData.get('useCase') as string || 'hero';

  if (!chunk || chunkIndex === undefined || !totalChunks || !fileName || !uploadId) {
    return NextResponse.json(
      { success: false, error: 'Missing required chunk data' },
      { status: 400 }
    );
  }

  try {
    // Get or create upload session
    let session = uploadSessions.get(uploadId);
    if (!session) {
      session = {
        uploadId,
        fileName,
        fileSize,
        totalChunks,
        receivedChunks: new Set(),
        chunks: {},
        startTime: Date.now(),
        lastActivity: Date.now(),
        metadata: { imageType, useCase }
      };
      uploadSessions.set(uploadId, session);

      // Start progress tracking
      UploadProgressManager.startUpload(uploadId, fileName, fileSize);
    }

    // Validate chunk
    if (chunkIndex >= totalChunks || chunkIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunk index' },
        { status: 400 }
      );
    }

    // Store chunk
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    session.chunks[chunkIndex] = chunkBuffer;
    session.receivedChunks.add(chunkIndex);
    session.lastActivity = Date.now();

    // Update progress
    const uploadedBytes = session.receivedChunks.size * chunkBuffer.length;
    UploadProgressManager.updateProgress(uploadId, uploadedBytes, 'uploading');

    logger.info(`Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${chunkBuffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      chunkIndex,
      receivedChunks: session.receivedChunks.size,
      totalChunks: session.totalChunks,
      progress: Math.round((session.receivedChunks.size / session.totalChunks) * 100)
    });

  } catch (error) {
    logger.error(`Chunk upload failed for ${fileName}:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, error: 'Chunk upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle upload finalization
 */
async function handleFinalizeUpload(
  formData: FormData,
  request: NextRequest
): Promise<NextResponse> {
  const uploadId = formData.get('uploadId') as string;
  const fileName = formData.get('fileName') as string;
  const fileSize = parseInt(formData.get('fileSize') as string);
  const totalChunks = parseInt(formData.get('totalChunks') as string);

  if (!uploadId || !fileName) {
    return NextResponse.json(
      { success: false, error: 'Missing upload ID or filename' },
      { status: 400 }
    );
  }

  const session = uploadSessions.get(uploadId);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Upload session not found' },
      { status: 404 }
    );
  }

  try {
    // Validate all chunks received
    if (session.receivedChunks.size !== session.totalChunks) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing chunks. Received ${session.receivedChunks.size}/${session.totalChunks}` 
        },
        { status: 400 }
      );
    }

    // Reassemble file
    const fileBuffer = await reassembleFile(session);
    
    // Validate file size
    if (fileBuffer.length !== fileSize) {
      return NextResponse.json(
        { success: false, error: 'File size mismatch' },
        { status: 400 }
      );
    }

    // Process and optimize image
    const result = await processAndOptimizeImage(fileBuffer, fileName, session.metadata);
    
    // Clean up session
    uploadSessions.delete(uploadId);
    
    // Complete progress tracking
    UploadProgressManager.completeUpload(uploadId, true);

    return NextResponse.json({
      success: true,
      url: result.url,
      optimizedSize: result.optimizedSize,
      compressionRatio: result.compressionRatio,
      metadata: result.metadata
    });

  } catch (error) {
    logger.error(`Upload finalization failed for ${fileName}:`, error instanceof Error ? error.message : String(error));
    UploadProgressManager.completeUpload(uploadId, false, error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { success: false, error: 'Upload finalization failed' },
      { status: 500 }
    );
  }
}

/**
 * Reassemble file from chunks
 */
async function reassembleFile(session: ChunkedUploadSession): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  for (let i = 0; i < session.totalChunks; i++) {
    const chunk = session.chunks[i];
    if (!chunk) {
      throw new Error(`Missing chunk ${i}`);
    }
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Process and optimize uploaded image
 */
async function processAndOptimizeImage(
  buffer: Buffer,
  fileName: string,
  metadata: any
): Promise<{
  url: string;
  optimizedSize: number;
  compressionRatio: number;
  metadata: any;
}> {
  try {
    // Validate image
    const validation = await ImageOptimizer.validateImage(buffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimize image
    const useCase = metadata.useCase || 'hero';
    const optimization = await ImageOptimizer.optimizeForUseCase(buffer, useCase);
    
    // Create uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'chunked');
    if (!existsSync(uploadsDir)) {
      await mkdirAsync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = optimization.format;
    const secureFileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Save optimized file
    const filePath = join(uploadsDir, secureFileName);
    await writeFileAsync(filePath, optimization.optimizedBuffer);

    // Generate URL
    const url = `/uploads/chunked/${secureFileName}`;
    
    logger.info(`Chunked upload completed: ${fileName} → ${secureFileName} (${optimization.compressionRatio.toFixed(1)}% compression)`);

    return {
      url,
      optimizedSize: optimization.optimizedSize,
      compressionRatio: optimization.compressionRatio,
      metadata: {
        originalSize: optimization.originalSize,
        format: optimization.format,
        dimensions: optimization.dimensions,
        fileName: secureFileName
      }
    };

  } catch (error) {
    logger.error('Image processing failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Clean up expired upload sessions
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours
  
  for (const [uploadId, session] of uploadSessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      uploadSessions.delete(uploadId);
      logger.info(`Cleaned up expired upload session: ${uploadId}`);
    }
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes

/**
 * Get upload progress
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');
  
  if (!uploadId) {
    return NextResponse.json(
      { error: 'Upload ID required' },
      { status: 400 }
    );
  }

  const progress = UploadProgressManager.getProgress(uploadId);
  if (!progress) {
    return NextResponse.json(
      { error: 'Upload not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(progress);
}
