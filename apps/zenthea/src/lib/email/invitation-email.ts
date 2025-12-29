/**
 * Email service for sending user invitations
 * 
 * This is a placeholder implementation that logs emails in development.
 * In production, this should be extended to use SendGrid or another email service.
 * 
 * Environment variables required for production:
 * - SENDGRID_API_KEY: SendGrid API key
 * - EMAIL_FROM: Email address to send from (e.g., noreply@zenthea.com)
 */

interface InvitationEmailData {
  email: string;
  invitationToken: string;
  invitedBy: string;
  tenantName?: string;
  expiresAt: number;
}

/**
 * Send invitation email to user
 * 
 * @param data - Invitation email data
 * @returns Promise that resolves when email is sent (or logged in dev mode)
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invitationLink = `${baseUrl}/company/invitations/accept/${data.invitationToken}`;
  
  // Calculate expiration date
  const expiresDate = new Date(data.expiresAt);
  const expiresInDays = Math.ceil((data.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

  // Email content
  const subject = `You've been invited to join ${data.tenantName || "Zenthea"}`;
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
        <h1 style="margin: 0;">Welcome to Zenthea</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hello,</p>
        <p>You've been invited by <strong>${data.invitedBy}</strong> to join ${data.tenantName || "their clinic"} on Zenthea.</p>
        <p style="margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #5FBFAF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </p>
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color: #5FBFAF; word-break: break-all;">${invitationLink}</a>
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This invitation will expire in ${expiresInDays} day${expiresInDays !== 1 ? "s" : ""} (${expiresDate.toLocaleDateString()}).
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Welcome to Zenthea

Hello,

You've been invited by ${data.invitedBy} to join ${data.tenantName || "their clinic"} on Zenthea.

Accept your invitation by clicking this link:
${invitationLink}

This invitation will expire in ${expiresInDays} day${expiresInDays !== 1 ? "s" : ""} (${expiresDate.toLocaleDateString()}).

If you didn't expect this invitation, you can safely ignore this email.
  `;

  // In development, log the email
  if (process.env.NODE_ENV === "development" || !process.env.SENDGRID_API_KEY) {
    console.log("=".repeat(80));
    console.log("📧 INVITATION EMAIL (Development Mode - Email not actually sent)");
    console.log("=".repeat(80));
    console.log(`To: ${data.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Invitation Link: ${invitationLink}`);
    console.log(`Expires: ${expiresDate.toLocaleString()}`);
    console.log("=".repeat(80));
    return;
  }

  // TODO: Implement SendGrid email sending for production
  // Example implementation:
  /*
  import sgMail from '@sendgrid/mail';
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  
  const msg = {
    to: data.email,
    from: process.env.EMAIL_FROM || 'noreply@zenthea.com',
    subject,
    text: textBody,
    html: htmlBody,
  };
  
  await sgMail.send(msg);
  */
  
  // For now, log that email should be sent
  console.log(`[EMAIL] Should send invitation email to ${data.email}`);
  console.log(`[EMAIL] Invitation link: ${invitationLink}`);
}



















