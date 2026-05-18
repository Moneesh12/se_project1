import { Resend } from "resend";

const RESEND_API_KEY = process.env.BREVO_API_KEY || "";
const RESEND_FROM = process.env.BREVO_FROM || "";

export async function sendOtpEmail(recipientEmail: string, otp: string, expiresInMinutes: number): Promise<void> {
  if (!RESEND_API_KEY || !RESEND_FROM) {
    console.warn("[EMAIL] Resend not configured (BREVO_API_KEY / BREVO_FROM) — emails will be logged to console only.");
    console.log(`[EMAIL] OTP for ${recipientEmail}: ${otp} (expires in ${expiresInMinutes} min)`);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    <tr>
      <td style="padding: 40px 32px 24px; text-align: center; background: linear-gradient(135deg, #16a34a, #0d9488);">
        <h1 style="color: #fff; font-size: 24px; margin: 0; letter-spacing: -0.5px;">VitalSub</h1>
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Verify your email address</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Your verification code is:
        </p>
        <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #16a34a; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          This code expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background: #f9fafb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">VitalSub — Intelligent Ingredient Substitution</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: recipientEmail,
      subject: "Your VitalSub verification code",
      html,
    });
    console.log(`[EMAIL] OTP sent successfully to ${recipientEmail} via Resend`);
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send OTP to ${recipientEmail}: message=${err.message || String(err)}`);
    console.log(`[EMAIL] OTP for ${recipientEmail}: ${otp} (email send failed, logged as fallback)`);
  }
}
