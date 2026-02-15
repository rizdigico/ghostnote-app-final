// api/lib/emailService.ts
// Email service for GhostNote - Uses Resend for transactional emails
// For development, falls back to console logging

// Note: Resend is a modern email API service
// Install: npm install resend
// Sign up at: https://resend.com

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Format date for display
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date with time
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Send email using Resend (or console log in development)
async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  const { to, subject, html } = options;

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    // Development mode - log to console
    console.log('📧 [DEV EMAIL] Sending email:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body preview: ${html.substring(0, 100)}...`);
    console.log('');
    return { success: true, messageId: 'dev-local' };
  }

  try {
    // Use require for dynamic import to avoid build-time issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resend = require('resend');
    const { Resend } = resend;
    const resendClient = new Resend(resendApiKey);

    const data = await resendClient.emails.send({
      from: 'GhostNote <noreply@ghostnote.app>',
      to: [to],
      subject: subject,
      html: html,
    });

    console.log(`✅ Email sent successfully to ${to}:`, data);
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

// Send cancellation confirmation email
export async function sendCancellationEmail(
  email: string,
  name: string,
  planName: string,
  endDate: string
): Promise<SendEmailResult> {
  const formattedDate = formatDate(endDate);

  return sendEmail({
    to: email,
    subject: `Cancellation Confirmed: Your ${capitalize(planName)} access ends on ${formattedDate}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Cancellation Confirmed</h1>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      We've received your request to cancel your <strong>${capitalize(planName)}</strong> subscription.
    </p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #666; font-size: 14px;">Your access will end on</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #333;">${formattedDate}</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      You'll continue to have full access to all ${capitalize(planName)} features until that date. After that, your account will be automatically downgraded to the free Echo plan.
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Changed your mind?</strong> You can resume your subscription anytime before ${formattedDate} to keep your plan and avoid any interruption.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666; text-align: center;">
      If you have any questions, reply to this email or contact us at <a href="mailto:rizdigi.co@gmail.com" style="color: #667eea;">rizdigi.co@gmail.com</a>
    </p>
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
      © ${new Date().getFullYear()} GhostNote. All rights reserved.
    </p>
  </body>
</html>
    `,
  });
}

// Send resumption confirmation email
export async function sendResumptionEmail(
  email: string,
  name: string,
  planName: string,
  endDate: string
): Promise<SendEmailResult> {
  const formattedDate = formatDate(endDate);

  return sendEmail({
    to: email,
    subject: `Welcome back! Your ${capitalize(planName)} subscription is active`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Resumed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Back! 🎉</h1>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Great news! Your <strong>${capitalize(planName)}</strong> subscription has been resumed.
    </p>
    
    <div style="background: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #c3e6cb;">
      <p style="margin: 0; color: #155724; font-size: 14px;">Your next billing date is</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #155724;">${formattedDate}</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Your subscription is now active and you'll continue to have full access to all ${capitalize(planName)} features. Thanks for staying with us!
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666; text-align: center;">
      If you have any questions, reply to this email or contact us at <a href="mailto:rizdigi.co@gmail.com" style="color: #667eea;">rizdigi.co@gmail.com</a>
    </p>
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
      © ${new Date().getFullYear()} GhostNote. All rights reserved.
    </p>
  </body>
</html>
    `,
  });
}

// Send payment failed email
export async function sendPaymentFailedEmail(
  email: string,
  name: string,
  planName: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: `Action Required: Payment failed for your ${capitalize(planName)} subscription`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Issue</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Payment Issue</h1>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      We were unable to process your payment for your <strong>${capitalize(planName)}</strong> subscription.
    </p>
    
    <div style="background: #f8d7da; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #f5c6cb;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">Please update your payment method</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #721c24;">to avoid service interruption</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      To update your payment method, please log in to your GhostNote account and visit the billing settings.
    </p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      If you need help, contact us at <a href="mailto:rizdigi.co@gmail.com" style="color: #667eea;">rizdigi.co@gmail.com</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
      © ${new Date().getFullYear()} GhostNote. All rights reserved.
    </p>
  </body>
</html>
    `,
  });
}

// Send trial removal notification (when card was used for previous trial)
export async function sendTrialRemovalNotification(
  email: string,
  name: string,
  planName: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: `Important: Your ${capitalize(planName)} Free Trial was Adjusted`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Adjustment Notice</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Free Trial Adjusted ⚠️</h1>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Thank you for subscribing to GhostNote! We've activated your <strong>${capitalize(planName)}</strong> subscription.
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Notice:</strong> We detected that your payment method has been used 
        for a free trial on a previous account. As a result, your subscription has been 
        activated immediately without the free trial period. You will be charged right away.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      You're now ready to enjoy all <strong>${capitalize(planName)}</strong> features including:
    </p>
    
    <ul style="font-size: 16px; line-height: 1.8; color: #333;">
      <li>Full access to voice cloning</li>
      <li>Unlimited content generation</li>
      <li>Team collaboration features</li>
      <li>Priority support</li>
    </ul>
    
    <p style="font-size: 16px; line-height: 1.6;">
      If you believe this is an error or have questions, please contact our support team.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666; text-align: center;">
      If you have any questions, reply to this email or contact us at <a href="mailto:rizdigi.co@gmail.com" style="color: #667eea;">rizdigi.co@gmail.com</a>
    </p>
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
      © ${new Date().getFullYear()} GhostNote. All rights reserved.
    </p>
  </body>
</html>
    `,
  });
}

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
