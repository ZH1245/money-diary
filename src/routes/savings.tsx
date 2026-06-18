import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { StatCard } from '#/components/feedback/stat-card'
import { TableRowActions } from '#/components/feedback/table-row-actions'
import { PageEmptyState, PageErrorState, PageContentSkeleton, SessionLoadingSkeleton } from '#/components/feedback/page-state'
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
import { useGoalsQuery } from '#/features/goals/hooks/use-goals'
import type { GoalDto } from '#/features/goals/types/goal'
import { PaymentAccountSelect } from '#/features/payment-accounts/components/payment-account-select'
import { usePaymentAccountsQuery } from '#/features/payment-accounts/hooks/use-payment-accounts'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import {
  useCreateSavingMutation,
  useDeleteSavingMutation,
  useSavingsQuery,
  useUpdateSavingMutation,
} from '#/features/savings/hooks/use-savings'
import type { SavingDto } from '#/features/savings/types/saving'
import { buildSavingsPageStats } from '#/features/savings/utils/savings-stats'
import { dashboardDateRangeStore } from '#/features/dashboard/store/dashboard-date-range-store'
import { isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { useAuthSession } from '#/lib/use-auth-session'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { SensitiveAmount } from '#/components/privacy/sensitive-amount'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { formatSensitiveCurrency, usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { toInputDate, toIsoDateAtNoon } from '#/lib/date-input'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Link2, PiggyBank, Plus, ReceiptText, Wallet } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/savings')({
  component: SavingsPage,
})

function SavingsPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()

  if (isSessionPending) return <SessionLoadingSkeleton />
  if (!session?.user) return <Navigate to="/sign-in" />

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
      <SavingsContent userCurrency={((session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY).toUpperCase()} />
    </AuthenticatedAppShell>
  )
}

function SavingsContent({ userCurrency }: { userCurrency: string }) {
  const { data: savings = [], isPending, isError, error } = useSavingsQuery()
  const { data: goals = [] } = useGoalsQuery()
  const { data: paymentAccounts = [] } = usePaymentAccountsQuery()
  const createSavingMutation = useCreateSavingMutation()
  const updateSavingMutation = useUpdateSavingMutation()
  const deleteSavingMutation = useDeleteSavingMutation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingSavingId, setEditingSavingId] = useState<number | null>(null)
  const [form, setForm] = useState<SavingFormState>(getDefaultSavingForm)
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)

  const isEditing = editingSavingId !== null
  const isSaving = createSavingMutation.isPending || updateSavingMutation.isPending
  const filteredSavings = useMemo(
    () => savings.filter((saving) => isDateInRange(saving.savedAt, dateRange.from, dateRange.to)),
    [savings, dateRange.from, dateRange.to],
  )
  const pageStats = useMemo(() => buildSavingsPageStats(filteredSavings), [filteredSavings])
  const isPrivacyMode = usePrivacyModeEnabled()

  const goalsById = useMemo(
    () =>
      goals.reduce<Record<number, GoalDto>>((accumulator, goal) => {
        accumulator[goal.id] = goal
        return accumulator
      }, {}),
    [goals],
  )

  const accountsById = useMemo(
    () =>
      paymentAccounts.reduce<Record<number, PaymentAccountDto>>((accumulator, account) => {
        accumulator[account.id] = account
        return accumulator
      }, {}),
    [paymentAccounts],
  )

  const handleDeleteSaving = useCallback(
    async (id: number, savingTitle: string) => {
      await toast.promise(deleteSavingMutation.mutateAsync(id), {
        loading: 'Deleting saving...',
        success: `Deleted ${savingTitle}`,
        error: (message) => (message instanceof Error ? message.message : 'Unable to delete saving'),
      })
    },
    [deleteSavingMutation],
  )

  const openCreateSheet = useCallback(() => {
    setEditingSavingId(null)
    setForm(getDefaultSavingForm())
    setIsSheetOpen(true)
  }, [])

  const openEditSaving = useCallback((saving: SavingDto) => {
    setEditingSavingId(saving.id)
    setForm({
      amount: saving.amount,
      note: saving.note ?? '',
      savedAt: toInputDate(saving.savedAt),
      goalId: saving.goalId ? String(saving.goalId) : 'none',
      paymentAccountId: saving.paymentAccountId ? String(saving.paymentAccountId) : 'none',
    })
    setIsSheetOpen(true)
  }, [])

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingSavingId(null)
      setForm(getDefaultSavingForm())
    }
  }

  async function handleSaveSaving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.amount.trim()) {
      toast.error('Amount is required')
      return
    }

    if (!form.savedAt) {
      toast.error('Date is required')
      return
    }

    const payload = {
      amount: form.amount.trim(),
      note: form.note.trim() || null,
      savedAt: toIsoDateAtNoon(form.savedAt),
      goalId: form.goalId === 'none' ? null : Number(form.goalId),
      paymentAccountId: form.paymentAccountId === 'none' ? null : Number(form.paymentAccountId),
    }

    if (isEditing && editingSavingId) {
      await toast.promise(
        updateSavingMutation.mutateAsync({
          id: editingSavingId,
          input: payload,
        }),
        {
          loading: 'Updating saving...',
          success: 'Saving updated',
          error: (message) => (message instanceof Error ? message.message : 'Unable to update saving'),
        },
      )
    } else {
      await toast.promise(
        createSavingMutation.mutateAsync({
          amount: payload.amount,
          note: payload.note ?? undefined,
          savedAt: payload.savedAt,
          goalId: payload.goalId,
          paymentAccountId: payload.paymentAccountId,
        }),
        {
          loading: 'Adding to savings...',
          success: 'Added to savings',
          error: (message) => (message instanceof Error ? message.message : 'Unable to add saving'),
        },
      )
    }

    setEditingSavingId(null)
    setForm(getDefaultSavingForm())
    setIsSheetOpen(false)
  }

  const savingsColumns = useMemo<ColumnDef<SavingDto>[]>(
    () => [
      {
        accessorKey: 'savedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => formatDate(row.original.savedAt),
        sortingFn: (first, second) =>
          new Date(first.original.savedAt).getTime() - new Date(second.original.savedAt).getTime(),
      },
      {
        id: 'amount',
        accessorFn: (row) => Number(row.amount),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => <SensitiveAmount amount={row.original.amount} currency={userCurrency} className="font-medium" />,
      },
      {
        id: 'goal',
        accessorFn: (row) => (row.goalId ? goalsById[row.goalId]?.title ?? 'Linked goal' : 'General'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Goal" />,
        cell: ({ row }) => {
          if (!row.original.goalId) {
            return <span className="text-sm opacity-70">General</span>
          }

          const goalTitle = goalsById[row.original.goalId]?.title ?? 'Linked goal'
          return <SensitiveText text={goalTitle} className="text-sm font-medium" />
        },
      },
      {
        id: 'account',
        accessorFn: (row) =>
          row.paymentAccountId ? formatPaymentAccountLabel(accountsById[row.paymentAccountId]) : '—',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
        cell: ({ row }) => {
          if (!row.original.paymentAccountId) {
            return <span className="text-sm opacity-70">—</span>
          }

          return (
            <span className="text-sm font-medium">
              {formatPaymentAccountLabel(accountsById[row.original.paymentAccountId])}
            </span>
          )
        },
      },
      {
        accessorKey: 'note',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Note" />,
        cell: ({ row }) => {
          const note = row.original.note?.trim()
          if (!note) return '—'
          return <SensitiveText text={note} />
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <div className="text-right">Actions</div>,
        meta: { cellClassName: 'w-[6.5rem]' },
        cell: ({ row }) => (
          <TableRowActions
            label={getSavingDeleteLabel(row.original)}
            onEdit={() => openEditSaving(row.original)}
            onDelete={() => void handleDeleteSaving(row.original.id, getSavingDeleteLabel(row.original))}
            isDeletePending={deleteSavingMutation.isPending}
          />
        ),
      },
    ],
    [accountsById, deleteSavingMutation.isPending, goalsById, handleDeleteSaving, openEditSaving, userCurrency, isPrivacyMode],
  )

  return (
    <main className="p-6 md:p-8">
      <section className="island-shell rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="display-title text-3xl">Savings</h1>
            <p className="mt-2 text-sm opacity-70">
              Track money moved into savings and link entries to goals or accounts.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateSheet}>
            <Plus className="size-4" />
            Add saving
          </Button>
        </div>

        {!isPending && !isError ? (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<PiggyBank className="size-4 text-violet-600" />}
              label="Total saved"
              value={formatSensitiveCurrency(pageStats.totalSaved, userCurrency, isPrivacyMode)}
              isSensitive
            />
            <StatCard
              icon={<Link2 className="size-4 text-sky-600" />}
              label="Linked to goals"
              value={formatSensitiveCurrency(pageStats.linkedToGoals, userCurrency, isPrivacyMode)}
              hint={`${pageStats.linkedEntryCount} linked entries`}
              isSensitive
            />
            <StatCard
              icon={<Wallet className="size-4 text-emerald-600" />}
              label="General savings"
              value={formatSensitiveCurrency(pageStats.generalSavings, userCurrency, isPrivacyMode)}
              hint="Not tied to a goal"
              isSensitive
            />
            <StatCard
              icon={<ReceiptText className="size-4 text-amber-600" />}
              label="Entries"
              value={String(pageStats.entryCount)}
            />
          </div>
        ) : null}

        {isPending ? (
          <div className="mt-5">
            <PageContentSkeleton showStats statCount={4} tableColumns={5} />
          </div>
        ) : null}
        {isError ? (
          <div className="mt-5">
            <PageErrorState message={error.message} />
          </div>
        ) : null}

        {!isPending && !isError ? (
          filteredSavings.length ? (
            <div className="mt-5">
              <DataTable
                columns={savingsColumns}
                data={filteredSavings}
                filterPlaceholder="Filter savings..."
                emptyMessage="No savings added yet."
                showPrivacyToggle
                initialSorting={[{ id: 'savedAt', desc: true }]}
              />
            </div>
          ) : (
            <div className="mt-5">
              <PageEmptyState
                message={
                  savings.length
                    ? 'No savings in the selected date range.'
                    : 'No savings yet. Add your first entry.'
                }
              />
            </div>
          )
        ) : null}

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Edit saving' : 'Add saving'}</SheetTitle>
              <SheetDescription>
                {isEditing ? 'Update this savings entry.' : 'Log money moved into savings.'}
              </SheetDescription>
            </SheetHeader>
            <form className="grid gap-4 px-4" onSubmit={handleSaveSaving}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Amount ({userCurrency})</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm((state) => ({ ...state, amount: event.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <DatePickerField
                id="saving-date"
                label="Date"
                value={form.savedAt}
                onChange={(savedAt) => setForm((state) => ({ ...state, savedAt }))}
              />
              <div className="grid gap-2">
                <label className="text-sm font-medium">Goal (optional)</label>
                <GoalSelect
                  value={form.goalId}
                  onValueChange={(value) => setForm((state) => ({ ...state, goalId: value }))}
                  goals={goals}
                />
              </div>
              <PaymentAccountSelect
                value={form.paymentAccountId}
                onValueChange={(value) => setForm((state) => ({ ...state, paymentAccountId: value }))}
                accounts={paymentAccounts}
                label="Saved to"
              />
              <div className="grid gap-2">
                <label className="text-sm font-medium">Note (optional)</label>
                <Input
                  value={form.note}
                  onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))}
                  placeholder="e.g. salary, gift"
                />
              </div>
              <SheetFooter className="px-0">
                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add saving'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </section>
    </main>
  )
}

interface GoalSelectProps {
  value: string
  onValueChange: (value: string) => void
  goals: GoalDto[]
  disabled?: boolean
}

/**
 * Select control for linking a savings entry to a goal.
 */
function GoalSelect({ value, onValueChange, goals, disabled }: GoalSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="General savings" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">General savings</SelectItem>
        {goals.map((goal) => (
          <SelectItem key={goal.id} value={String(goal.id)}>
            {goal.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function getDefaultSavingForm(): SavingFormState {
  return {
    amount: '',
    note: '',
    savedAt: format(new Date(), 'yyyy-MM-dd'),
    goalId: 'none',
    paymentAccountId: 'none',
  }
}

/**
 * Builds a human-friendly label for delete confirmations.
 */
function getSavingDeleteLabel(saving: { note: string | null; savedAt: string; amount: string }): string {
  if (saving.note?.trim()) return saving.note.trim()
  return `${formatDate(saving.savedAt)} · ${saving.amount}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

interface SavingFormState {
  amount: string
  note: string
  savedAt: string
  goalId: string
  paymentAccountId: string
}
