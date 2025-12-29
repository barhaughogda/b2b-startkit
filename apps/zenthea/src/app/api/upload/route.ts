/**
 * General Image Upload API for Testing
 * 
 * Simple upload endpoint for testing image upload functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for general uploads)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type (only allow common image formats)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Only JPEG, PNG, GIF, WebP, and AVIF are supported.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'general');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const secureFileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Save file
    const filePath = join(uploadsDir, secureFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create metadata
    const metadata = {
      originalName: file.name,
      fileName: secureFileName,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      uploadId: uuidv4()
    };

    // Save metadata
    const metadataPath = join(uploadsDir, `${secureFileName}.metadata.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    logger.info('General image uploaded successfully', 'general-upload', {
      fileName: secureFileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type
    });

    return NextResponse.json({
      success: true,
      fileName: secureFileName,
      url: `/uploads/general/${secureFileName}`,
      metadata
    });

  } catch (error) {
    logger.error('General image upload error', 'general-upload', { error });
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
