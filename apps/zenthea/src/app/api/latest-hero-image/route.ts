/**
 * Latest Hero Image API
 * 
 * Returns the most recent hero image from S3
 * This works by checking the S3 bucket for the latest hero image
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.debug('AWS credentials not configured, returning default hero image');
      // Return 200 with default image instead of 500 to avoid error notifications
      return NextResponse.json({
        success: true,
        url: 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg',
        found: false,
        isDefault: true,
        reason: 'AWS credentials not configured'
      });
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const bucketName = process.env.AWS_S3_BUCKET || 'zenthea-images-prod';
    console.log('Searching for hero images in bucket:', bucketName);

        // List objects in the hero images folder
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: 'images/hero/',
          MaxKeys: 100 // Increased significantly to ensure we get all images
        });

    const response = await s3Client.send(command);
    
    console.log('S3 response:', {
      contentsCount: response.Contents?.length || 0,
      bucket: bucketName,
      prefix: 'images/hero/'
    });
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('No hero images found in S3');
      // No hero images found, return default
      return NextResponse.json({
        success: true,
        url: 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg',
        found: false,
        isDefault: true,
        debug: {
          bucket: bucketName,
          prefix: 'images/hero/',
          contentsCount: 0
        }
      });
    }

    // Log all found objects for debugging
    console.log('Found hero images:', response.Contents.map(obj => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size
    })));

    // Sort by LastModified to get the most recent
    const sortedObjects = response.Contents.sort((a, b) => 
      (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    );

    const latestObject = sortedObjects[0];
    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.zenthea.ai';
    const latestUrl = `${baseUrl}/api/serve-image?key=${encodeURIComponent(latestObject.Key!)}`;

    console.log('Latest hero image found:', {
      key: latestObject.Key,
      lastModified: latestObject.LastModified,
      url: latestUrl
    });

    return NextResponse.json({
      success: true,
      url: latestUrl,
      found: true,
      isDefault: false,
      key: latestObject.Key,
      lastModified: latestObject.LastModified,
      debug: {
        bucket: bucketName,
        totalObjects: response.Contents.length,
        allObjects: response.Contents.map(obj => ({
          key: obj.Key,
          lastModified: obj.LastModified,
          size: obj.Size
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching latest hero image:', error);
    // Return 200 with default image instead of 500 to avoid error notifications
    return NextResponse.json({
      success: true,
      url: 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg',
      found: false,
      isDefault: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
