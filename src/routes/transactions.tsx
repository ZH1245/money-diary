import { useAuthSession } from '#/lib/use-auth-session'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { Button } from '#/components/ui/button'
import { DatePickerField } from '#/components/ui/date-picker'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { useCategoriesQuery } from '#/features/categories/hooks/use-categories'
import { PaymentAccountSelect } from '#/features/payment-accounts/components/payment-account-select'
import { usePaymentAccountsQuery } from '#/features/payment-accounts/hooks/use-payment-accounts'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import type { TransactionDto } from '#/features/transactions/types/transaction'
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useTransactionsQuery,
  useUpdateTransactionMutation,
} from '#/features/transactions/hooks/use-transactions'
import { getExchangeRate } from '#/features/exchange-rates/api/exchange-rate-api'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '#/lib/currency'
import { formatSensitiveCompactAmount, formatSensitiveCurrency, usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { cn } from '#/lib/utils'
import { transactionTypeChartColors } from '#/lib/chart-colors'
import { setTransactionType, transactionFiltersStore } from '#/features/transactions/store/transaction-filters-store'
import { dashboardDateRangeStore } from '#/features/dashboard/store/dashboard-date-range-store'
import { isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { Navigate, Link, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toInputDate, toIsoDateAtNoon } from '#/lib/date-input'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageContentSkeleton, SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { SensitiveAmount } from '#/components/privacy/sensitive-amount'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { Skeleton } from '#/components/ui/skeleton'
import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { TableRowActions } from '#/components/feedback/table-row-actions'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function getDefaultTransactionForm(userCurrency: string): TransactionFormState {
  return {
    title: '',
    amount: '',
    currency: userCurrency,
    exchangeRate: '1',
    type: 'expense',
    categoryId: '',
    paymentAccountId: 'none',
    source: '',
    note: '',
    happenedAt: format(new Date(), 'yyyy-MM-dd'),
  }
}

function TransactionsPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()
  const { data, isPending, isError, error } = useTransactionsQuery()
  const { data: categories = [] } = useCategoriesQuery()
  const { data: paymentAccounts = [] } = usePaymentAccountsQuery()
  const createTransactionMutation = useCreateTransactionMutation()
  const updateTransactionMutation = useUpdateTransactionMutation()
  const deleteTransactionMutation = useDeleteTransactionMutation()
  const filters = useStore(transactionFiltersStore, (state) => state)
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null)
  const userCurrency = ((session?.user as { currency?: string } | undefined)?.currency ?? DEFAULT_CURRENCY).toUpperCase()
  const [createForm, setCreateForm] = useState<TransactionFormState>(() => getDefaultTransactionForm(userCurrency))
  const [isFetchingRate, setIsFetchingRate] = useState(false)
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false)

  const isForeignCurrency = createForm.currency !== userCurrency
  const isPrivacyMode = usePrivacyModeEnabled()
  const convertedAmountPreview = useMemo(() => {
    if (!isForeignCurrency) return null
    const amount = Number(createForm.amount)
    const rate = Number(createForm.exchangeRate)
    if (!Number.isFinite(amount) || !Number.isFinite(rate) || amount <= 0 || rate <= 0) return null
    return formatCurrency((amount * rate).toString(), userCurrency)
  }, [createForm.amount, createForm.exchangeRate, isForeignCurrency, userCurrency])

  const filteredTransactions = (data ?? []).filter((transaction) => {
    const typeMatches = filters.type === 'all' || transaction.type === filters.type
    const dateMatches = isDateInRange(transaction.happenedAt, dateRange.from, dateRange.to)
    return typeMatches && dateMatches
  })
  const transactionTotals = useMemo(() => buildTransactionTotals(filteredTransactions), [filteredTransactions])
  const chartData = useMemo(() => buildChartData(transactionTotals), [transactionTotals])
  const tableRows = useMemo(
    () => buildTableRows(filteredTransactions, paymentAccounts),
    [filteredTransactions, paymentAccounts],
  )

  const handleDeleteTransaction = useCallback(
    async (id: number, title: string) => {
      await toast.promise(deleteTransactionMutation.mutateAsync(id), {
        loading: 'Deleting transaction...',
        success: `Deleted ${title}`,
        error: (message) => (message instanceof Error ? message.message : 'Unable to delete transaction'),
      })
    },
    [deleteTransactionMutation],
  )

  const openEditSheet = useCallback(
    (row: TransactionTableRow) => {
      const isForeign = row.sourceCurrency.toUpperCase() !== userCurrency
      setEditingTransactionId(row.id)
      setIsCurrencyPickerOpen(isForeign)
      setCreateForm({
        title: row.title,
        amount: isForeign && row.sourceAmount ? row.sourceAmount : row.amount,
        currency: row.sourceCurrency.toUpperCase(),
        exchangeRate: row.exchangeRate,
        type: row.type,
        categoryId: row.categoryId ? String(row.categoryId) : '',
        paymentAccountId: row.paymentAccountId ? String(row.paymentAccountId) : 'none',
        source: row.source,
        note: row.note,
        happenedAt: toInputDate(row.happenedAt),
      })
      setIsSheetOpen(true)
    },
    [userCurrency],
  )

  const transactionColumns = useMemo<ColumnDef<TransactionTableRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <SensitiveText text={row.original.title} />,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
      },
      {
        accessorKey: 'happenedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => row.original.happenedAtLabel,
        sortingFn: (first, second) =>
          new Date(first.original.happenedAt).getTime() - new Date(second.original.happenedAt).getTime(),
      },
      {
        id: 'amount',
        accessorFn: (row) => Number(row.amount),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => <SensitiveAmount amount={row.original.amount} currency={userCurrency} className="font-medium" />,
      },
      {
        id: 'account',
        accessorFn: (row) => row.accountLabel,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
        cell: ({ row }) => row.original.accountLabel || '—',
      },
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <div className="text-right">Actions</div>,
        meta: { cellClassName: 'w-[6.5rem]' },
        cell: ({ row }) => (
          <TableRowActions
            label={row.original.title}
            onEdit={() => openEditSheet(row.original)}
            onDelete={() => void handleDeleteTransaction(row.original.id, row.original.title)}
            isDeletePending={deleteTransactionMutation.isPending}
          />
        ),
      },
    ],
    [deleteTransactionMutation.isPending, handleDeleteTransaction, openEditSheet, userCurrency, isPrivacyMode],
  )

  if (isSessionPending) {
    return <SessionLoadingSkeleton />
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }
  const isEditing = editingTransactionId !== null
  const isSaving = createTransactionMutation.isPending || updateTransactionMutation.isPending
  const showCategoryField = requiresTransactionCategory(createForm.type)

  function openCreateSheet() {
    setEditingTransactionId(null)
    setIsCurrencyPickerOpen(false)
    setCreateForm(getDefaultTransactionForm(userCurrency))
    setIsSheetOpen(true)
  }

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingTransactionId(null)
      setIsCurrencyPickerOpen(false)
      setCreateForm(getDefaultTransactionForm(userCurrency))
    }
  }

  async function handleCurrencyChange(currency: string) {
    if (currency === userCurrency) {
      setCreateForm((state) => ({ ...state, currency, exchangeRate: '1' }))
      setIsCurrencyPickerOpen(false)
      return
    }

    setIsCurrencyPickerOpen(true)
    setCreateForm((state) => ({ ...state, currency }))
    setIsFetchingRate(true)

    try {
      const rate = await getExchangeRate(currency, userCurrency)
      setCreateForm((state) => ({ ...state, currency, exchangeRate: rate.toFixed(6) }))
    } catch {
      toast.error('Could not fetch exchange rate. Enter it manually.')
    } finally {
      setIsFetchingRate(false)
    }
  }

  async function handleSaveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (requiresTransactionCategory(createForm.type) && !createForm.categoryId) {
      toast.error('Choose a category for expense and transfer entries')
      return
    }

    if (!createForm.title.trim() || !createForm.amount.trim()) {
      toast.error('Title and amount are required')
      return
    }

    if (!createForm.happenedAt) {
      toast.error('Transaction date is required')
      return
    }

    if (isForeignCurrency && !createForm.exchangeRate.trim()) {
      toast.error('Exchange rate is required for foreign currency entries')
      return
    }

    const happenedAt = toIsoDateAtNoon(createForm.happenedAt)
    const payload = {
      title: createForm.title.trim(),
      amount: createForm.amount.trim(),
      currency: createForm.currency,
      exchangeRate: isForeignCurrency ? createForm.exchangeRate.trim() : undefined,
      type: createForm.type,
      categoryId: resolveTransactionCategoryId(
        createForm.type,
        createForm.categoryId ? Number(createForm.categoryId) : null,
      ),
      paymentAccountId: createForm.paymentAccountId === 'none' ? null : Number(createForm.paymentAccountId),
      source: createForm.source.trim() || undefined,
      note: createForm.note.trim() || undefined,
      happenedAt,
    }

    if (isEditing && editingTransactionId) {
      const updatePromise = updateTransactionMutation.mutateAsync({
        id: editingTransactionId,
        input: {
          ...payload,
          source: createForm.source.trim() || null,
          note: createForm.note.trim() || null,
        },
      })

      await toast.promise(updatePromise, {
        loading: 'Updating transaction...',
        success: 'Transaction updated',
        error: (message) => (message instanceof Error ? message.message : 'Unable to update transaction'),
      })
    } else {
      const createPromise = createTransactionMutation.mutateAsync(payload)

      await toast.promise(createPromise, {
        loading: 'Creating transaction...',
        success: 'Transaction created',
        error: (message) => (message instanceof Error ? message.message : 'Unable to create transaction'),
      })
    }

    setCreateForm(getDefaultTransactionForm(userCurrency))
    setIsCurrencyPickerOpen(false)
    setEditingTransactionId(null)
    setIsSheetOpen(false)
  }

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="display-title text-3xl">Transactions</h1>
            <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
              <Button className="gap-2" onClick={openCreateSheet}>
                <Plus className="size-4" />
                Create transaction
              </Button>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>{isEditing ? 'Update transaction' : 'Create transaction'}</SheetTitle>
                  <SheetDescription>
                    {isEditing ? 'Edit this ledger entry' : 'Add a new entry to your ledger'}
                  </SheetDescription>
                </SheetHeader>
                <form className="grid gap-4 px-4" onSubmit={handleSaveTransaction}>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={createForm.title}
                      onChange={(event) => setCreateForm((state) => ({ ...state, title: event.target.value }))}
                      placeholder="Salary, groceries, Netflix..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">
                      Amount{isCurrencyPickerOpen || isForeignCurrency ? '' : ` (${userCurrency})`}
                    </label>
                    <div className={cn('flex gap-2', !isCurrencyPickerOpen && !isForeignCurrency && 'flex-col')}>
                      <Input
                        type="number"
                        value={createForm.amount}
                        onChange={(event) => setCreateForm((state) => ({ ...state, amount: event.target.value }))}
                        placeholder="0.00"
                        className={isCurrencyPickerOpen || isForeignCurrency ? 'flex-1' : undefined}
                      />
                      {isCurrencyPickerOpen || isForeignCurrency ? (
                        <Select value={createForm.currency} onValueChange={(value) => void handleCurrencyChange(value)}>
                          <SelectTrigger className="w-[7.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                    {!isCurrencyPickerOpen && !isForeignCurrency ? (
                      <button
                        type="button"
                        className="w-fit text-xs text-primary underline-offset-4 hover:underline"
                        onClick={() => setIsCurrencyPickerOpen(true)}
                      >
                        Paid in another currency?
                      </button>
                    ) : null}
                  </div>
                  {isForeignCurrency ? (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Exchange rate (1 {createForm.currency} → {userCurrency})
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={createForm.exchangeRate}
                          onChange={(event) =>
                            setCreateForm((state) => ({ ...state, exchangeRate: event.target.value }))
                          }
                          placeholder="0.00"
                          disabled={isFetchingRate}
                        />
                        {isFetchingRate ? (
                          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                      {convertedAmountPreview ? (
                        <p className="text-xs text-muted-foreground">
                          ≈ {convertedAmountPreview} in {userCurrency}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={createForm.type}
                        onValueChange={(value) => {
                          const nextType = value as TransactionFormState['type']
                          setCreateForm((state) => ({
                            ...state,
                            type: nextType,
                            categoryId: nextType === 'income' ? '' : state.categoryId,
                          }))
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showCategoryField ? (
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-medium">Category</label>
                          <Link to="/categories" className="text-xs text-primary underline-offset-4 hover:underline">
                            Manage
                          </Link>
                        </div>
                        <Select
                          value={createForm.categoryId}
                          onValueChange={(value) => setCreateForm((state) => ({ ...state, categoryId: value }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                  {createForm.type === 'income' ? (
                    <p className="text-xs text-muted-foreground">Income entries do not need a category.</p>
                  ) : null}
                  <DatePickerField
                    id="transaction-date"
                    label="Date"
                    value={createForm.happenedAt}
                    onChange={(happenedAt) => setCreateForm((state) => ({ ...state, happenedAt }))}
                  />
                  <PaymentAccountSelect
                    value={createForm.paymentAccountId}
                    onValueChange={(value) => setCreateForm((state) => ({ ...state, paymentAccountId: value }))}
                    accounts={paymentAccounts}
                    label="Paid from"
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Note (optional)</label>
                    <Input
                      value={createForm.note}
                      onChange={(event) => setCreateForm((state) => ({ ...state, note: event.target.value }))}
                      placeholder="Any details"
                    />
                  </div>
                  <SheetFooter className="px-0">
                    <Button type="submit" disabled={isSaving} className="w-full">
                      {isSaving ? 'Saving...' : isEditing ? 'Update transaction' : 'Save transaction'}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-5 max-w-xs">
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

          {isPending ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
              <PageContentSkeleton tableColumns={5} />
            </div>
          ) : null}
          {isError ? <p className="mt-5 text-sm text-red-600">{error.message}</p> : null}

          {!isPending && !isError ? (
            <>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">Flow by type</p>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatSensitiveCompactAmount(value, userCurrency, isPrivacyMode)}
                        />
                        <Tooltip formatter={(value) => formatSensitiveCurrency(String(value), userCurrency, isPrivacyMode)} />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">Distribution</p>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="amount"
                          nameKey="name"
                          outerRadius={90}
                          label={(entry) => entry.name}
                        >
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatSensitiveCurrency(String(value), userCurrency, isPrivacyMode)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <DataTable
                  columns={transactionColumns}
                  data={tableRows}
                  filterPlaceholder="Search by title, type, or date..."
                  emptyMessage="No transactions match this filter."
                  showPrivacyToggle
                  initialSorting={[{ id: 'happenedAt', desc: true }]}
                />
              </div>
            </>
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

/**
 * Groups transactions into totals by type for charts.
 */
function buildTransactionTotals(transactions: Array<{ amount: string; type: 'income' | 'expense' | 'transfer' }>) {
  return transactions.reduce<Record<'income' | 'expense' | 'transfer', number>>(
    (accumulator, transaction) => {
      const parsedAmount = Number(transaction.amount)
      if (!Number.isFinite(parsedAmount)) return accumulator
      return {
        ...accumulator,
        [transaction.type]: accumulator[transaction.type] + parsedAmount,
      }
    },
    {
      income: 0,
      expense: 0,
      transfer: 0,
    }
  )
}

/**
 * Converts grouped totals into chart rows.
 */
function buildChartData(totals: Record<'income' | 'expense' | 'transfer', number>) {
  return [
    { name: 'Income' as const, amount: totals.income, color: transactionTypeChartColors.Income },
    { name: 'Expense' as const, amount: totals.expense, color: transactionTypeChartColors.Expense },
    { name: 'Transfer' as const, amount: totals.transfer, color: transactionTypeChartColors.Transfer },
  ].filter((entry) => entry.amount > 0)
}

/**
 * Normalizes transaction rows for table rendering.
 */
function buildTableRows(
  transactions: TransactionDto[],
  paymentAccounts: PaymentAccountDto[],
): TransactionTableRow[] {
  const accountsById = paymentAccounts.reduce<Record<number, PaymentAccountDto>>((accumulator, account) => {
    accumulator[account.id] = account
    return accumulator
  }, {})

  return transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      sourceAmount: transaction.sourceAmount,
      sourceCurrency: transaction.sourceCurrency,
      exchangeRate: transaction.exchangeRate,
      type: transaction.type,
      categoryId: transaction.categoryId,
      paymentAccountId: transaction.paymentAccountId,
      accountLabel: transaction.paymentAccountId
        ? formatPaymentAccountLabel(accountsById[transaction.paymentAccountId])
        : '',
      source: transaction.source ?? '',
      note: transaction.note ?? '',
      happenedAt: transaction.happenedAt,
      happenedAtLabel: new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
      }).format(new Date(transaction.happenedAt)),
    }))
}

interface TransactionFormState {
  title: string
  amount: string
  currency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: string
  paymentAccountId: string
  source: string
  note: string
  happenedAt: string
}

interface TransactionTableRow {
  id: number
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: number | null
  paymentAccountId: number | null
  accountLabel: string
  source: string
  note: string
  happenedAt: string
  happenedAtLabel: string
}
