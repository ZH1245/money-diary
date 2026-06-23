import { PageEmptyState } from '#/components/feedback/page-state'
import { InlineError } from '#/components/feedback/inline-error'
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
import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { DeleteRowButton } from '#/components/feedback/delete-row-button'
import type { CategoryDto } from '#/features/categories/types/category'
import {
  CATEGORY_KIND_OPTIONS,
  getDefaultCategoryForm,
  type CategoryFormState,
} from '#/features/categories/utils/category-form'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import { Loader2, Plus, Tags } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'

/** Admin table and form for managing built-in categories shared by all users. */
export function AdminGlobalCategoriesSection() {
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [form, setForm] = useState<CategoryFormState>(getDefaultCategoryForm())

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/admin/categories', { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: CategoryDto[]
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to load global categories')
      }

      setCategories(payload.data ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load global categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const openCreateSheet = useCallback(() => {
    setForm(getDefaultCategoryForm())
    setIsSheetOpen(true)
  }, [])

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setForm(getDefaultCategoryForm())
    }
  }

  const slugPreview = useMemo(() => slugifyCategoryName(form.name.trim()), [form.name])

  const handleDeleteCategory = useCallback(async (id: number, categoryName: string) => {
    setIsDeletePending(true)
    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to delete category')
      }

      toast.success(`Deleted ${categoryName}`)
      await loadCategories()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete category')
    } finally {
      setIsDeletePending(false)
    }
  }, [loadCategories])

  const columns = useMemo<ColumnDef<CategoryDto>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        meta: { cellClassName: 'w-[28%]' },
      },
      {
        accessorKey: 'slug',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
        meta: { cellClassName: 'w-[28%]' },
      },
      {
        accessorKey: 'kind',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kind" />,
        meta: { cellClassName: 'w-[24%]' },
        cell: ({ row }) => <span className="capitalize">{row.original.kind}</span>,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <div className="text-right">Actions</div>,
        meta: { cellClassName: 'w-[4.5rem]' },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DeleteRowButton
              label={row.original.name}
              isPending={isDeletePending}
              onConfirm={() => void handleDeleteCategory(row.original.id, row.original.name)}
            />
          </div>
        ),
      },
    ],
    [handleDeleteCategory, isDeletePending],
  )

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      toast.error('Category name is required')
      return
    }

    const slug = slugifyCategoryName(trimmedName)
    if (!slug) {
      toast.error('Category name must include letters or numbers')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, slug, kind: form.kind }),
      })

      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to create category')
      }

      toast.success('Global category created')
      setForm(getDefaultCategoryForm())
      setIsSheetOpen(false)
      await loadCategories()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="feature-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Tags className="size-4 text-primary" />
            Global Categories
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Built-in categories appear for every user. Users can still create personal categories.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateSheet}>
          <Plus className="size-4" />
          Add global category
        </Button>
      </div>

      {errorMessage ? (
        <div className="mt-4">
          <InlineError message={errorMessage} />
        </div>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 className="size-4 animate-spin" />
            Loading categories...
          </div>
        ) : categories.length ? (
          <DataTable
            columns={columns}
            data={categories}
            filterPlaceholder="Filter by name, slug, or kind..."
            emptyMessage="No global categories found."
            fillWidth
            maxBodyHeight={undefined}
          />
        ) : (
          <PageEmptyState message="No global categories yet. Add one to share it with all users." />
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add global category</SheetTitle>
            <SheetDescription>This category will be visible to all users as a built-in option.</SheetDescription>
          </SheetHeader>

          <form className="grid gap-4 px-4" onSubmit={handleCreateCategory}>
            <div className="grid gap-2">
              <label htmlFor="global-category-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="global-category-name"
                value={form.name}
                onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="e.g. Netflix, Groceries"
                maxLength={120}
                disabled={isSubmitting}
                autoFocus
              />
              {slugPreview ? (
                <p className="text-xs text-muted-foreground">Slug: {slugPreview}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Slug is generated automatically from the name.</p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="global-category-kind" className="text-sm font-medium">
                Kind
              </label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, kind: value as CategoryFormState['kind'] }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="global-category-kind" className="w-full">
                  <SelectValue placeholder="Kind" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creating...' : 'Create category'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </article>
  )
}
