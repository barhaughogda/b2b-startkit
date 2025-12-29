/**
 * HIPAA-Compliant Medical Image Access API
 * 
 * Handles secure access to medical images with audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = params;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const studyId = searchParams.get('studyId');
    const accessType = searchParams.get('accessType') || 'view';

    // Validate access permissions
    if (!patientId || !studyId) {
      return NextResponse.json(
        { error: 'Patient ID and Study ID are required' },
        { status: 400 }
      );
    }

    // Check if user has access to this patient's data
    const hasAccess = await validatePatientAccess(session.user.id, patientId, session.user.role);
    if (!hasAccess) {
      // Log access denied
      await logAuditEntry({
        imageId,
        action: 'access_denied',
        userId: session.user.id,
        userRole: session.user.role,
        patientId,
        timestamp: new Date().toISOString(),
        details: JSON.stringify({
          studyId,
          accessType,
          reason: 'Insufficient permissions',
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        })
      });

      return NextResponse.json(
        { error: 'Access denied to medical image' },
        { status: 403 }
      );
    }

    // Load image metadata
    const metadataPath = join(process.cwd(), 'public', 'uploads', 'medical', 'metadata', `${imageId}.json`);
    if (!existsSync(metadataPath)) {
      return NextResponse.json(
        { error: 'Medical image not found' },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

    // Validate metadata matches request
    if (metadata.patientId !== patientId || metadata.studyId !== studyId) {
      return NextResponse.json(
        { error: 'Image metadata mismatch' },
        { status: 400 }
      );
    }

    // Log successful access
    const auditId = await logAuditEntry({
      imageId,
      action: accessType,
      userId: session.user.id,
      userRole: session.user.role,
      patientId,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        studyId,
        accessType,
        imageType: metadata.imageType,
        modality: metadata.modality,
        bodyPart: metadata.bodyPart,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    });

    // Return image data with security headers
    const imagePath = join(process.cwd(), 'public', 'uploads', 'medical', 'encrypted', `${imageId}.${metadata.mimeType.split('/')[1]}`);
    
    if (!existsSync(imagePath)) {
      return NextResponse.json(
        { error: 'Medical image file not found' },
        { status: 404 }
      );
    }

    const imageBuffer = await readFile(imagePath);
    
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': metadata.mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'X-Medical-Image-ID': imageId,
        'X-Patient-ID': patientId,
        'X-Study-ID': studyId,
        'X-Audit-ID': auditId,
        'X-Encrypted': 'true',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });

  } catch (error) {
    console.error('Medical image access error:', error);
    return NextResponse.json(
      { error: 'Internal server error accessing medical image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['physician', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Delete permissions required' },
        { status: 401 }
      );
    }

    const { imageId } = params;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const reason = searchParams.get('reason') || 'No reason provided';

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required for deletion' },
        { status: 400 }
      );
    }

    // Load metadata to validate ownership
    const metadataPath = join(process.cwd(), 'public', 'uploads', 'medical', 'metadata', `${imageId}.json`);
    if (!existsSync(metadataPath)) {
      return NextResponse.json(
        { error: 'Medical image not found' },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

    // Validate patient access
    if (metadata.patientId !== patientId) {
      return NextResponse.json(
        { error: 'Image does not belong to specified patient' },
        { status: 400 }
      );
    }

    // Delete files
    const imagePath = join(process.cwd(), 'public', 'uploads', 'medical', 'encrypted', `${imageId}.${metadata.mimeType.split('/')[1]}`);
    
    // Remove image file
    if (existsSync(imagePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(imagePath);
    }

    // Remove metadata file
    const { unlink } = await import('fs/promises');
    await unlink(metadataPath);

    // Log deletion
    const auditId = await logAuditEntry({
      imageId,
      action: 'delete',
      userId: session.user.id,
      userRole: session.user.role,
      patientId,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({
        reason,
        deleted: true,
        originalFileSize: metadata.fileSize,
        imageType: metadata.imageType,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    });

    return NextResponse.json({
      success: true,
      auditId,
      message: 'Medical image deleted successfully'
    });

  } catch (error) {
    console.error('Medical image deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error deleting medical image' },
      { status: 500 }
    );
  }
}

// Helper functions

async function validatePatientAccess(userId: string, patientId: string, userRole: string): Promise<boolean> {
  // In production, this would check against a database
  // For now, we'll implement basic role-based access
  
  const rolePermissions = {
    'admin': ['all'],
    'physician': ['all'],
    'nurse': ['view', 'upload'],
    'technician': ['view', 'upload'],
    'patient': ['own_only']
  };

  const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
  
  // Admin and physician have full access
  if (permissions.includes('all')) {
    return true;
  }
  
  // Patients can only access their own data
  if (userRole === 'patient') {
    return userId === patientId;
  }
  
  // Nurses and technicians have limited access
  return permissions.length > 0;
}

interface AuditEntry {
  action: string;
  userId: string;
  userRole: string;
  patientId: string;
  imageId: string;
  timestamp: string;
  details?: string;
}

async function logAuditEntry(audit: AuditEntry): Promise<string> {
  const auditId = uuidv4();
  
  const auditDir = join(process.cwd(), 'public', 'uploads', 'medical', 'audit');
  if (!existsSync(auditDir)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(auditDir, { recursive: true });
  }
  
  const auditPath = join(auditDir, `${audit.imageId}_${audit.action}_${Date.now()}.json`);
  const { writeFile } = await import('fs/promises');
  await writeFile(auditPath, JSON.stringify({ ...audit, auditId }, null, 2));
  
  return auditId;
}
