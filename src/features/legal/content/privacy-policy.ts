export const PRIVACY_POLICY_LAST_UPDATED = 'June 17, 2026'

/** Update this address to your real support or privacy inbox. */
export const PRIVACY_CONTACT_EMAIL = 'privacy@moneydiary.app'

export interface PrivacyPolicySection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    paragraphs: [
      'Money Diary ("we", "us", or "our") is a personal finance app that helps you track transactions, savings, goals, and spending insights.',
      'This Privacy Policy explains what information we collect, how we use it, where it is stored, and the choices you have. By creating an account or using Money Diary, you agree to this policy.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    paragraphs: ['We collect information you provide and data generated when you use the app:'],
    bullets: [
      'Account details: name, email address, password (stored securely via our authentication provider), and preferred currency.',
      'Financial records you enter: transactions, categories, payment accounts, savings entries, wishlist items, and goals.',
      'Optional notes and metadata attached to your records, such as dates, amounts, foreign currency details, and exchange rates.',
      'Technical data needed to run the service: session identifiers, request logs, and basic device/browser information from our hosting provider.',
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How we use your information',
    paragraphs: ['We use your information only to operate and improve Money Diary:'],
    bullets: [
      'Authenticate you and keep your account secure.',
      'Store and display your financial data across dashboard, transactions, savings, goals, wishlist, and analytics views.',
      'Convert foreign-currency amounts using exchange-rate services when you request a rate.',
      'Maintain app settings such as your preferred currency.',
      'Diagnose errors, protect against abuse, and keep the service reliable.',
    ],
  },
  {
    id: 'storage-and-hosting',
    title: 'Where your data is stored',
    paragraphs: [
      'Your account and financial data are stored in a PostgreSQL database hosted on Neon. The application is deployed on Vercel.',
      'Data is associated with your user account and is not shared with other users of the service.',
    ],
  },
  {
    id: 'third-party-services',
    title: 'Third-party services',
    paragraphs: ['Money Diary relies on a small set of third-party providers:'],
    bullets: [
      'Authentication: Better Auth handles sign-in, sessions, and password security.',
      'Database: Neon hosts your application data.',
      'Hosting: Vercel serves the web application.',
      'Exchange rates: When you fetch a rate, we may call public exchange-rate APIs (such as Frankfurter, open.er-api.com, or exchangerate.host). These requests include currency codes only, not your full financial history.',
      'AI assistant (optional): If you enable AI in settings, natural-language prompts and conversation history are stored in your account and may be sent to the model provider you configure (for example Ollama on your own server). Review entries the AI creates before relying on them.',
    ],
  },
  {
    id: 'cookies-and-local-storage',
    title: 'Cookies and local storage',
    paragraphs: [
      'We use cookies and similar storage for authentication sessions so you can stay signed in.',
      'Privacy mode preference is stored in your browser local storage on your device. It only controls on-screen masking of amounts and titles; it does not delete data from our servers.',
    ],
  },
  {
    id: 'retention-and-deletion',
    title: 'Data retention and deletion',
    paragraphs: [
      'We keep your data for as long as your account is active so the app can function.',
      'If you want your account and associated data deleted, contact us using the email below. We will process verified deletion requests within a reasonable timeframe, subject to any legal or security obligations to retain certain records.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use industry-standard practices such as HTTPS, hashed passwords, and access controls to protect your data.',
      'No online service can guarantee absolute security. Please use a strong, unique password and keep your sign-in credentials private.',
    ],
  },
  {
    id: 'privacy-mode',
    title: 'Privacy mode in the app',
    paragraphs: [
      'Money Diary includes a privacy mode toggle that masks amounts and titles in the interface. This is a display feature in your browser and does not change what is stored in your account.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    paragraphs: ['Depending on where you live, you may have rights to:'],
    bullets: [
      'Access, correct, or export the personal data in your account.',
      'Withdraw consent where processing is based on consent.',
      'Request deletion of your account and associated data.',
      'Lodge a complaint with a data protection authority.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: [
      'Money Diary is not directed at children under 13, and we do not knowingly collect personal information from children.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of Money Diary after changes means you accept the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: [
      `Questions about this Privacy Policy or your data? Email us at ${PRIVACY_CONTACT_EMAIL}.`,
    ],
  },
]
