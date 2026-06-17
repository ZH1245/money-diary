import {
  PRIVACY_POLICY_LAST_UPDATED,
  privacyPolicySections,
  type PrivacyPolicySection,
} from '#/features/legal/content/privacy-policy'
import { TERMS_LAST_UPDATED, termsSections, type TermsSection } from '#/features/legal/content/terms-of-service'

/**
 * Formats legal sections into plain text for model context.
 */
function formatLegalSections(sections: Array<PrivacyPolicySection | TermsSection>): string {
  return sections
    .map((section) => {
      const bullets = section.bullets?.length
        ? `\n${section.bullets.map((bullet) => `- ${bullet}`).join('\n')}`
        : ''
      return `## ${section.title}\n${section.paragraphs.join('\n')}${bullets}`
    })
    .join('\n\n')
}

/**
 * Builds embedded privacy and terms knowledge for the AI system prompt.
 */
export function buildLegalKnowledgeForAi(): string {
  return `PRIVACY POLICY (last updated ${PRIVACY_POLICY_LAST_UPDATED}; in-app page: /privacy)
${formatLegalSections(privacyPolicySections)}

TERMS OF SERVICE (last updated ${TERMS_LAST_UPDATED}; in-app page: /terms)
${formatLegalSections(termsSections)}`
}

/**
 * Returns true when the user message is about privacy/terms without a finance action.
 */
export function isPrimarilyLegalQuestion(content: string): boolean {
  const normalized = content.trim().toLowerCase()
  if (!normalized) return false

  const hasLegal =
    /privacy|terms of service|terms and conditions|\bterms\b|policy|policies|data (is )?(being )?used|what (data|information)|delete (my )?(account|data)|cookies|third[- ]party|gdpr|legal/.test(
      normalized,
    )
  const hasFinanceAction =
    /spent|expense|income|transfer|savings|goal|wishlist|transaction|log |add |create |record |saved |bought /.test(
      normalized,
    )

  return hasLegal && !hasFinanceAction
}

/**
 * Builds a plain-language answer from published policy content when the model cannot reply.
 */
export function buildLegalPolicyAnswer(question: string): string {
  const normalized = question.trim().toLowerCase()
  const parts: string[] = []

  if (/what.*data|data.*used|information.*collect|privacy|used for/.test(normalized)) {
    parts.push(
      'Money Diary collects account details (name, email, preferred currency), financial records you enter (transactions, categories, payment accounts, savings, goals, wishlist), and basic session/technical data to run the service.',
    )
    parts.push(
      'We use this only to operate the app: sign-in, showing your dashboard and records, foreign-exchange conversion when you request a rate, and optional AI chat if you enable it. Your data is not shared with other users.',
    )
  }

  if (/ai|ollama|model|assistant|chat/.test(normalized)) {
    parts.push(
      'If AI is enabled in Settings, your prompts and conversation history are stored in your account and may be sent to the model provider you configure (for example Ollama on your own server). Review entries the AI creates before relying on them.',
    )
  }

  if (/delete|retention|remove my/.test(normalized)) {
    parts.push(
      'We keep your data while your account is active. To request account and data deletion, use Settings in the app.',
    )
  }

  if (/terms|acceptable|rules|liability|advice/.test(normalized)) {
    parts.push(
      'Our Terms of Service: Money Diary is for personal finance tracking only — not financial, tax, or investment advice. You own the data you enter. Do not abuse the service or bypass security.',
    )
  }

  if (/storage|host|neon|vercel|where.*stored/.test(normalized)) {
    parts.push(
      'Your account and financial data are stored in PostgreSQL (hosted on Neon). The web app is served on Vercel. Authentication uses Better Auth.',
    )
  }

  if (parts.length === 0) {
    parts.push(
      'Money Diary\'s Privacy Policy covers what we collect, how we use it, third parties, cookies, and your rights. Terms cover acceptable use, your data, AI features, and liability.',
    )
  }

  parts.push(
    `Read the full documents in the app: /privacy (updated ${PRIVACY_POLICY_LAST_UPDATED}) and /terms (updated ${TERMS_LAST_UPDATED}).`,
  )

  return parts.join('\n\n')
}
