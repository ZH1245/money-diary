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
    version: '0.1.7',
    date: '2026-07-01',
    title: 'Date range fix',
    highlights: [
      'Workspace date range now matches your local calendar day correctly',
      'Last 30 days ends on today instead of showing a shifted range',
      'Transaction titles stay visible on mobile in the transactions list',
    ],
  },
  {
    version: '0.1.6',
    date: '2026-07-01',
    title: 'UTC timestamps',
    highlights: [
      'Transaction and savings dates are stored in UTC for consistent reporting',
      'Dates and times display in your browser timezone automatically',
      'Date pickers send proper UTC timestamps when you log entries',
    ],
  },
  {
    version: '0.1.5',
    date: '2026-07-01',
    title: 'Wealth insights',
    highlights: [
      'Compact wealth tiles on the dashboard for savings, goals, wishlist, and net worth',
      'Monthly review lets you log savings from a specific account and choose how much to move',
      'Date range filter now uses your local calendar date correctly',
      'Savings page charts deposits vs withdrawals and savings by goal',
      'Goals page shows progress bars and on-track vs behind summary',
      'Analytics Wealth section rolls up net worth, savings rate, and goal progress',
    ],
  },
  {
    version: '0.1.4',
    date: '2026-07-01',
    title: 'Planned transactions',
    highlights: [
      'Save income or expenses as planned so they stay off your balance until you confirm',
      'Pick date and time when logging a transaction',
      'Dashboard Upcoming combines planned items and recurring bills in one place',
      'Confirm or discard planned transactions from the dashboard',
    ],
  },
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
