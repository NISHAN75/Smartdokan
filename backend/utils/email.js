const RESEND_API_URL = 'https://api.resend.com/emails';

const getEmailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SmartDokan <onboarding@resend.dev>';

  if (!apiKey) {
    const error = new Error('RESEND_API_KEY is not configured');
    error.code = 'EMAIL_CONFIG_MISSING';
    throw error;
  }

  return { apiKey, from };
};

export const sendEmail = async ({ to, subject, html }) => {
  const { apiKey, from } = getEmailConfig();

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.name || `Resend request failed with status ${response.status}`;
    const error = new Error(message);
    error.code = 'EMAIL_SEND_FAILED';
    error.providerResponse = payload;
    throw error;
  }

  return payload;
};

export const buildVerificationEmail = ({ name, verificationUrl }) => ({
  subject: 'Verify your SmartDokan account',
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto">
      <h2 style="color:#4f46e5">Welcome to SmartDokan</h2>
      <p>Hello ${escapeHtml(name)},</p>
      <p>Please verify your email address to activate your SmartDokan account.</p>
      <p><a href="${verificationUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Verify Email</a></p>
      <p>This verification link expires in 24 hours.</p>
      <p>If you did not create this account, you can safely ignore this email.</p>
    </div>
  `,
});

export const buildPasswordResetEmail = ({ name, resetUrl }) => ({
  subject: 'Reset your SmartDokan password',
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto">
      <h2 style="color:#4f46e5">Reset your SmartDokan password</h2>
      <p>Hello ${escapeHtml(name)},</p>
      <p>We received a request to reset your SmartDokan password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p>This reset link expires in 30 minutes.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `,
});

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
