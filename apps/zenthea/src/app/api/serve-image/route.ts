/**
 * Image Serving API
 * 
 * Serves images from S3 with proper caching and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Image key is required' }, { status: 400 });
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
      return NextResponse.json(
        { error: 'AWS credentials or S3 bucket not configured' },
        { status: 500 }
      );
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Get object from S3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const result = await s3Client.send(command);
    
    if (!result.Body) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Get content type from S3 metadata or infer from key
    const contentType = result.ContentType || getContentTypeFromKey(key);
    
    // Simple approach: convert to array buffer first, then to buffer
    let buffer: Buffer;
    
    try {
      // Try the most common method first
      if (result.Body && typeof result.Body === 'object' && 'transformToByteArray' in result.Body) {
        const byteArray = await (result.Body as any).transformToByteArray();
        buffer = Buffer.from(byteArray);
      } else {
        // Fallback: try to read as stream
        const chunks: Uint8Array[] = [];
        const stream = result.Body as any;
        
        if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
        } else {
          throw new Error('Unable to process S3 response body');
        }
      }
    } catch (error) {
      console.error('Error processing S3 body:', error);
      return NextResponse.json(
        { error: 'Failed to process image data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Return image with proper headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
        'Content-Length': buffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to serve image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getContentTypeFromKey(key: string): string {
  const ext = key.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}