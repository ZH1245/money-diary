import { PageErrorState, PageContentSkeleton } from '#/components/feedback/page-state'
import { SearchableSelect } from '#/components/forms/searchable-select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { CategoryTable } from '#/features/categories/components/category-table'
import { useCategoriesQuery, useCreateCategoryMutation, useDeleteCategoryMutation } from '#/features/categories/hooks/use-categories'
import type { CategoryDto } from '#/features/categories/types/category'
import {
  CATEGORY_KIND_OPTIONS,
  getDefaultCategoryForm,
  type CategoryFormState,
} from '#/features/categories/utils/category-form'
import { slugifyCategoryName } from '#/features/categories/utils/category-slug'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CategoriesPageContentProps {
  userId: string
}

/** Categories page: personal and built-in tables plus create sheet. */
export function CategoriesPageContent({ userId }: CategoriesPageContentProps) {
  const { data: categories = [], isPending, isError, error } = useCategoriesQuery()
  const createCategoryMutation = useCreateCategoryMutation()
  const deleteCategoryMutation = useDeleteCategoryMutation()
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

  const handleDeleteCategory = useCallback(
    async (id: number, categoryName: string) => {
      await toast.promise(deleteCategoryMutation.mutateAsync(id), {
        loading: 'Deleting category...',
        success: `Deleted ${categoryName}`,
        error: (message) => (message instanceof Error ? message.message : 'Unable to delete category'),
      })
    },
    [deleteCategoryMutation],
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
            <CategoryTable
              title="Your categories"
              categories={personalCategories}
              userId={userId}
              emptyMessage="No personal categories yet."
              canDelete
              onDelete={handleDeleteCategory}
              isDeletePending={deleteCategoryMutation.isPending}
            />
            <CategoryTable
              title="Built-in categories"
              categories={globalCategories}
              userId={userId}
              emptyMessage="No built-in categories found."
            />
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
                <SearchableSelect
                  value={form.kind}
                  onValueChange={(value) => setForm((state) => ({ ...state, kind: value as CategoryDto['kind'] }))}
                  options={CATEGORY_KIND_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  placeholder="Kind"
                  searchPlaceholder="Search kinds..."
                  emptyMessage="No kinds found."
                />
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
