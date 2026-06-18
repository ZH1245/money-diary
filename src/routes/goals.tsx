import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { ProgressBar } from '#/components/feedback/add-progress-control'
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
import { useCreateGoalMutation, useDeleteGoalMutation, useGoalsQuery, useUpdateGoalMutation } from '#/features/goals/hooks/use-goals'
import type { GoalDto } from '#/features/goals/types/goal'
import {
  buildGoalProgress,
  buildGoalsPageStats,
  buildLinkedSavingsByGoalId,
} from '#/features/goals/utils/goal-progress'
import { useSavingsQuery } from '#/features/savings/hooks/use-savings'
import { useAuthSession } from '#/lib/use-auth-session'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { SensitiveAmount } from '#/components/privacy/sensitive-amount'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { formatSensitiveCurrency, usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { toInputDate } from '#/lib/date-input'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleDollarSign, PiggyBank, Plus, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/goals')({
  component: GoalsPage,
})

function GoalsPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()
  const { data: goals = [], isPending, isError, error } = useGoalsQuery()
  const { data: savings = [] } = useSavingsQuery()
  const createGoalMutation = useCreateGoalMutation()
  const updateGoalMutation = useUpdateGoalMutation()
  const deleteGoalMutation = useDeleteGoalMutation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null)
  const [form, setForm] = useState<GoalFormState>(getDefaultGoalForm())

  const isEditing = editingGoalId !== null
  const isSaving = createGoalMutation.isPending || updateGoalMutation.isPending

  const linkedSavingsByGoalId = useMemo(() => buildLinkedSavingsByGoalId(savings), [savings])

  const pageStats = useMemo(
    () => buildGoalsPageStats(goals, linkedSavingsByGoalId),
    [goals, linkedSavingsByGoalId],
  )

  const userCurrency = ((session?.user as { currency?: string } | undefined)?.currency ?? DEFAULT_CURRENCY).toUpperCase()
  const isPrivacyMode = usePrivacyModeEnabled()

  const handleDeleteGoal = useCallback(
    async (id: number, goalTitle: string) => {
      await toast.promise(deleteGoalMutation.mutateAsync(id), {
        loading: 'Deleting goal...',
        success: `Deleted ${goalTitle}`,
        error: (message) => (message instanceof Error ? message.message : 'Unable to delete goal'),
      })
    },
    [deleteGoalMutation],
  )

  const openCreateSheet = useCallback(() => {
    setEditingGoalId(null)
    setForm(getDefaultGoalForm())
    setIsSheetOpen(true)
  }, [])

  const openEditGoal = useCallback((goal: GoalDto) => {
    setEditingGoalId(goal.id)
    setForm({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      savingsAmount: goal.savingsAmount,
      status: goal.status,
      targetDate: goal.targetDate ? toInputDate(goal.targetDate) : '',
      note: goal.note ?? '',
    })
    setIsSheetOpen(true)
  }, [])

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingGoalId(null)
      setForm(getDefaultGoalForm())
    }
  }

  const goalColumns = useMemo<ColumnDef<GoalDto>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <SensitiveText text={row.original.title} />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <span className="capitalize">{row.original.status}</span>,
      },
      {
        accessorKey: 'targetDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Target date" />,
        cell: ({ row }) => (row.original.targetDate ? formatDate(row.original.targetDate) : '—'),
        sortingFn: (first, second) => {
          const firstDate = first.original.targetDate ? new Date(first.original.targetDate).getTime() : 0
          const secondDate = second.original.targetDate ? new Date(second.original.targetDate).getTime() : 0
          return firstDate - secondDate
        },
      },
      {
        id: 'stillNeeded',
        accessorFn: (row) => buildGoalProgress(row, linkedSavingsByGoalId[row.id] ?? 0).stillNeeded,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Still needed" />,
        cell: ({ row }) => {
          const breakdown = buildGoalProgress(row.original, linkedSavingsByGoalId[row.original.id] ?? 0)
          if (breakdown.stillNeeded <= 0) {
            return <span className="text-sm font-medium text-emerald-600">Reached</span>
          }
          return <SensitiveAmount amount={breakdown.stillNeeded} currency={userCurrency} className="text-sm font-medium" />
        },
      },
      {
        id: 'progress',
        enableSorting: false,
        header: () => 'Combined progress',
        meta: { cellClassName: 'min-w-[16rem]' },
        cell: ({ row }) => {
          const goal = row.original
          const breakdown = buildGoalProgress(goal, linkedSavingsByGoalId[goal.id] ?? 0)
          return (
            <div>
              <p className="text-sm font-medium">
                <SensitiveAmount amount={breakdown.totalAchieved} currency={userCurrency} /> /{' '}
                <SensitiveAmount amount={breakdown.targetAmount} currency={userCurrency} />
              </p>
              <ProgressBar current={breakdown.totalAchieved} target={breakdown.targetAmount} />
              <p className="mt-1 text-xs opacity-70">
                {breakdown.progressAmount > 0 ? (
                  <>
                    <SensitiveAmount amount={breakdown.progressAmount} currency={userCurrency} /> logged
                  </>
                ) : (
                  'No logged progress'
                )}
                {breakdown.savingsForGoal > 0 ? (
                  <>
                    {' · '}
                    <SensitiveAmount amount={breakdown.savingsForGoal} currency={userCurrency} /> in savings
                  </>
                ) : null}
              </p>
            </div>
          )
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
            label={row.original.title}
            onEdit={() => openEditGoal(row.original)}
            onDelete={() => void handleDeleteGoal(row.original.id, row.original.title)}
            isDeletePending={deleteGoalMutation.isPending}
          />
        ),
      },
    ],
    [
      deleteGoalMutation.isPending,
      handleDeleteGoal,
      linkedSavingsByGoalId,
      openEditGoal,
      userCurrency,
      isPrivacyMode,
    ],
  )

  if (isSessionPending) return <SessionLoadingSkeleton />
  if (!session?.user) return <Navigate to="/sign-in" />

  async function handleSaveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.title.trim() || !form.targetAmount.trim()) {
      toast.error('Title and target amount are required')
      return
    }

    if (isEditing && editingGoalId) {
      await toast.promise(
        updateGoalMutation.mutateAsync({
          id: editingGoalId,
          input: {
            title: form.title.trim(),
            targetAmount: form.targetAmount.trim(),
            currentAmount: form.currentAmount.trim() || '0',
            savingsAmount: form.savingsAmount.trim() || '0',
            status: form.status,
            targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
            note: form.note.trim() || null,
          },
        }),
        {
          loading: 'Updating goal...',
          success: 'Goal updated',
          error: (message) => (message instanceof Error ? message.message : 'Unable to update goal'),
        },
      )
    } else {
      await toast.promise(
        createGoalMutation.mutateAsync({
          title: form.title.trim(),
          targetAmount: form.targetAmount.trim(),
          status: form.status,
          targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
        }),
        {
          loading: 'Creating goal...',
          success: 'Goal created',
          error: (message) => (message instanceof Error ? message.message : 'Unable to create goal'),
        },
      )
    }

    setEditingGoalId(null)
    setForm(getDefaultGoalForm())
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
          <h1 className="display-title text-3xl">Goals</h1>
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-sm opacity-70">
              Track long-term targets like Hajj or an emergency fund. Combined progress includes logged amounts,
              savings already set aside for the goal, and savings entries linked on the Savings page.
            </p>
            <Button className="shrink-0 gap-2" onClick={openCreateSheet}>
              <Plus className="size-4" />
              Add goal
            </Button>
          </div>

          {!isPending && !isError ? (
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={<Target className="size-4 text-sky-600" />}
                label="Active goals"
                value={String(pageStats.activeCount)}
              />
              <StatCard
                icon={<TrendingUp className="size-4 text-emerald-600" />}
                label="Combined achieved"
                value={formatSensitiveCurrency(pageStats.totalAchieved, userCurrency, isPrivacyMode)}
                hint="Progress + savings for active goals"
                isSensitive
              />
              <StatCard
                icon={<CircleDollarSign className="size-4 text-amber-600" />}
                label="Still needed"
                value={formatSensitiveCurrency(pageStats.totalStillNeeded, userCurrency, isPrivacyMode)}
                hint="Across active goals"
                isSensitive
              />
              <StatCard
                icon={<PiggyBank className="size-4 text-violet-600" />}
                label="Active target"
                value={formatSensitiveCurrency(pageStats.totalTarget, userCurrency, isPrivacyMode)}
                isSensitive
              />
            </div>
          ) : null}

          {isPending ? (
            <div className="mt-5">
              <PageContentSkeleton showStats statCount={4} tableColumns={6} />
            </div>
          ) : null}
          {isError ? <div className="mt-5"><PageErrorState message={error.message} /></div> : null}

          {!isPending && !isError ? (
            goals.length ? (
              <div className="mt-5">
                <DataTable
                  columns={goalColumns}
                  data={goals}
                  filterPlaceholder="Filter by title, status, or date..."
                  emptyMessage="No goals added yet."
                  showPrivacyToggle
                />
              </div>
            ) : (
              <div className="mt-5"><PageEmptyState message="No goals added yet." /></div>
            )
          ) : null}

          <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>{isEditing ? 'Edit goal' : 'Add goal'}</SheetTitle>
                <SheetDescription>
                  {isEditing
                    ? 'Update goal details. Set "In savings" for money already saved outside the ledger.'
                    : 'Create a new financial goal with a target amount and optional deadline.'}
                </SheetDescription>
              </SheetHeader>
              <form className="grid gap-4 px-4" onSubmit={handleSaveGoal}>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
                    placeholder="e.g. Emergency fund"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Target amount</label>
                  <Input
                    type="number"
                    value={form.targetAmount}
                    onChange={(event) => setForm((state) => ({ ...state, targetAmount: event.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Logged progress</label>
                      <Input
                        type="number"
                        value={form.currentAmount}
                        onChange={(event) => setForm((state) => ({ ...state, currentAmount: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">In savings</label>
                      <Input
                        type="number"
                        value={form.savingsAmount}
                        onChange={(event) => setForm((state) => ({ ...state, savingsAmount: event.target.value }))}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <DatePickerField
                    id="goal-target-date"
                    label="Target date"
                    value={form.targetDate}
                    onChange={(targetDate) => setForm((state) => ({ ...state, targetDate }))}
                    optional
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((state) => ({ ...state, status: value as GoalFormState['status'] }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isEditing ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Note (optional)</label>
                    <Input
                      value={form.note}
                      onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))}
                      placeholder="Any details"
                    />
                  </div>
                ) : null}
                <SheetFooter className="px-0">
                  <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add goal'}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

interface GoalFormState {
  title: string
  targetAmount: string
  currentAmount: string
  savingsAmount: string
  status: 'active' | 'paused' | 'completed'
  targetDate: string
  note: string
}

function getDefaultGoalForm(): GoalFormState {
  return {
    title: '',
    targetAmount: '',
    currentAmount: '0',
    savingsAmount: '0',
    status: 'active',
    targetDate: '',
    note: '',
  }
}
