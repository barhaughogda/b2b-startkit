/**
 * Set Hero Image API
 * 
 * Directly sets the current hero image URL without relying on S3 listing
 * This bypasses S3 eventual consistency issues
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for the current hero image
let currentHeroImageUrl: string | null = null;
let lastUpdated: string | null = null;

export async function GET(request: NextRequest) {
  try {
    const defaultUrl = 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg';
    
    return NextResponse.json({
      success: true,
      url: currentHeroImageUrl || defaultUrl,
      found: currentHeroImageUrl !== null,
      isDefault: currentHeroImageUrl === null,
      lastUpdated: lastUpdated
    });

  } catch (error) {
    console.error('Error getting hero image:', error);
    return NextResponse.json(
      { error: 'Failed to get hero image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    if (!url.includes('/api/serve-image?key=')) {
      return NextResponse.json({ error: 'Invalid URL format. Must be a serve-image URL.' }, { status: 400 });
    }

    // Store the new hero image URL
    currentHeroImageUrl = url;
    lastUpdated = new Date().toISOString();
    
    console.log('Hero image URL set:', url);

    return NextResponse.json({
      success: true,
      url: url,
      message: 'Hero image URL updated successfully',
      lastUpdated: lastUpdated
    });

  } catch (error) {
    console.error('Error setting hero image:', error);
    return NextResponse.json(
      { error: 'Failed to set hero image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}