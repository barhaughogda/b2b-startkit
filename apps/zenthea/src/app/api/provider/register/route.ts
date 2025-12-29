import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/lib/convex-api';

// Use real Convex API
const convexApi = api;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      specialty,
      licenseNumber,
      npi,
      password, 
      tenantId 
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !licenseNumber || !npi || !password) {
      return NextResponse.json(
        { message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate specialty is not empty
    if (!specialty || specialty.trim() === '') {
      return NextResponse.json(
        { message: 'Specialty is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(npi)) {
      return NextResponse.json(
        { message: 'NPI must be 10 digits' },
        { status: 400 }
      );
    }

    // Validate license number format (basic validation)
    if (!/^[A-Z]{2}\d{6}$/.test(licenseNumber)) {
      return NextResponse.json(
        { message: 'License number must be valid format' },
        { status: 400 }
      );
    }

    // Validate phone number format (more strict validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json(
        { message: 'Valid phone number is required' },
        { status: 400 }
      );
    }

    // Use real Convex API
    try {
      const result = await fetchMutation(convexApi.providers.createProvider, {
        firstName,
        lastName,
        email,
        phone,
        specialty,
        licenseNumber,
        npi,
        tenantId: tenantId || 'default-tenant'
      });

      return NextResponse.json(
        { 
          message: 'Provider account created successfully',
          providerId: result 
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating provider:', error);
      return NextResponse.json(
        { message: 'Failed to create provider account' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Provider registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}