import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db/index'
import { DEFAULT_AUTH_ROLE } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { resolveAuthBaseUrl } from '#/lib/server/app-hosts'

function otpEmailHtml(otp: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f3ef;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background-color:#ffffff;border:1px solid #e7e7e1;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#1f6b4a;letter-spacing:-0.01em;">Money Diary</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <p style="margin:0;font-size:15px;line-height:1.5;color:#15201a;">Use this code to sign in to your account.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#15201a;text-align:center;background-color:#f4f4ef;border:1px solid #e7e7e1;border-radius:10px;padding:18px 0;">${otp}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#9aa09a;">This code expires in 5 minutes.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9aa09a;">If you didn't request this, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set — email-code sign-in is unavailable. Use email and password instead.',
    )
  }

  const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const senderEmail = fromAddress.includes('<')
    ? fromAddress.match(/<([^>]+)>/)?.[1]?.trim()
    : fromAddress.trim()

  if (!senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    throw new Error(
      `RESEND_FROM is invalid (${fromAddress}). Use a verified sender like "Money Diary <noreply@yourdomain.com>".`,
    )
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: email,
      subject: 'Your Money Diary sign-in code',
      text: `Money Diary\n\nUse this code to sign in: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
      html: otpEmailHtml(otp),
    }),
  })

  if (!response.ok) {
    let detail = ''
    try {
      const payload = (await response.json()) as { message?: string; error?: string }
      detail = payload.message ?? payload.error ?? ''
    } catch {
      detail = await response.text().catch(() => '')
    }
    throw new Error(
      detail.trim() || `Failed to send sign-in code email (${response.status}).`,
    )
  }
}

export const auth = betterAuth({
  baseURL: resolveAuthBaseUrl(),
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: DEFAULT_AUTH_ROLE,
        input: false,
      },
      currency: {
        type: 'string',
        required: false,
        defaultValue: DEFAULT_CURRENCY,
        input: true,
      },
      accountStatus: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: false,
      },
      moderationReason: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      sendVerificationOTP: async ({ email, otp }) => {
        await sendOtpEmail(email, otp)
      },
    }),
    tanstackStartCookies(),
  ],
})
