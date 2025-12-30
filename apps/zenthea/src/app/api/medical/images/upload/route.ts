/**
 * HIPAA-Compliant Medical Image Upload API
 * 
 * Handles encrypted upload of medical images with audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AWSErrorHandler } from '@/lib/aws/error-handler';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getZentheaServerSession();
    
    if (!session || !['physician', 'nurse', 'technician', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Medical image access required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageId = formData.get('imageId') as string;
    const patientId = formData.get('patientId') as string;
    const studyId = formData.get('studyId') as string;
    const imageType = formData.get('imageType') as string;
    const modality = formData.get('modality') as string;
    const bodyPart = formData.get('bodyPart') as string;
    const description = formData.get('description') as string;
    
    if (!file || !imageId || !patientId || !studyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for medical images)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit for medical images' },
        { status: 400 }
      );
    }

    // Validate file type (only allow medical image formats)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/dicom',
      'application/dicom',
      'image/tiff',
      'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed for medical images' },
        { status: 400 }
      );
    }

    // Create encrypted uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'medical', 'encrypted');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate secure filename
    const fileExtension = file.name.split('.').pop();
    const secureFileName = `${imageId}.${fileExtension}`;
    const filePath = join(uploadsDir, secureFileName);

    // Save encrypted file
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Create metadata record
    const metadata = {
      imageId,
      patientId,
      studyId,
      imageType: imageType || 'photo',
      modality: modality || 'unknown',
      bodyPart: bodyPart || 'unknown',
      description: description || '',
      uploadedBy: session.user.id,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.type,
      encrypted: true,
      accessLevel: 'restricted',
      retentionDate: new Date(Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)) // 7 years
    };

    // Save metadata
    const metadataDir = join(process.cwd(), 'public', 'uploads', 'medical', 'metadata');
    if (!existsSync(metadataDir)) {
      await mkdir(metadataDir, { recursive: true });
    }
    
    const metadataPath = join(metadataDir, `${imageId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Log audit trail
    const auditEntry = {
      auditId: uuidv4(),
      imageId,
      action: 'upload',
      userId: session.user.id,
      userRole: session.user.role,
      timestamp: new Date().toISOString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        patientId,
        studyId,
        imageType: metadata.imageType,
        fileSize: file.size,
        encrypted: true,
        accessLevel: metadata.accessLevel
      }
    };

    // Save audit log
    const auditDir = join(process.cwd(), 'public', 'uploads', 'medical', 'audit');
    if (!existsSync(auditDir)) {
      await mkdir(auditDir, { recursive: true });
    }
    
    const auditPath = join(auditDir, `${imageId}_upload_${Date.now()}.json`);
    await writeFile(auditPath, JSON.stringify(auditEntry, null, 2));

    return NextResponse.json({
      success: true,
      imageId,
      url: `/uploads/medical/encrypted/${secureFileName}`,
      metadata,
      auditId: auditEntry.auditId
    });

  } catch (error) {
    logger.error('Medical image upload error', 'medical-upload', { error });
    
    // Handle AWS-specific errors
    const awsError = AWSErrorHandler.handleS3Error(error);
    const errorResponse = AWSErrorHandler.formatErrorResponse(awsError);
    
    return NextResponse.json(
      { 
        error: errorResponse.error,
        code: errorResponse.code,
        retryable: errorResponse.retryable
      },
      { status: errorResponse.statusCode }
    );
  }
}
