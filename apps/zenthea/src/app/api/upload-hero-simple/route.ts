/**
 * Simplified Hero Image Upload API
 * 
 * Bypasses complex security for public hero image uploads
 * Used for landing page hero image management
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Simple in-memory rate limiting
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 uploads per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(ip);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    uploadAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  
  if (userAttempts.count >= RATE_LIMIT) {
    return false;
  }
  
  userAttempts.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB for hero images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `images/hero/${fileName}`;

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Upload to S3
    console.log('Attempting S3 upload...', { bucket: process.env.AWS_S3_BUCKET, key });
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        type: 'hero-image'
      },
      CacheControl: 'public, max-age=31536000', // 1 year
    });

    const result = await s3Client.send(command);

    // Generate serving URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.zenthea.ai';
    const servingUrl = `${baseUrl}/api/serve-image?key=${encodeURIComponent(key)}`;

    // Set the new hero image immediately to bypass S3 eventual consistency
    try {
      const setHeroResponse = await fetch(`${baseUrl}/api/set-hero-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: servingUrl })
      });
      
      if (setHeroResponse.ok) {
        console.log('Hero image set successfully:', servingUrl);
      } else {
        console.warn('Failed to set hero image, but upload succeeded');
      }
    } catch (setError) {
      console.warn('Error setting hero image:', setError);
      // Don't fail the upload if hero image setting fails
    }

    return NextResponse.json({
      success: true,
      url: servingUrl,
      key: key,
      bucket: process.env.AWS_S3_BUCKET,
      originalName: file.name,
      size: file.size
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
