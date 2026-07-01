/**
 * User-facing release notes (Settings → About, update prompt).
 * Write for end users only — not admin, analytics, or infra changes.
 * Bump APP_VERSION in src/lib/app-version.ts when adding an entry.
 * Newest release first.
 */
export interface ChangelogRelease {
  version: string
  date: string
  title: string
  highlights: string[]
}

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: '0.1.3',
    date: '2026-07-01',
    title: 'Transfers and polish',
    highlights: [
      'Optional category on transfers so you can filter them like expenses',
      'AI chat shows what it is doing while logging entries',
      'Converting an expense to a transfer now saves correctly',
      'Sign-in shows a clear message when the verification email cannot be sent',
      'Transactions table and date filters layout better on small screens',
      'Upcoming bills on the dashboard are easier to read on mobile',
    ],
  },
  {
    version: '0.1.2',
    date: '2026-06-30',
    title: 'Faster loading',
    highlights: [
      'Quicker first paint when opening the app, especially on dashboard',
      'Pages load their data earlier when you navigate around the app',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-06-30',
    title: 'Feedback conversations',
    highlights: [
      'View your support tickets and full conversation history in Settings',
      'Reply to follow up on bugs, feature requests, or help requests',
      'Closed tickets stay read-only until support reopens them',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-30',
    title: 'Early access',
    highlights: [
      'Track income, expenses, savings, goals, and wishlist',
      'AI assistant for logging and finance questions',
      'Multiple themes and privacy mode',
      'Recurring bills and scheduled transaction drafts',
    ],
  },
]

/** Returns the latest changelog entry, if any. */
export function getLatestChangelogRelease(): ChangelogRelease | null {
  return CHANGELOG_RELEASES[0] ?? null
}
