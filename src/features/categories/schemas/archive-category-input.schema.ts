import { z } from 'zod'

/** archive_category(p_id, p_move_to): moves the operations of the category and its subcategories, then archives them */
export const archiveCategoryInputSchema = z.object({
  id: z.uuid(),
  moveTo: z.uuid().nullable(),
})

export type ArchiveCategoryInput = z.infer<typeof archiveCategoryInputSchema>
