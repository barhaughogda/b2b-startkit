/**
 * Get Current Hero Image API
 * 
 * Returns the current hero image URL from page.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { HeroImageStorage } from '@/lib/hero-image-storage';

export async function GET() {
  try {
    const url = HeroImageStorage.getCurrentUrl();
    const storageInfo = HeroImageStorage.getStorageInfo();
    
    return NextResponse.json({
      success: true,
      url: url,
      found: storageInfo.exists,
      isDefault: !storageInfo.exists,
      updatedAt: storageInfo.updatedAt
    });

  } catch (error) {
    console.error('Error reading current hero image:', error);
    return NextResponse.json(
      { error: 'Failed to read current hero image', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Store the new hero image URL
    const success = HeroImageStorage.setCurrentUrl(url);
    
    if (success) {
      return NextResponse.json({
        success: true,
        url: url,
        message: 'Hero image URL updated'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to store hero image URL' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error setting hero image:', error);
    return NextResponse.json(
      { error: 'Failed to set hero image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
