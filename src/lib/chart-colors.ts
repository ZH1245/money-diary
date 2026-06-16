/**
 * Theme-aligned colors for Recharts and progress visuals.
 */
export const chartColors = {
  primary: 'var(--primary)',
  income: 'var(--chart-3)',
  expense: 'var(--primary)',
  transfer: 'var(--chart-2)',
  series: [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ],
} as const

/**
 * Colors keyed by transaction type labels used in charts.
 */
export const transactionTypeChartColors = {
  Income: chartColors.income,
  Expense: chartColors.expense,
  Transfer: chartColors.transfer,
} as const
