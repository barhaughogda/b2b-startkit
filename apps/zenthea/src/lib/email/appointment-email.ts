/**
 * Email service for appointment-related notifications
 * Uses SendGrid in production, logs to console in development
 * 
 * Environment variables required:
 * - SENDGRID_API_KEY: SendGrid API key
 * - NOTIFICATION_EMAIL_FROM: From email address
 */

interface AppointmentEmailData {
  recipientEmail: string;
  recipientName: string;
  type: 'invite' | 'update' | 'cancel' | 'reminder';
  appointmentDetails: {
    patientName: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    location?: string;
    organizerName?: string;
  };
  appUrl?: string;
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * This is important for user-provided content in email templates
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate email subject based on notification type
 */
function getEmailSubject(type: AppointmentEmailData['type'], patientName: string): string {
  switch (type) {
    case 'invite':
      return `Appointment Invitation: ${patientName}`;
    case 'update':
      return `Appointment Updated: ${patientName}`;
    case 'cancel':
      return `Appointment Cancelled: ${patientName}`;
    case 'reminder':
      return `Appointment Reminder: ${patientName}`;
    default:
      return `Appointment Notification: ${patientName}`;
  }
}

/**
 * Generate email HTML content
 */
function generateEmailHtml(data: AppointmentEmailData): string {
  const { recipientName, type, appointmentDetails, appUrl } = data;
  const { patientName, date, time, duration, type: appointmentType, location, organizerName } = appointmentDetails;

  // Escape all user-provided content to prevent XSS
  const safeRecipientName = escapeHtml(recipientName);
  const safePatientName = escapeHtml(patientName);
  const safeDate = escapeHtml(date);
  const safeTime = escapeHtml(time);
  const safeAppointmentType = escapeHtml(appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1));
  const safeLocation = location ? escapeHtml(location) : '';
  const safeOrganizerName = organizerName ? escapeHtml(organizerName) : '';
  const safeAppUrl = appUrl ? escapeHtml(appUrl) : '';

  // Header message based on type
  let headerMessage = '';
  let headerColor = '#5FBFAF'; // Zenthea teal
  
  switch (type) {
    case 'invite':
      headerMessage = `You've been invited to an appointment`;
      break;
    case 'update':
      headerMessage = 'An appointment has been updated';
      headerColor = '#5F7FBF';
      break;
    case 'cancel':
      headerMessage = 'An appointment has been cancelled';
      headerColor = '#EF4444';
      break;
    case 'reminder':
      headerMessage = 'Upcoming appointment reminder';
      headerColor = '#F59E0B';
      break;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(getEmailSubject(type, patientName))}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F7FA;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                ${headerMessage}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                Hi ${safeRecipientName},
              </p>
              
              ${type === 'cancel' ? `
              <p style="margin: 0 0 30px; color: #EF4444; font-size: 16px; font-weight: 500;">
                The following appointment has been cancelled:
              </p>
              ` : ''}
              
              <!-- Appointment Card -->
              <div style="background-color: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600;">
                  Patient: ${safePatientName}
                </h2>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 100px;">
                      📅 Date:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                      ${safeDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">
                      ⏰ Time:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                      ${safeTime} (${duration} minutes)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">
                      📋 Type:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                      ${safeAppointmentType}
                    </td>
                  </tr>
                  ${safeLocation ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">
                      📍 Location:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                      ${safeLocation}
                    </td>
                  </tr>
                  ` : ''}
                  ${safeOrganizerName ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">
                      👤 Organizer:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                      ${safeOrganizerName}
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              ${type !== 'cancel' && safeAppUrl ? `
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${safeAppUrl}/company/calendar" 
                   style="display: inline-block; background-color: ${headerColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
                  View in Calendar
                </a>
              </div>
              ` : ''}
              
              <p style="margin: 0; color: #6B7280; font-size: 14px; text-align: center;">
                ${type === 'invite' ? 'You can respond to this invitation from your calendar.' : ''}
                ${type === 'update' ? 'Please review the updated appointment details.' : ''}
                ${type === 'cancel' ? 'If you have any questions, please contact the appointment organizer.' : ''}
                ${type === 'reminder' ? 'Please ensure you are prepared for this appointment.' : ''}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                This email was sent by Zenthea Clinic Management System.
              </p>
              <p style="margin: 8px 0 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} Zenthea. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateEmailText(data: AppointmentEmailData): string {
  const { recipientName, type, appointmentDetails } = data;
  const { patientName, date, time, duration, type: appointmentType, location, organizerName } = appointmentDetails;
  
  // Note: Plain text emails don't need HTML escaping, but we escape for consistency
  // and to prevent any potential issues with special characters
  const safeRecipientName = escapeHtml(recipientName);
  const safePatientName = escapeHtml(patientName);
  const safeDate = escapeHtml(date);
  const safeTime = escapeHtml(time);
  const safeAppointmentType = escapeHtml(appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1));
  const safeLocation = location ? escapeHtml(location) : '';
  const safeOrganizerName = organizerName ? escapeHtml(organizerName) : '';

  let headerMessage = '';
  switch (type) {
    case 'invite':
      headerMessage = "You've been invited to an appointment";
      break;
    case 'update':
      headerMessage = 'An appointment has been updated';
      break;
    case 'cancel':
      headerMessage = 'An appointment has been cancelled';
      break;
    case 'reminder':
      headerMessage = 'Upcoming appointment reminder';
      break;
  }

  return `
${headerMessage}

Hi ${safeRecipientName},

APPOINTMENT DETAILS
-------------------
Patient: ${safePatientName}
Date: ${safeDate}
Time: ${safeTime} (${duration} minutes)
Type: ${safeAppointmentType}
${safeLocation ? `Location: ${safeLocation}` : ''}
${safeOrganizerName ? `Organizer: ${safeOrganizerName}` : ''}

${type === 'invite' ? 'You can respond to this invitation from your calendar.' : ''}
${type === 'update' ? 'Please review the updated appointment details.' : ''}
${type === 'cancel' ? 'If you have any questions, please contact the appointment organizer.' : ''}
${type === 'reminder' ? 'Please ensure you are prepared for this appointment.' : ''}

---
This email was sent by Zenthea Clinic Management System.
  `.trim();
}

/**
 * Send appointment notification email
 */
export async function sendAppointmentEmail(data: AppointmentEmailData): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.NOTIFICATION_EMAIL_FROM || 'notifications@zenthea.com';
  const subject = getEmailSubject(data.type, data.appointmentDetails.patientName);
  const html = generateEmailHtml(data);
  const text = generateEmailText(data);

  // In development or when SendGrid is not configured, log the email
  if (process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY) {
    console.log('\n=== APPOINTMENT EMAIL (DEV MODE) ===');
    console.log('To:', data.recipientEmail);
    console.log('From:', fromEmail);
    console.log('Subject:', subject);
    console.log('Type:', data.type);
    console.log('Appointment:', JSON.stringify(data.appointmentDetails, null, 2));
    console.log('=================================\n');
    
    return { success: true };
  }

  // Production: Send email via SendGrid
  try {
    // Dynamic import to avoid bundling SendGrid in development
    let sgMail: any;
    try {
      sgMail = require('@sendgrid/mail').default;
    } catch {
      const sgMailModule = await import('@sendgrid/mail');
      sgMail = sgMailModule.default;
    }

    if (!sgMail) {
      throw new Error('SendGrid mail module not available');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to: data.recipientEmail,
      from: fromEmail,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send appointment email:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send appointment notifications to multiple recipients
 */
export async function sendAppointmentEmailToMultiple(
  recipients: Array<{ email: string; name: string }>,
  type: AppointmentEmailData['type'],
  appointmentDetails: AppointmentEmailData['appointmentDetails'],
  appUrl?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const recipient of recipients) {
    const result = await sendAppointmentEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      type,
      appointmentDetails,
      appUrl,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${recipient.email}: ${result.error}`);
      }
    }
  }

  return results;
}

