import { APP_VERSION } from '#/lib/app-version'

/**
 * Returns true when the user is asking about Money Diary itself (not their finances).
 */
export function isPrimarilyProductQuestion(content: string): boolean {
  const normalized = content.trim().toLowerCase()
  if (!normalized) return false

  const hasFinanceAction =
    /spent|expense|income|transfer|savings|goal|wishlist|transaction|log |add |create |record |saved |bought |balance|spending|my (expenses|transactions|income)/.test(
      normalized,
    )
  if (hasFinanceAction) return false

  const hasProduct =
    /phone app|mobile app|android app|ios app|iphone app|app store|play store|native app|install.*(phone|mobile|home screen)|add to home|pwa\b|progressive web|money diary app|about (this|the) app|what is this app|this money diary|app version|what version|which version|latest (update|version)|up to date|is it (the )?latest|new version|updated version|version of the app|version of this app|is there an? app/.test(
      normalized,
    )

  const ambiguousAppContext =
    /\b(this|it)\b/.test(normalized) &&
    /\b(app|phone|mobile|version|update|pwa|install)\b/.test(normalized)

  return hasProduct || ambiguousAppContext
}

/**
 * Builds a factual answer about Money Diary as a product (version, mobile, updates).
 */
export function buildProductKnowledgeAnswer(question: string): string {
  const normalized = question.trim().toLowerCase()
  const parts: string[] = []

  if (/phone|mobile|android|ios|iphone|install|home screen|pwa/.test(normalized)) {
    parts.push(
      'Money Diary is a web app that works on desktop and mobile browsers. There is no separate native iOS or Android app in the store today.',
    )
    parts.push(
      'On your phone you can use it in the browser, or add it to your home screen (PWA) for an app-like experience.',
    )
  }

  if (/version|latest|update|new|up to date/.test(normalized)) {
    parts.push(
      `The current Money Diary release is version ${APP_VERSION}. The live site is updated whenever we deploy — you are on the latest version after you refresh, or when you accept the “new version available” prompt.`,
    )
  }

  if (parts.length === 0) {
    parts.push(
      'Money Diary is a personal finance web app for tracking income, expenses, savings, goals, and wishlist items, with optional AI assistance.',
    )
    parts.push(
      `It runs in your browser on desktop and mobile (version ${APP_VERSION}). There is no separate phone-store app; you can add the site to your home screen on mobile.`,
    )
  }

  parts.push('Ask me about your finances anytime — spending, accounts, goals, or logging transactions.')

  return parts.join('\n\n')
}
