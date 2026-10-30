import { z } from 'zod'
import { CATEGORY_COLORS } from '@/constants/category-colors.constants'
import { CATEGORY_KINDS } from '../utils/categories.utils'
import type { CreateCategoryInput, UpdateCategoryInput } from './category-input.schema'

/** messages are keys of the errors namespace; FormField translates them */
export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(80, 'nameTooLong'),
  kind: z.enum(CATEGORY_KINDS),
  /** the top-level category a subcategory belongs to; null = a top-level category */
  parentId: z.uuid().nullable(),
  /** null = neutral */
  color: z.enum(CATEGORY_COLORS).nullable(),
  icon: z.string().nullable(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

type CreateCategoryContext = {
  id: string
  ledgerId: string
  sortOrder: number
}

/** ids are made before mutate, so a replay after reload carries the same idempotency key */
export const toCreateCategoryInput = (
  values: CategoryFormValues,
  context: CreateCategoryContext,
): CreateCategoryInput => ({
  id: context.id,
  ledger_id: context.ledgerId,
  kind: values.kind,
  parent_id: values.parentId,
  name: values.name.trim(),
  color: values.color,
  icon: values.icon,
  sort_order: context.sortOrder,
})

type UpdateTarget = {
  id: string
  expectedVersion: number
}

export const toUpdateCategoryInput = (values: CategoryFormValues, target: UpdateTarget): UpdateCategoryInput => ({
  id: target.id,
  expectedVersion: target.expectedVersion,
  patch: {
    name: values.name.trim(),
    color: values.color,
    icon: values.icon,
  },
})
