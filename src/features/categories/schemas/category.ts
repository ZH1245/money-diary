import { z } from 'zod'
import { CATEGORY_KINDS } from '#/features/categories/types/category'

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  kind: z.enum(CATEGORY_KINDS),
})
