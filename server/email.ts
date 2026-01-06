import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email
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
      from: fromEmail || 'Flip the Switch <no-reply@resend.dev>',
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

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'http://localhost:5000';
    
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    await client.emails.send({
      from: fromEmail || 'Flip the Switch <no-reply@resend.dev>',
      to: toEmail,
      subject: 'Reset Your Flip the Switch Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">Flip the Switch</h1>
            <p style="color: #888; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">A Dimensional Wellness AI</p>
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
              Flip the Switch - Your wellness companion
            </p>
          </div>
        </body>
        </html>
      `,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
