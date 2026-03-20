import { Resend } from 'resend';
import { MISMATCH_EVENT_LABELS, type MismatchReportPayload } from '../shared/supportReport';

let connectionSettings: any;

async function getCredentials() {
  // If a direct RESEND_API_KEY environment variable is set, use it
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || null,
    };
  }

  // Fall back to Replit connectors
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Email service not configured. Set RESEND_API_KEY environment variable.');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  const isGmailFrom = fromEmail && fromEmail.toLowerCase().includes('@gmail.com');
  const validFrom = isGmailFrom ? null : fromEmail;
  const resolvedFrom = validFrom || 'DW.ai <no-reply@send.dimensionalwellnessai.com>';
  console.log('[email] Using from address:', resolvedFrom);
  return {
    client: new Resend(apiKey),
    fromEmail: validFrom
  };
}

export async function sendFeedbackEmail(
  userEmail: string | null,
  userId: string | null,
  message: string,
  category: string,
  pageContext: string | null,
  metadata: Record<string, any> | null
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: 'rbisbigred@gmail.com',
      subject: 'Feedback',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">New Feedback Received</h2>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>User:</strong> ${userEmail || 'Guest'} ${userId ? `(ID: ${userId})` : ''}</p>
            <p><strong>Page:</strong> ${pageContext || 'Not specified'}</p>
            <p><strong>Time:</strong> ${timestamp}</p>
            ${metadata?.device ? `<p><strong>Device:</strong> ${metadata.device}</p>` : ''}
            ${metadata?.browser ? `<p><strong>Browser:</strong> ${metadata.browser}</p>` : ''}
          </div>
          
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
            <h3 style="margin-top: 0;">Message:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </body>
        </html>
      `,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    return false;
  }
}

export async function sendMismatchReportEmail(
  userEmail: string | null,
  userId: string | null,
  report: MismatchReportPayload
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const eventLabel = MISMATCH_EVENT_LABELS[report.eventType] ?? report.eventType;

    await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: 'rbisbigred@gmail.com',
      subject: `[Mismatch Report] ${eventLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Mismatch Report — ${eventLabel}</h2>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Event Type:</strong> ${report.eventType}</p>
            <p><strong>User:</strong> ${userEmail || 'Guest'} ${userId ? `(ID: ${userId})` : ''}</p>
            <p><strong>Page:</strong> ${report.pageContext || 'Not specified'}</p>
            <p><strong>Time:</strong> ${timestamp}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h3 style="margin-top: 0; color: #555;">Requested / Expected</h3>
            <p style="white-space: pre-wrap;">${report.requestedItem}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h3 style="margin-top: 0; color: #555;">Closest Match Shown</h3>
            <p style="white-space: pre-wrap;">${report.closestMatch}</p>
          </div>

          ${report.details ? `
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
            <h3 style="margin-top: 0; color: #555;">Additional Details</h3>
            <p style="white-space: pre-wrap;">${report.details}</p>
          </div>
          ` : ''}
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send mismatch report email:', error);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(): string {
  const explicitAppUrl = process.env.APP_URL || process.env.APP_BASE_URL;
  if (explicitAppUrl) return explicitAppUrl.replace(/\/$/, '');

  const replitDomain =
    process.env.REPLIT_DOMAINS && process.env.REPLIT_DOMAINS.length > 0
      ? process.env.REPLIT_DOMAINS.split(',')[0]
      : null;
  if (replitDomain) return `https://${replitDomain}`;

  const replitSlugDomain =
    process.env.REPL_SLUG && process.env.REPL_OWNER
      ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : null;
  if (replitSlugDomain) return `https://${replitSlugDomain}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'APP_URL environment variable must be set in production (or provide REPLIT_DOMAINS / REPL_SLUG & REPL_OWNER) to generate absolute URLs for emails.',
    );
  }
  return 'http://localhost:5000';
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = getBaseUrl();
    
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: toEmail,
      subject: 'Reset Your DW.ai Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">DW.ai</h1>
            <p style="color: #888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Dimensional Wellness AI</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px; color: #333; font-size: 20px;">Password Reset Request</h2>
            <p style="margin: 0 0 20px; color: #666;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 500; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="margin: 20px 0 0; color: #888; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 0;">
              DW.ai - Your Life Intelligence System
            </p>
          </div>
        </body>
        </html>
      `,
    });
    
    if (error) {
      console.error('[email] Resend API error for password reset to:', toEmail, '-', error.message);
      return false;
    }
    
    console.log('[email] Password reset email sent successfully to:', toEmail);
    return true;
  } catch (error: any) {
    console.error('[email] Failed to send password reset email to:', toEmail, '- error:', error?.message || error);
    if (error?.statusCode) console.error('[email] Resend status code:', error.statusCode);
    return false;
  }
}

export async function sendSupportReportEmail(
  report: {
    category: string;
    description: string;
    stepsToReproduce?: string;
    eventType?: string;
    requestedTerm?: string;
    normalizedTerm?: string;
    closestMatch?: { id?: string; name?: string };
    confidence?: number;
    technicalDetails?: Record<string, any>;
    recentContext?: Record<string, any>;
    conversationSnippet?: { conversationId?: string; lastUserMessage?: string; lastDwReply?: string };
    constraintsSnapshot?: Record<string, any>;
    createdAt: string;
  }
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const timestamp = new Date(report.createdAt).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const optionalSection = (label: string, data: unknown) =>
      data != null
        ? `<div style="margin-top:16px"><strong>${esc(label)}:</strong><pre style="background:#f0f0f0;padding:12px;border-radius:6px;font-size:13px;white-space:pre-wrap">${esc(JSON.stringify(data, null, 2))}</pre></div>`
        : '';

    await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: 'dimensionalwellnessai@gmail.com',
      subject: `Support Report [${report.category}]${report.eventType ? ` – ${report.eventType}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Support Report Received</h2>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Category:</strong> ${esc(report.category)}</p>
            ${report.eventType ? `<p><strong>Event Type:</strong> ${esc(report.eventType)}</p>` : ''}
            <p><strong>Submitted:</strong> ${esc(timestamp)}</p>
          </div>
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
            <h3 style="margin-top: 0;">Description:</h3>
            <p style="white-space: pre-wrap;">${esc(report.description)}</p>
            ${report.stepsToReproduce ? `<h3>Steps to Reproduce:</h3><p style="white-space:pre-wrap">${esc(report.stepsToReproduce)}</p>` : ''}
            ${report.requestedTerm ? `<p><strong>Requested Term:</strong> ${esc(report.requestedTerm)}</p>` : ''}
            ${report.normalizedTerm ? `<p><strong>Normalized Term:</strong> ${esc(report.normalizedTerm)}</p>` : ''}
            ${report.closestMatch ? `<p><strong>Closest Match:</strong> ${esc(report.closestMatch.name ?? '')} ${report.closestMatch.id ? `(id: ${esc(report.closestMatch.id)})` : ''}</p>` : ''}
            ${report.confidence != null ? `<p><strong>Confidence:</strong> ${report.confidence}</p>` : ''}
            ${optionalSection('Technical Details', report.technicalDetails)}
            ${optionalSection('Recent Context', report.recentContext)}
            ${optionalSection('Conversation Snippet', report.conversationSnippet)}
            ${optionalSection('Constraints Snapshot', report.constraintsSnapshot)}
          </div>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send support report email:', error);
    return false;
  }
}

export async function sendPartnerInviteEmail(
  toEmail: string,
  requesterEmail: string,
  inviteToken: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();

    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;
    const safeRequesterEmail = escapeHtml(requesterEmail);

    const { data, error } = await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: toEmail,
      subject: `${requesterEmail} invited you to be their accountability partner on DW.ai`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">DW.ai</h1>
            <p style="color: #888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Dimensional Wellness AI</p>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px; color: #333; font-size: 20px;">You've Been Invited!</h2>
            <p style="margin: 0 0 20px; color: #666;">
              <strong>${safeRequesterEmail}</strong> has invited you to be their accountability partner on DW.ai.
              As accountability partners, you'll support each other's commitments and follow-through.
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 500; font-size: 16px;">
                Accept Invite
              </a>
            </div>
            <p style="margin: 20px 0 0; color: #888; font-size: 14px;">
              If you don't have a DW.ai account yet, you'll be prompted to create one when you accept the invite.
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 0;">DW.ai - Your Life Intelligence System</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[email] Resend API error for partner invite to:', toEmail, '-', error.message);
      return false;
    }

    console.log('[email] Partner invite email sent successfully to:', toEmail);
    return true;
  } catch (error: any) {
    console.error('[email] Failed to send partner invite email to:', toEmail, '- error:', error?.message || error);
    if (error?.statusCode) console.error('[email] Resend status code:', error.statusCode);
    return false;
  }
}

export async function sendAccountDeletionEmail(toEmail: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    await client.emails.send({
      from: fromEmail || 'DW.ai <no-reply@send.dimensionalwellnessai.com>',
      to: toEmail,
      subject: 'Your DW.ai Account Has Been Deleted',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">DW.ai</h1>
            <p style="color: #888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Dimensional Wellness AI</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px; color: #333; font-size: 20px;">Account Deletion Confirmed</h2>
            <p style="margin: 0 0 20px; color: #666;">
              This email confirms that your DW.ai account and all associated data have been permanently deleted.
            </p>
            <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Deletion completed:</strong> ${timestamp}
              </p>
            </div>
            <p style="margin: 20px 0 0; color: #666; font-size: 14px;">
              All your wellness data, conversations, goals, habits, and personal information have been removed from our systems. We're sorry to see you go, and we hope your wellness journey continues to thrive.
            </p>
            <p style="margin: 20px 0 0; color: #666; font-size: 14px;">
              If you deleted your account by mistake or would like to return in the future, you're welcome to create a new account at any time.
            </p>
          </div>
          
          <div style="text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 0;">
              DW.ai - Your Life Intelligence System
            </p>
          </div>
        </body>
        </html>
      `,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send account deletion email:', error);
    return false;
  }
}
