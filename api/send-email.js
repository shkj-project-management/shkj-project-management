/**
 * Vercel Serverless API — Send Email via Resend
 *
 * This endpoint is called from the client-side appClient.email.send()
 * to deliver real emails (OTP verification, password reset, notifications).
 *
 * Required environment variables (set in Vercel dashboard):
 *   RESEND_API_KEY       — Resend API key (required)
 *   EMAIL_FROM_ADDRESS   — Verified sender email in Resend (default: noreply@shkjpm.com)
 *   EMAIL_FROM_NAME      — Sender name (default: SHKJ Project Management)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@shkjpm.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'SHKJ Project Management';

export default async function handler(req, res) {
  // CORS headers for local dev
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY is not configured');
    return res.status(500).json({
      error: 'Email service is not configured. Please set RESEND_API_KEY in Vercel environment variables.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    const { to, subject, body, type } = req.body;

    if (!to || !subject || !body) {
      console.error('[send-email] Missing required fields:', { hasTo: !!to, hasSubject: !!subject, hasBody: !!body });
      return res.status(400).json({
        error: 'Missing required fields: to, subject, body',
        code: 'MISSING_FIELDS',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('[send-email] Invalid recipient email format:', to);
      return res.status(400).json({
        error: 'Invalid recipient email address',
        code: 'INVALID_EMAIL',
      });
    }

    // Build HTML email content based on type
    const htmlBody = buildEmailHtml(subject, body, type);

    const payload = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [to],
      subject,
      html: htmlBody,
    };

    console.log('[send-email] Sending email:', {
      to,
      subject,
      type,
      from: EMAIL_FROM_ADDRESS,
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[send-email] Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });

      // Map Resend error codes to meaningful messages
      let userMessage = 'Failed to send email';
      if (response.status === 422) {
        userMessage = 'Email configuration error. Please verify the sender email domain in Resend.';
      } else if (response.status === 401) {
        userMessage = 'Email service authentication failed. Please check RESEND_API_KEY.';
      } else if (response.status === 429) {
        userMessage = 'Email service rate limit exceeded. Please try again later.';
      } else if (data.message) {
        userMessage = data.message;
      } else if (data.error) {
        userMessage = data.error;
      }

      return res.status(response.status).json({
        error: userMessage,
        code: 'RESEND_ERROR',
        details: process.env.NODE_ENV === 'development' ? data : undefined,
      });
    }

    console.log('[send-email] Email sent successfully:', {
      to,
      subject,
      type,
      resendId: data.id,
    });

    return res.status(200).json({ id: data.id, status: 'sent' });
  } catch (error) {
    console.error('[send-email] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(500).json({
      error: 'Internal server error while sending email',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

function buildEmailHtml(subject, body, type) {
  const logo = '<div style="font-size:22px;font-weight:700;color:#1a73e8;">SHKJ PM</div>';
  
  let bodyHtml = '';
  
  if (type === 'verification') {
    // Extract OTP code from body (format: "Your verification code is: XXXXXX.")
    const otpMatch = body.match(/(\d{6})/);
    const otpCode = otpMatch ? otpMatch[1] : '';
    
    bodyHtml = `
      <div style="text-align:center;margin:30px 0;">
        <div style="font-size:14px;color:#666;margin-bottom:20px;">
          Use the following verification code to complete your registration.
        </div>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a73e8;
                    background:#f0f4ff;display:inline-block;padding:16px 32px;
                    border-radius:12px;font-family:monospace;">
          ${otpCode || body}
        </div>
        <div style="font-size:13px;color:#999;margin-top:20px;">
          This code expires in 10 minutes.
        </div>
      </div>
    `;
  } else if (type === 'password_reset') {
    bodyHtml = `
      <div style="margin:30px 0;">
        <p style="font-size:14px;color:#333;line-height:1.6;">${body}</p>
      </div>
    `;
  } else if (type === 'invitation') {
    bodyHtml = `
      <div style="margin:30px 0;">
        <p style="font-size:14px;color:#333;line-height:1.6;">${body}</p>
      </div>
    `;
  } else {
    bodyHtml = `
      <div style="margin:30px 0;">
        <p style="font-size:14px;color:#333;line-height:1.6;">${body}</p>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px;">
              <div style="text-align:center;margin-bottom:24px;">
                ${logo}
                <h1 style="font-size:20px;color:#333;margin:12px 0 0 0;">${subject}</h1>
              </div>
              ${bodyHtml}
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <div style="text-align:center;font-size:12px;color:#999;line-height:1.5;">
                <p>SHKJ Project Management System</p>
                <p>If you did not request this email, you can safely ignore it.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}