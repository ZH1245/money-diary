/**
 * Release changelog — bump APP_VERSION in src/lib/app-version.ts when adding an entry.
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
    version: '0.1.2',
    date: '2026-06-30',
    title: 'Performance monitoring',
    highlights: [
      'Vercel Speed Insights for real-user Core Web Vitals on production',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-06-30',
    title: 'Feedback conversations',
    highlights: [
      'Two-way support tickets: view full threads and reply in Settings',
      'Admin ticket detail with submitter name, ADMIN replies, and status control',
      'Closed tickets cannot receive new replies until reopened',
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
