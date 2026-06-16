import { authClient } from '#/lib/auth-client'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useTransactionsQuery } from '#/features/transactions/hooks/use-transactions'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import {
  setTransactionSearchTerm,
  setTransactionType,
  transactionFiltersStore,
} from '#/features/transactions/store/transaction-filters-store'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { data, isPending, isError, error } = useTransactionsQuery()
  const filters = useStore(transactionFiltersStore, (state) => state)

  if (isSessionPending) {
    return (
      <main className="p-8">
        <p>Loading session...</p>
      </main>
    )
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }
  const userCurrency = ((session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY).toUpperCase()

  const filteredTransactions = (data ?? []).filter((transaction) => {
    const titleMatches = transaction.title
      .toLowerCase()
      .includes(filters.searchTerm.trim().toLowerCase())

    const typeMatches = filters.type === 'all' || transaction.type === filters.type

    return titleMatches && typeMatches
  })

  return (
    <AuthenticatedAppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role,
        currency: (session.user as { currency?: string }).currency,
      }}
    >
      <main className="p-6 md:p-8">
        <section className="island-shell rounded-2xl p-6">
          <h1 className="display-title text-3xl">Transactions</h1>
          <p className="mt-2 text-sm opacity-80">Powered by TanStack Query + TanStack Store.</p>
          <p className="mt-2 text-xs opacity-70">
            We assume all entered amounts are in {userCurrency}. For foreign-currency receipts, provide currency
            and exchange rate during create flow/API.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              value={filters.searchTerm}
              onChange={(event) => setTransactionSearchTerm(event.target.value)}
              placeholder="Search by title"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <Select
              value={filters.type}
              onValueChange={(value) => setTransactionType(value as 'all' | 'income' | 'expense' | 'transfer')}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending ? <p className="mt-5 text-sm">Loading transactions...</p> : null}
          {isError ? <p className="mt-5 text-sm text-red-600">{error.message}</p> : null}

          {!isPending && !isError ? (
            filteredTransactions.length ? (
              <ul className="mt-5 space-y-2">
                {filteredTransactions.map((transaction) => (
                  <li key={transaction.id} className="feature-card rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{transaction.title}</p>
                      <span className="text-sm opacity-80">{transaction.type}</span>
                    </div>
                    <p className="mt-1 text-sm opacity-80">{formatCurrency(transaction.amount, userCurrency)}</p>
                    {transaction.sourceAmount && transaction.sourceCurrency !== userCurrency ? (
                      <p className="mt-1 text-xs opacity-70">
                        Source: {formatCurrency(transaction.sourceAmount, transaction.sourceCurrency)} @ rate {transaction.exchangeRate}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm opacity-80">No transactions match this filter.</p>
            )
          ) : null}
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}

/**
 * Formats currency amounts while handling invalid numeric values gracefully.
 */
function formatCurrency(amount: string, currency: string): string {
  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount)) return amount
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(parsedAmount)
}
