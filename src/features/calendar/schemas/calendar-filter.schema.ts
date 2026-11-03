import { z } from 'zod'

/** p_filter of calendar_entries; a saved set comes from the database: anything else than this shape is dropped, never
 * sent to the RPC. Without nuqs, so the server (MCP) takes the same filter as the screen */
export const calendarFilterSchema = z
  .object({
    entry: z.enum(['fact', 'plan']),
    kinds: z.array(z.string()),
    direction: z.enum(['in', 'out']),
    states: z.array(z.string()),
    source_types: z.array(z.string()),
    source_id: z.string(),
    category_ids: z.array(z.string()),
    account_ids: z.array(z.string()),
    currencies: z.array(z.string()),
    min_amount_minor: z.int(),
    max_amount_minor: z.int(),
    q: z.string(),
  })
  .partial()

export type CalendarFilter = z.infer<typeof calendarFilterSchema>
