import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { ProgressBar } from '#/components/feedback/add-progress-control'
import { TableRowActions } from '#/components/feedback/table-row-actions'
import { PageEmptyState, PageErrorState, PageContentSkeleton } from '#/components/feedback/page-state'
import { Button } from '#/components/ui/button'
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
import { useCreateWishlistMutation, useDeleteWishlistMutation, useUpdateWishlistMutation, useWishlistQuery } from '#/features/wishlist/hooks/use-wishlist'
import type { WishlistItemDto } from '#/features/wishlist/types/wishlist'
import {
  getDefaultWishlistForm,
  type WishlistFormState,
} from '#/features/wishlist/utils/wishlist-form'
import { parseLedgerAmount } from '#/features/shared/utils/amount'
import { SensitiveAmount } from '#/components/privacy/sensitive-amount'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface WishlistPageContentProps {
  userCurrency: string
}

/** Wishlist page: item table and create/edit sheet. */
export function WishlistPageContent({ userCurrency }: WishlistPageContentProps) {
  const { data: wishlist = [], isPending, isError, error } = useWishlistQuery()
  const createWishlistMutation = useCreateWishlistMutation()
  const updateWishlistMutation = useUpdateWishlistMutation()
  const deleteWishlistMutation = useDeleteWishlistMutation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [form, setForm] = useState<WishlistFormState>(getDefaultWishlistForm())

  const isEditing = editingItemId !== null
  const isSaving = createWishlistMutation.isPending || updateWishlistMutation.isPending

  const totalTargetAmount = useMemo(
    () => wishlist.reduce((accumulator, item) => accumulator + parseLedgerAmount(item.targetAmount), 0),
    [wishlist],
  )

  const isPrivacyMode = usePrivacyModeEnabled()

  const handleDeleteWishlistItem = useCallback(
    async (id: number, itemTitle: string) => {
      await toast.promise(deleteWishlistMutation.mutateAsync(id), {
        loading: 'Deleting wishlist item...',
        success: `Deleted ${itemTitle}`,
        error: (message) => (message instanceof Error ? message.message : 'Unable to delete wishlist item'),
      })
    },
    [deleteWishlistMutation],
  )

  const openCreateSheet = useCallback(() => {
    setEditingItemId(null)
    setForm(getDefaultWishlistForm())
    setIsSheetOpen(true)
  }, [])

  const openEditWishlistItem = useCallback((item: WishlistItemDto) => {
    setEditingItemId(item.id)
    setForm({
      title: item.title,
      targetAmount: item.targetAmount,
      currentAmount: item.currentAmount,
      priority: item.priority,
      status: item.status,
      note: item.note ?? '',
    })
    setIsSheetOpen(true)
  }, [])

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingItemId(null)
      setForm(getDefaultWishlistForm())
    }
  }

  const wishlistColumns = useMemo<ColumnDef<WishlistItemDto>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <SensitiveText text={row.original.title} />,
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => <span className="capitalize">{row.original.priority}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <span className="capitalize">{row.original.status}</span>,
      },
      {
        id: 'progress',
        enableSorting: false,
        header: () => 'Progress',
        meta: { cellClassName: 'min-w-[15rem]' },
        cell: ({ row }) => {
          const item = row.original
          return (
            <div>
              <p className="text-sm">
                <SensitiveAmount amount={item.currentAmount} currency={userCurrency} /> /{' '}
                <SensitiveAmount amount={item.targetAmount} currency={userCurrency} />
              </p>
              <ProgressBar
                current={parseLedgerAmount(item.currentAmount)}
                target={parseLedgerAmount(item.targetAmount)}
              />
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
            onEdit={() => openEditWishlistItem(row.original)}
            onDelete={() => void handleDeleteWishlistItem(row.original.id, row.original.title)}
            isDeletePending={deleteWishlistMutation.isPending}
          />
        ),
      },
    ],
    [deleteWishlistMutation.isPending, handleDeleteWishlistItem, openEditWishlistItem, userCurrency, isPrivacyMode],
  )

  async function handleSaveWishlistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.title.trim() || !form.targetAmount.trim()) {
      toast.error('Title and target amount are required')
      return
    }

    if (isEditing && editingItemId) {
      await toast.promise(
        updateWishlistMutation.mutateAsync({
          id: editingItemId,
          input: {
            title: form.title.trim(),
            targetAmount: form.targetAmount.trim(),
            currentAmount: form.currentAmount.trim() || '0',
            priority: form.priority,
            status: form.status,
            note: form.note.trim() || null,
          },
        }),
        {
          loading: 'Updating wishlist item...',
          success: 'Wishlist item updated',
          error: (message) => (message instanceof Error ? message.message : 'Unable to update wishlist item'),
        },
      )
    } else {
      await toast.promise(
        createWishlistMutation.mutateAsync({
          title: form.title.trim(),
          targetAmount: form.targetAmount.trim(),
          priority: form.priority,
        }),
        {
          loading: 'Adding wishlist item...',
          success: 'Wishlist item added',
          error: (message) => (message instanceof Error ? message.message : 'Unable to add wishlist item'),
        },
      )
    }

    setEditingItemId(null)
    setForm(getDefaultWishlistForm())
    setIsSheetOpen(false)
  }

  return (
    <main className="p-6 md:p-8">
      <section className="island-shell rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="display-title text-3xl">Wishlist</h1>
            <p className="mt-2 text-sm opacity-70">
              Things you want to buy. Use Edit to update saved progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">
              <SensitiveAmount amount={totalTargetAmount} currency={userCurrency} /> target
            </p>
            <Button className="gap-2" onClick={openCreateSheet}>
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
        </div>

        {isPending ? (
          <div className="mt-5">
            <PageContentSkeleton tableColumns={5} />
          </div>
        ) : null}
        {isError ? <div className="mt-5"><PageErrorState message={error.message} /></div> : null}

        {!isPending && !isError ? (
          wishlist.length ? (
            <div className="mt-5">
              <DataTable
                columns={wishlistColumns}
                data={wishlist}
                filterPlaceholder="Filter by title, priority, or status..."
                emptyMessage="No wishlist items yet."
                showPrivacyToggle
              />
            </div>
          ) : (
            <div className="mt-5"><PageEmptyState message="No wishlist items yet." /></div>
          )
        ) : null}

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Edit wishlist item' : 'Add wishlist item'}</SheetTitle>
              <SheetDescription>
                {isEditing ? 'Update item details and saved progress.' : 'Add something you want to save toward.'}
              </SheetDescription>
            </SheetHeader>
            <form className="grid gap-4 px-4" onSubmit={handleSaveWishlistItem}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
                  placeholder="e.g. New laptop"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Saved so far</label>
                    <Input
                      type="number"
                      value={form.currentAmount}
                      onChange={(event) => setForm((state) => ({ ...state, currentAmount: event.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) =>
                        setForm((state) => ({ ...state, priority: value as WishlistFormState['priority'] }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) =>
                        setForm((state) => ({ ...state, priority: value as WishlistFormState['priority'] }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((state) => ({ ...state, status: value as WishlistFormState['status'] }))
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
              ) : null}
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
                  {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add item'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </section>
    </main>
  )
}
