export const TERMS_LAST_UPDATED = 'June 22, 2026'

export interface TermsSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const termsSections: TermsSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    paragraphs: [
      'By creating an account or using Money Diary, you agree to these Terms of Service and our Privacy Policy.',
      'If you do not agree, do not use the service.',
    ],
  },
  {
    id: 'service-scope',
    title: 'Service Scope',
    paragraphs: [
      'Money Diary is provided as a personal finance tracking tool for recording transactions, savings, goals, wishlist items, and related analytics.',
      'The service is informational and organizational only. It does not provide financial, legal, tax, or investment advice.',
    ],
  },
  {
    id: 'account-responsibilities',
    title: 'Account Responsibilities',
    paragraphs: ['You are responsible for activity under your account.'],
    bullets: [
      'Provide accurate information during sign up, including account recovery details when prompted.',
      'Keep your credentials and recovery answers private and secure.',
      'Choose security answers you can remember consistently; answers are compared after normalization (for example trimming spaces and letter case).',
      'Notify us if you suspect unauthorized access.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Use the service for unlawful, abusive, or fraudulent activity.',
      'Attempt to bypass authentication, authorization, or rate limits.',
      'Interfere with service stability, security, or availability.',
    ],
  },
  {
    id: 'account-recovery',
    title: 'Account Recovery',
    paragraphs: [
      'Money Diary supports password recovery through a recovery email and one security question you set during onboarding or in Settings.',
      'You are responsible for maintaining accurate recovery details. Updating recovery information in Settings requires your current password.',
      'If you cannot answer your security question correctly, we may be unable to reset your password. We do not offer email OTP or SMS recovery in the current release.',
      'Do not use easily guessable recovery answers or information that others could obtain from public sources.',
    ],
  },
  {
    id: 'user-data',
    title: 'Your Data',
    paragraphs: [
      'You retain ownership of financial data you enter into Money Diary.',
      'You grant us the rights necessary to store, process, and display your data for operating the app.',
      'Optional end-to-end or per-user field encryption is not offered yet. Data you enter is stored to provide the service until such features are released, if ever.',
    ],
  },
  {
    id: 'ai-features',
    title: 'AI-Assisted Features',
    paragraphs: [
      'If AI-assisted entry is enabled, natural-language prompts may be processed by a model provider you configure.',
      'You remain responsible for reviewing and correcting entries created through AI tools.',
    ],
  },
  {
    id: 'availability',
    title: 'Availability and Changes',
    paragraphs: [
      'We may update, suspend, or discontinue features at any time to improve reliability, security, or performance.',
      'We do not guarantee uninterrupted or error-free operation.',
    ],
  },
  {
    id: 'liability',
    title: 'Disclaimer and Limitation of Liability',
    paragraphs: [
      'Money Diary is provided on an "as is" and "as available" basis.',
      'To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential damages from use of the service.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    paragraphs: [
      'You may stop using the service at any time.',
      'We may suspend or terminate accounts that violate these terms or threaten service security.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    paragraphs: [
      'We may update these terms periodically. Continued use after updates means you accept the revised terms.',
    ],
  },
]
