/**
 * Manual Hero Image Override
 * 
 * Allows manual setting of hero image URL to bypass S3 eventual consistency
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple in-memory storage that persists during the session
let manualHeroImageUrl: string | null = null;

export async function GET() {
  try {
    const defaultUrl = 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg';
    
    return NextResponse.json({
      success: true,
      url: manualHeroImageUrl || defaultUrl,
      isManual: manualHeroImageUrl !== null,
      message: manualHeroImageUrl ? 'Using manually set hero image' : 'Using default hero image'
    });

  } catch (error) {
    console.error('Error getting manual hero image:', error);
    return NextResponse.json(
      { error: 'Failed to get manual hero image' },
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

    // Set the manual hero image URL
    manualHeroImageUrl = url;
    
    console.log('Manual hero image set:', url);

    return NextResponse.json({
      success: true,
      url: url,
      message: 'Manual hero image set successfully'
    });

  } catch (error) {
    console.error('Error setting manual hero image:', error);
    return NextResponse.json(
      { error: 'Failed to set manual hero image' },
      { status: 500 }
    );
  }
}
