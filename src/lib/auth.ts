import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db/index'
import { DEFAULT_AUTH_ROLE } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { resolveAuthBaseUrl } from '#/lib/server/app-hosts'

async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set — email-code sign-in is unavailable. Use email and password instead.',
    )
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: 'Your Money Diary sign-in code',
      text: `Your sign-in code is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your Money Diary sign-in code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>It expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Failed to send sign-in code email (${response.status}). ${detail}`)
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
