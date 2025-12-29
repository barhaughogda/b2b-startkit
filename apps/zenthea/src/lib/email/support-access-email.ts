/**
 * Email service for sending support access request notifications
 * 
 * This is a placeholder implementation that logs emails in development.
 * In production, this should be extended to use SendGrid or another email service.
 * 
 * Environment variables required for production:
 * - SENDGRID_API_KEY: SendGrid API key
 * - EMAIL_FROM: Email address to send from (e.g., noreply@zenthea.com)
 */

interface SupportAccessEmailData {
  targetUserEmail: string;
  requestId: string;
  superadminName: string;
  purpose: string;
  targetTenantId: string;
  targetUserId?: string;
}

/**
 * Send support access request notification email to user
 * 
 * @param data - Support access request email data
 * @returns Promise that resolves when email is sent (or logged in dev mode)
 */
export async function sendSupportAccessRequestEmail(
  data: SupportAccessEmailData
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  // Link to approval page with request ID (same route handles both user-level and tenant-level access)
  const approvalLink = `${baseUrl}/superadmin/support-access/approve/${data.requestId}`;

  // Email content
  const subject = `Support Access Request from ${data.superadminName}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #5FBFAF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Zenthea Support Access Request</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hello,</p>
        <p>A support access request has been submitted by <strong>${data.superadminName}</strong> (Zenthea Support Team).</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #5FBFAF;">
          <p style="margin: 0 0 10px 0;"><strong>Purpose:</strong></p>
          <p style="margin: 0; color: #666;">${data.purpose}</p>
        </div>

        <p style="margin: 30px 0;">
          <a href="${approvalLink}" 
             style="background-color: #5FBFAF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Review & Approve Request
          </a>
        </p>
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${approvalLink}" style="color: #5FBFAF; word-break: break-all;">${approvalLink}</a>
        </p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>⚠️ Important:</strong> This request requires your digital signature for approval. 
            Access will be granted for 1 hour after approval and will be automatically revoked.
          </p>
        </div>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          If you did not expect this request or have concerns, please contact Zenthea support immediately.
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Zenthea Support Access Request

Hello,

A support access request has been submitted by ${data.superadminName} (Zenthea Support Team).

Purpose:
${data.purpose}

Review and approve this request by clicking this link:
${approvalLink}

⚠️ Important: This request requires your digital signature for approval. Access will be granted for 1 hour after approval and will be automatically revoked.

If you did not expect this request or have concerns, please contact Zenthea support immediately.
  `;

  // In development or when SendGrid is not configured, log the email
  if (process.env.NODE_ENV === "development" || !process.env.SENDGRID_API_KEY) {
    console.log("=".repeat(80));
    console.log("📧 SUPPORT ACCESS REQUEST EMAIL (Development Mode - Email not actually sent)");
    console.log("=".repeat(80));
    console.log(`To: ${data.targetUserEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Request ID: ${data.requestId}`);
    console.log(`Superadmin: ${data.superadminName}`);
    console.log(`Purpose: ${data.purpose}`);
    console.log(`Approval Link: ${approvalLink}`);
    console.log("=".repeat(80));
    return;
  }

  // Production: Send email via SendGrid
  // If SendGrid API key is configured, we must have the implementation ready
  try {
    // Dynamic import to avoid bundling SendGrid in development
    // Use require for optional dependency to prevent webpack from trying to resolve it at build time
    let sgMail: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sgMail = require('@sendgrid/mail').default;
    } catch (requireError) {
      // If require fails, try dynamic import as fallback
      const sgMailModule = await import('@sendgrid/mail');
      sgMail = sgMailModule.default;
    }
    
    if (!sgMail) {
      throw new Error('SendGrid mail module not available. Please install @sendgrid/mail: npm install @sendgrid/mail');
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    
    const msg = {
      to: data.targetUserEmail,
      from: process.env.EMAIL_FROM || 'noreply@zenthea.com',
      subject,
      text: textBody,
      html: htmlBody,
    };
    
    await sgMail.send(msg);
    console.log(`[EMAIL] Support access request email sent successfully to ${data.targetUserEmail}`);
  } catch (error) {
    // Log error and rethrow to ensure caller knows email failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL] Failed to send support access request email to ${data.targetUserEmail}:`, error);
    
    // Provide helpful error message if SendGrid is not installed
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('@sendgrid/mail')) {
      throw new Error('SendGrid is not installed. Please install @sendgrid/mail: npm install @sendgrid/mail');
    }
    
    throw new Error(`Failed to send support access request email: ${errorMessage}`);
  }
}

interface SupportAccessApprovalEmailData {
  superadminEmail: string;
  requestId: string;
  targetUserEmail: string;
  targetUserName?: string;
  purpose: string;
  expirationTimestamp: number;
  targetTenantId: string;
}

/**
 * Send support access approval notification email to superadmin
 * 
 * @param data - Support access approval email data
 * @returns Promise that resolves when email is sent (or logged in dev mode)
 */
export async function sendSupportAccessApprovalEmail(
  data: SupportAccessApprovalEmailData
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  // Calculate expiration date
  const expirationDate = new Date(data.expirationTimestamp);
  const expirationTime = expirationDate.toLocaleString();
  const timeRemaining = Math.max(0, data.expirationTimestamp - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  // Email content
  const subject = `Support Access Request Approved - ${data.requestId}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #5FBFAF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Support Access Request Approved</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hello,</p>
        <p>Your support access request has been <strong>approved</strong> by <strong>${data.targetUserName || data.targetUserEmail}</strong>.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #5FBFAF;">
          <p style="margin: 0 0 10px 0;"><strong>Request Details:</strong></p>
          <p style="margin: 5px 0;"><strong>Request ID:</strong> ${data.requestId}</p>
          <p style="margin: 5px 0;"><strong>Purpose:</strong> ${data.purpose}</p>
          <p style="margin: 5px 0;"><strong>Target User:</strong> ${data.targetUserEmail}</p>
          <p style="margin: 5px 0;"><strong>Tenant ID:</strong> ${data.targetTenantId}</p>
        </div>

        <div style="background-color: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #155724;">
            <strong>✅ Access Granted:</strong> You now have support access for <strong>1 hour</strong>.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #155724;">
            <strong>Expires:</strong> ${expirationTime} (${hoursRemaining}h ${minutesRemaining}m remaining)
          </p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>⚠️ Important:</strong> All access activities will be logged for audit purposes. 
            Access will be automatically revoked after 1 hour.
          </p>
        </div>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          This is an automated notification. If you have any questions, please contact Zenthea support.
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Support Access Request Approved

Hello,

Your support access request has been approved by ${data.targetUserName || data.targetUserEmail}.

Request Details:
- Request ID: ${data.requestId}
- Purpose: ${data.purpose}
- Target User: ${data.targetUserEmail}
- Tenant ID: ${data.targetTenantId}

✅ Access Granted: You now have support access for 1 hour.
Expires: ${expirationTime} (${hoursRemaining}h ${minutesRemaining}m remaining)

⚠️ Important: All access activities will be logged for audit purposes. Access will be automatically revoked after 1 hour.

This is an automated notification. If you have any questions, please contact Zenthea support.
  `;

  // In development or when SendGrid is not configured, log the email
  if (process.env.NODE_ENV === "development" || !process.env.SENDGRID_API_KEY) {
    console.log("=".repeat(80));
    console.log("📧 SUPPORT ACCESS APPROVAL EMAIL (Development Mode - Email not actually sent)");
    console.log("=".repeat(80));
    console.log(`To: ${data.superadminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Request ID: ${data.requestId}`);
    console.log(`Approved by: ${data.targetUserName || data.targetUserEmail}`);
    console.log(`Purpose: ${data.purpose}`);
    console.log(`Expires: ${expirationTime} (${hoursRemaining}h ${minutesRemaining}m remaining)`);
    console.log("=".repeat(80));
    return;
  }

  // Production: Send email via SendGrid
  // If SendGrid API key is configured, we must have the implementation ready
  try {
    // Dynamic import to avoid bundling SendGrid in development
    // Use require for optional dependency to prevent webpack from trying to resolve it at build time
    let sgMail: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sgMail = require('@sendgrid/mail').default;
    } catch (requireError) {
      // If require fails, try dynamic import as fallback
      const sgMailModule = await import('@sendgrid/mail');
      sgMail = sgMailModule.default;
    }
    
    if (!sgMail) {
      throw new Error('SendGrid mail module not available. Please install @sendgrid/mail: npm install @sendgrid/mail');
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    
    const msg = {
      to: data.superadminEmail,
      from: process.env.EMAIL_FROM || 'noreply@zenthea.com',
      subject,
      text: textBody,
      html: htmlBody,
    };
    
    await sgMail.send(msg);
    console.log(`[EMAIL] Support access approval email sent successfully to ${data.superadminEmail}`);
  } catch (error) {
    // Log error and rethrow to ensure caller knows email failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL] Failed to send support access approval email to ${data.superadminEmail}:`, error);
    
    // Provide helpful error message if SendGrid is not installed
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('@sendgrid/mail')) {
      throw new Error('SendGrid is not installed. Please install @sendgrid/mail: npm install @sendgrid/mail');
    }
    
    throw new Error(`Failed to send support access approval email: ${errorMessage}`);
  }
}

