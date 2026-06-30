import { z } from 'zod'
import { CATEGORY_KINDS } from '#/features/categories/types/category'

export const saveGlobalAiSettingsSchema = z.discriminatedUnion('provider', [
  z.object({
    isEnabled: z.boolean(),
    provider: z.literal('ollama'),
    baseUrl: z.string().trim().url('Enter a valid URL'),
    model: z.string().trim().min(1, 'Model is required'),
    apiKey: z.string().trim().optional(),
  }),
  z.object({
    isEnabled: z.boolean(),
    provider: z.literal('gemini'),
    model: z.string().trim().min(1, 'Model is required'),
    apiKey: z.string().trim().optional(),
  }),
  z
    .object({
      isEnabled: z.boolean(),
      provider: z.literal('openrouter'),
      baseUrl: z.string().trim().url('Enter a valid URL'),
      model: z.string().trim().min(1, 'Model is required').optional(),
      models: z.array(z.string().trim().min(1, 'Model slug is required')).min(1).max(12).optional(),
      apiKey: z.string().trim().optional(),
    })
    .refine((data) => Boolean(data.model?.trim() || data.models?.length), {
      message: 'At least one model is required',
      path: ['models'],
    }),
])

export const updateGlobalCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  kind: z.enum(CATEGORY_KINDS).optional(),
})
