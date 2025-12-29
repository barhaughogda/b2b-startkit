/**
 * Manual Logo Override
 * 
 * Stores S3 logo URL reference for persistence across server instances
 * Uses environment variable for production persistence
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple in-memory storage that persists during the session
let manualLogoUrl: string | null = null;

async function getManualLogoUrl(): Promise<string | null> {
  // Check environment variable first (for production persistence)
  if (process.env.MANUAL_LOGO_URL) {
    return process.env.MANUAL_LOGO_URL;
  }
  
  // Fallback to in-memory storage
  return manualLogoUrl;
}

async function setManualLogoUrl(url: string): Promise<void> {
  // Store in memory
  manualLogoUrl = url;
  console.log('Logo URL stored in memory:', url);
  
  // Note: In production, you would typically update this via your deployment
  // system or database. For now, we'll use in-memory storage which works
  // within the same server instance.
}

export async function GET() {
  try {
    const defaultUrl = 'https://dbbi79w6g08cf.cloudfront.net/images/logo/zenthea-logo.png';
    const manualLogoUrl = await getManualLogoUrl();
    
    return NextResponse.json({
      success: true,
      url: manualLogoUrl || defaultUrl,
      isManual: manualLogoUrl !== null,
      message: manualLogoUrl ? 'Using manually set logo' : 'Using default logo'
    });

  } catch (error) {
    console.error('Error getting manual logo:', error);
    return NextResponse.json(
      { error: 'Failed to get manual logo' },
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
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Store the S3 logo URL reference
    await setManualLogoUrl(url);
    
    console.log('Manual logo set:', url);

    return NextResponse.json({
      success: true,
      url: url,
      message: 'Manual logo set successfully'
    });

  } catch (error) {
    console.error('Error setting manual logo:', error);
    return NextResponse.json(
      { error: 'Failed to set manual logo' },
      { status: 500 }
    );
  }
}
