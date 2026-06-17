import {
  PRIVACY_CONTACT_EMAIL,
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
${formatLegalSections(termsSections)}

Privacy contact: ${PRIVACY_CONTACT_EMAIL}`
}
