import { Resend } from 'resend';

const EMAIL_FROM = process.env.EMAIL_FROM || '';

export default async function handler(req, res) {
  const requestId = req.headers['x-vercel-id'] || `email-${Date.now()}`;

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    console.warn('[send-email] Unsupported request method', { requestId, method: req.method });
    return res.status(405).json({ error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[send-email] Missing Resend configuration', { requestId, missing: 'RESEND_API_KEY' });
    return res.status(503).json({ error: 'Email service is unavailable because RESEND_API_KEY is not configured.', code: 'MISSING_RESEND_API_KEY' });
  }
  if (!EMAIL_FROM) {
    console.error('[send-email] Missing Resend configuration', { requestId, missing: 'EMAIL_FROM' });
    return res.status(503).json({ error: 'Email service is unavailable because EMAIL_FROM is not configured.', code: 'MISSING_EMAIL_FROM' });
  }

  const { to, subject, body, type = 'notification' } = req.body || {};
  const recipient = Array.isArray(to) ? to[0] : to;
  if (!recipient || !subject || !body) {
    console.warn('[send-email] Missing required email fields', { requestId, hasTo: Boolean(recipient), hasSubject: Boolean(subject), hasBody: Boolean(body), type });
    return res.status(400).json({ error: 'Missing required fields: to, subject, body.', code: 'MISSING_FIELDS' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    console.warn('[send-email] Invalid recipient email address', { requestId, recipient, type });
    return res.status(400).json({ error: 'Invalid recipient email address.', code: 'INVALID_RECIPIENT' });
  }

  try {
    console.info('[send-email] Sending email through Resend', { requestId, recipient, type, subject, from: EMAIL_FROM });
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to: [recipient], subject, html: buildEmailHtml(subject, body, type) });
    if (error) {
      const status = error.statusCode === 401 ? 401 : error.statusCode === 429 ? 429 : 422;
      console.error('[send-email] Resend rejected email', { requestId, recipient, type, status, name: error.name, message: error.message });
      return res.status(status).json({ error: error.message || 'Resend could not send the email.', code: 'RESEND_SEND_FAILED' });
    }
    console.info('[send-email] Email sent successfully', { requestId, recipient, type, resendId: data?.id });
    return res.status(200).json({ id: data?.id, status: 'sent' });
  } catch (error) {
    console.error('[send-email] Unexpected email delivery error', { requestId, recipient, type, name: error.name, message: error.message });
    return res.status(500).json({ error: 'Unexpected error while sending email.', code: 'EMAIL_SEND_ERROR' });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function buildEmailHtml(subject, body, type) {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
  const otpCode = type === 'verification' ? String(body).match(/\b(\d{6})\b/)?.[1] : null;
  const content = otpCode ? `<p>Use this verification code to complete your registration:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a73e8;">${otpCode}</p><p>This code expires in 10 minutes.</p>` : `<p style="line-height:1.6;">${safeBody}</p>`;
  return `<!doctype html><html><body style="margin:0;padding:32px;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="480" style="max-width:480px;background:#fff;border-radius:12px;"><tr><td style="padding:32px;"><h1 style="font-size:20px;">${safeSubject}</h1>${content}<hr style="border:0;border-top:1px solid #eee;margin:24px 0;"><p style="font-size:12px;color:#777;">SHKJ Project Management System</p></td></tr></table></td></tr></table></body></html>`;
}
