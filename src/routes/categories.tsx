import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { PageEmptyState, PageErrorState, PageContentSkeleton, SessionLoadingSkeleton } from '#/components/feedback/page-state'
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
import { useCategoriesQuery, useCreateCategoryMutation } from '#/features/categories/hooks/use-categories'
import type { CategoryDto } from '#/features/categories/types/category'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import { authClient } from '#/lib/auth-client'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

const CATEGORY_KIND_OPTIONS = [
  { value: 'need', label: 'Need' },
  { value: 'want', label: 'Want' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
] as const

function CategoriesPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()

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
      <CategoriesContent userId={session.user.id} />
    </AuthenticatedAppShell>
  )
}

function CategoriesContent({ userId }: { userId: string }) {
  const { data: categories = [], isPending, isError, error } = useCategoriesQuery()
  const createCategoryMutation = useCreateCategoryMutation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [form, setForm] = useState<CategoryFormState>(getDefaultCategoryForm())

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

  const { personalCategories, globalCategories } = useMemo(() => {
    const personal = categories.filter((category) => Boolean(category.userId))
    const global = categories.filter((category) => !category.userId)
    return { personalCategories: personal, globalCategories: global }
  }, [categories])

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

    await toast.promise(
      createCategoryMutation.mutateAsync({
        name: trimmedName,
        slug,
        kind: form.kind,
      }),
      {
        loading: 'Creating category...',
        success: 'Category created',
        error: (message) => (message instanceof Error ? message.message : 'Unable to create category'),
      },
    )

    setForm(getDefaultCategoryForm())
    setIsSheetOpen(false)
  }

  return (
    <main className="p-6 md:p-8">
      <section className="island-shell rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="display-title text-3xl">Categories</h1>
            <p className="mt-2 text-sm opacity-70">
              Create your own categories for transactions. Built-in categories are shared for everyone.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateSheet}>
            <Plus className="size-4" />
            Add category
          </Button>
        </div>

        {isPending ? (
          <div className="mt-5">
            <PageContentSkeleton tableRows={6} tableColumns={3} />
          </div>
        ) : null}
        {isError ? (
          <div className="mt-5">
            <PageErrorState message={error.message} />
          </div>
        ) : null}

        {!isPending && !isError ? (
          <div className="mt-6 space-y-6">
            <CategoryTable title="Your categories" categories={personalCategories} userId={userId} emptyMessage="No personal categories yet." />
            <CategoryTable title="Built-in categories" categories={globalCategories} userId={userId} emptyMessage="No built-in categories found." />
          </div>
        ) : null}

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add category</SheetTitle>
              <SheetDescription>Create a personal category for your transactions.</SheetDescription>
            </SheetHeader>
            <form className="grid gap-4 px-4" onSubmit={handleCreateCategory}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                  placeholder="e.g. Gym, Pet care"
                  maxLength={120}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Kind</label>
                <Select
                  value={form.kind}
                  onValueChange={(value) => setForm((state) => ({ ...state, kind: value as CategoryDto['kind'] }))}
                >
                  <SelectTrigger className="w-full">
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
                <Button type="submit" disabled={createCategoryMutation.isPending} className="w-full">
                  {createCategoryMutation.isPending ? 'Creating...' : 'Add category'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </section>
    </main>
  )
}

interface CategoryTableProps {
  title: string
  categories: CategoryDto[]
  userId: string
  emptyMessage: string
}

function CategoryTable({ title, categories, userId, emptyMessage }: CategoryTableProps) {
  const columns = useMemo<ColumnDef<CategoryDto>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      },
      {
        accessorKey: 'kind',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kind" />,
        cell: ({ row }) => <span className="capitalize">{row.original.kind}</span>,
      },
      {
        id: 'scope',
        accessorFn: (row) => (row.userId === userId ? 'Yours' : 'Built-in'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
      },
    ],
    [userId],
  )

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">{title}</h2>
      {categories.length ? (
        <div className="mt-3">
          <DataTable
            columns={columns}
            data={categories}
            filterPlaceholder="Filter by name, kind, or scope..."
            emptyMessage={emptyMessage}
          />
        </div>
      ) : (
        <div className="mt-3">
          <PageEmptyState message={emptyMessage} />
        </div>
      )}
    </div>
  )
}

interface CategoryFormState {
  name: string
  kind: CategoryDto['kind']
}

function getDefaultCategoryForm(): CategoryFormState {
  return {
    name: '',
    kind: 'need',
  }
}
