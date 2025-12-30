import { NextRequest, NextResponse } from 'next/server';
import { getZentheaServerSession } from '@/lib/auth';

import { sendAppointmentEmailToMultiple } from '@/lib/email/appointment-email';

/**
 * API route for sending appointment notifications
 * POST /api/appointments/notify
 * 
 * This endpoint handles sending email/SMS notifications for appointment events.
 * Called after appointments are created/updated/cancelled to notify relevant users.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await getZentheaServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const {
      type,
      recipients,
      appointmentDetails,
    } = body as {
      type: 'invite' | 'update' | 'cancel' | 'reminder';
      recipients: Array<{ email: string; name: string }>;
      appointmentDetails: {
        patientName: string;
        date: string;
        time: string;
        duration: number;
        type: string;
        location?: string;
        organizerName?: string;
      };
    };

    // Validate required fields
    if (!type || !recipients || !appointmentDetails) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, recipients, appointmentDetails' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipients must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get app URL for email links
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.zenthea.com';

    // Send emails
    const result = await sendAppointmentEmailToMultiple(
      recipients,
      type,
      appointmentDetails,
      appUrl
    );

    // Log the result
    console.log(`[Appointment Notify] Type: ${type}, Sent: ${result.sent}, Failed: ${result.failed}`);
    if (result.errors.length > 0) {
      console.warn('[Appointment Notify] Errors:', result.errors);
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[Appointment Notify] Error:', error);
    
    // Differentiate error types for better debugging and user experience
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // Check for SendGrid-specific errors (rate limiting, auth, etc.)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return NextResponse.json(
          { success: false, error: 'Email service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('api key')) {
        return NextResponse.json(
          { success: false, error: 'Email service configuration error' },
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        return NextResponse.json(
          { success: false, error: 'Email service access denied' },
          { status: 500 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/appointments/notify',
    description: 'Appointment notification endpoint',
    methods: ['POST'],
  });
}

