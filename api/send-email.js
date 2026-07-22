/**
 * Vercel Serverless API — Send Email via Resend
 *
 * This endpoint is called from the client-side appClient.email.send()
 * to deliver real emails (OTP verification, password reset, notifications).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

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
    return res.status(500).json({
      error: 'RESEND_API_KEY not configured. Please set the RESEND_API_KEY environment variable in Vercel.',
    });
  }

  try {
    const { to, subject, body, type } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // Build HTML email content based on type
    const htmlBody = buildEmailHtml(subject, body, type);

    const payload = {
      from: 'SHKJ Project Management <noreply@shkjpm.com>',
      to: [to],
      subject,
      html: htmlBody,
    };

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
      console.error('Resend API error:', data);
      return res.status(response.status).json({
        error: data.message || data.error || 'Failed to send email',
      });
    }

    return res.status(200).json({ id: data.id, status: 'sent' });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
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