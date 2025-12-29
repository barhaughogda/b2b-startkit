import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check if NEXTAUTH_SECRET is configured
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET is not configured');
      return NextResponse.json(
        { 
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'NEXTAUTH_SECRET is not configured',
            timestamp: new Date().toISOString(),
          }
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, email, role, tenantId } = body;

    // Validate required fields
    if (!userId || !email || !role || !tenantId) {
      return NextResponse.json(
        { 
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: userId, email, role, tenantId',
            timestamp: new Date().toISOString(),
          }
        },
        { status: 400 }
      );
    }

    // Create JWT token with user information
    const token = jwt.sign(
      {
        userId,
        email,
        role,
        tenantId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      },
      process.env.NEXTAUTH_SECRET,
      { algorithm: 'HS256' }
    );

    return NextResponse.json({
      success: true,
      token,
      expiresIn: '24h'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('JWT generation error:', error);
    
    // Ensure we always return JSON, even on errors
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate JWT token',
          timestamp: new Date().toISOString(),
        }
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
