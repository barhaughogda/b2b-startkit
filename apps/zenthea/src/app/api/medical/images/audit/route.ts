/**
 * HIPAA-Compliant Medical Image Audit API
 * 
 * Handles audit logging and retrieval for medical image access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['physician', 'nurse', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Audit access required' },
        { status: 401 }
      );
    }

    const auditData = await request.json();
    
    // Validate required fields
    const requiredFields = ['imageId', 'action', 'userId', 'timestamp', 'ipAddress', 'userAgent'];
    for (const field of requiredFields) {
      if (!auditData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate audit ID
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Create audit entry
    const auditEntry = {
      auditId,
      ...auditData,
      loggedAt: new Date().toISOString(),
      loggedBy: session.user.id
    };

    // Save audit log
    const auditDir = join(process.cwd(), 'public', 'uploads', 'medical', 'audit');
    if (!existsSync(auditDir)) {
      const { mkdir } = await import('fs/promises');
      await mkdir(auditDir, { recursive: true });
    }
    
    const auditPath = join(auditDir, `${auditData.imageId}_${auditData.action}_${Date.now()}.json`);
    const { writeFile } = await import('fs/promises');
    await writeFile(auditPath, JSON.stringify(auditEntry, null, 2));

    return NextResponse.json({
      success: true,
      auditId,
      message: 'Audit entry logged successfully'
    });

  } catch (error) {
    console.error('Audit logging error:', error);
    return NextResponse.json(
      { error: 'Internal server error logging audit entry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'physician'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required for audit retrieval' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const patientId = searchParams.get('patientId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build audit query
    const auditDir = join(process.cwd(), 'public', 'uploads', 'medical', 'audit');
    if (!existsSync(auditDir)) {
      return NextResponse.json({
        success: true,
        audits: [],
        total: 0,
        message: 'No audit logs found'
      });
    }

    // Get all audit files
    const auditFiles = await readdir(auditDir);
    const audits = [];

    for (const file of auditFiles.slice(0, limit)) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const auditPath = join(auditDir, file);
        const auditContent = await readFile(auditPath, 'utf-8');
        const audit = JSON.parse(auditContent);

        // Apply filters
        if (imageId && audit.imageId !== imageId) continue;
        if (patientId && audit.details?.patientId !== patientId) continue;
        if (action && audit.action !== action) continue;
        if (startDate && new Date(audit.timestamp) < new Date(startDate)) continue;
        if (endDate && new Date(audit.timestamp) > new Date(endDate)) continue;

        audits.push(audit);
      } catch (error) {
        console.error(`Error reading audit file ${file}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    audits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      audits,
      total: audits.length,
      filters: {
        imageId,
        patientId,
        action,
        startDate,
        endDate,
        limit
      }
    });

  } catch (error) {
    console.error('Audit retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error retrieving audit logs' },
      { status: 500 }
    );
  }
}
