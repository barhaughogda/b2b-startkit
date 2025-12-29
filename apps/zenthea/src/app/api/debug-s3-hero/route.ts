/**
 * Debug S3 Hero Images
 * 
 * Lists all hero images in S3 for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // List objects in the hero images folder
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET || 'zenthea-images-prod',
      Prefix: 'images/hero/',
      MaxKeys: 20
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hero images found',
        objects: []
      });
    }

    // Sort by LastModified to get the most recent
    const sortedObjects = response.Contents.sort((a, b) => 
      (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    );

    return NextResponse.json({
      success: true,
      totalObjects: response.Contents.length,
      objects: sortedObjects.map(obj => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        isLatest: sortedObjects.indexOf(obj) === 0
      }))
    });

  } catch (error) {
    console.error('Error listing S3 hero images:', error);
    return NextResponse.json(
      { error: 'Failed to list hero images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
