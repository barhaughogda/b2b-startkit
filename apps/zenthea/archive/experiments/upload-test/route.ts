/**
 * Minimal Upload Test API
 * 
 * Bypasses ALL security checks to isolate the issue
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD TEST START ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check environment variables
    console.log('Environment check:');
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
    console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET || 'NOT SET');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    if (!file) {
      console.log('ERROR: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Just return success without actually uploading
    console.log('=== UPLOAD TEST SUCCESS ===');
    return NextResponse.json({
      success: true,
      message: 'Test upload successful (no actual upload)',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      environment: {
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        AWS_REGION: process.env.AWS_REGION || 'NOT SET',
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET'
      }
    });

  } catch (error) {
    console.log('=== UPLOAD TEST ERROR ===');
    console.error('Upload test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        AWS_REGION: process.env.AWS_REGION || 'NOT SET',
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET'
      }
    }, { status: 500 });
  }
}
