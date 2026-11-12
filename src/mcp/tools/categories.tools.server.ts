import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CATEGORY_COLORS } from '@/constants/category-colors.constants'
import {
  archiveCategory,
  createCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from '@/features/categories/api/categories.api'
import { categoryFormSchema, toCreateCategoryInput } from '@/features/categories/schemas/category-form.schema'
import { updateCategoryInputSchema } from '@/features/categories/schemas/category-input.schema'
import {
  CATEGORY_KINDS,
  type CategoryView,
  nextCategorySortOrder,
  orderChanges,
} from '@/features/categories/utils/categories.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, ledgerIdField, newIdField, spaceInput, versionField } from '../tool-input.schema'
import { required, ToolError } from '../tool-result.utils'
import { assertChanges } from '../write-checks.server'

export function registerCategoriesTools(server: McpServer) {
  registerReadTool(
    server,
    'list_categories',
    {
      title: 'Categories',
      description:
        'Income and expense categories of the space with ids, names and parents: use these ids in filters, never invent one.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { categories: await getCategories(supabase, ledger.id) } }),
  )
}

/** the DB triggers refuse it too (42501, migrations 20261103164941 and 20261111234432): this only says why first */
const SYSTEM_REFUSAL =
  'This is a system category («Підписки» or «Кредити»): Saldo never renames or archives it; its colour, icon and order can change.'

const categoryIdField = z.uuid().describe('From list_categories')
const categoryNameField = z.string().trim().min(1).max(80)
const iconField = z.string().max(40).describe('A Lucide icon name')

async function findCategory({ supabase, ledger }: ToolContext, id: string) {
  return required(
    (await getCategories(supabase, ledger.id)).find((item) => item.id === id),
    'No such category in this space: list_categories lists them.',
  )
}

const createCategoryArgs = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  kind: z.enum(CATEGORY_KINDS),
  name: categoryNameField,
  parent_id: z
    .uuid()
    .optional()
    .describe('A top-level category of the same kind: the new one becomes its subcategory (two levels at most)'),
  color: z.enum(CATEGORY_COLORS).optional(),
  icon: iconField.optional(),
  confirm: confirmField,
})

async function planCreateCategory(args: z.infer<typeof createCategoryArgs>, context: ToolContext): Promise<WritePlan> {
  const id = args.id ?? crypto.randomUUID()
  const values = categoryFormSchema.parse({
    name: args.name,
    kind: args.kind,
    parentId: args.parent_id ?? null,
    color: args.color ?? null,
    icon: args.icon ?? null,
  })
  const siblings = (await getCategories(context.supabase, context.ledger.id)).filter(
    (item) => item.kind === values.kind && item.parentId === values.parentId,
  )
  const input = toCreateCategoryInput(values, {
    id,
    ledgerId: context.ledger.id,
    sortOrder: nextCategorySortOrder(siblings),
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => createCategory(context.supabase, input),
  }
}

const updateCategoryArgs = z.object({
  ledger_id: ledgerIdField,
  category_id: categoryIdField,
  name: categoryNameField.optional(),
  color: z.enum(CATEGORY_COLORS).nullable().optional(),
  icon: iconField.nullable().optional(),
  restore: z.literal(true).optional().describe('true brings an archived category back'),
  version: versionField,
  confirm: confirmField,
})

async function planUpdateCategory(args: z.infer<typeof updateCategoryArgs>, context: ToolContext): Promise<WritePlan> {
  const category = await findCategory(context, args.category_id)

  if (category.systemKey && args.name !== undefined) {
    throw new ToolError('42501', SYSTEM_REFUSAL)
  }

  const patch = {
    name: args.name,
    color: args.color,
    icon: args.icon,
    archived_at: args.restore ? null : undefined,
  }

  assertChanges(patch)

  const input = updateCategoryInputSchema.parse({
    id: category.id,
    expectedVersion: category.version,
    patch,
  })

  return {
    willWrite: input,
    replayArgs: args,
    version: category.version,
    write: () => updateCategory(context.supabase, input),
  }
}

const archiveCategoryArgs = z.object({
  ledger_id: ledgerIdField,
  category_id: categoryIdField,
  move_to: z
    .uuid()
    .optional()
    .describe('A category of the same kind that takes over its operations and plans; none = they keep this one'),
  version: versionField,
  confirm: confirmField,
})

async function planArchiveCategory(
  args: z.infer<typeof archiveCategoryArgs>,
  context: ToolContext,
): Promise<WritePlan> {
  const category = await findCategory(context, args.category_id)

  if (category.systemKey) {
    throw new ToolError('42501', SYSTEM_REFUSAL)
  }

  const input = {
    id: category.id,
    moveTo: args.move_to ?? null,
  }

  return {
    willWrite: input,
    replayArgs: args,
    version: category.version,
    write: () => archiveCategory(context.supabase, input),
  }
}

const reorderArgs = z.object({
  ledger_id: ledgerIdField,
  ordered_ids: z
    .array(z.uuid())
    .min(2)
    .max(200)
    .describe('Every active category of one group (the same kind and parent) in the new order'),
  confirm: confirmField,
})

/** the active categories of the first id's group, in their current order */
function groupOf(categories: CategoryView[], first: CategoryView) {
  return categories
    .filter((item) => item.kind === first.kind && item.parentId === first.parentId && !item.archivedAt)
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
}

async function planReorder(args: z.infer<typeof reorderArgs>, context: ToolContext): Promise<WritePlan> {
  const categories = await getCategories(context.supabase, context.ledger.id)
  const first = required(
    categories.find((item) => item.id === args.ordered_ids[0]),
    'No such category in this space: list_categories lists them.',
  )
  const siblings = groupOf(categories, first)

  if (siblings.length !== args.ordered_ids.length || !siblings.every((item) => args.ordered_ids.includes(item.id))) {
    throw new ToolError(
      'invalid_input',
      `Give all ${siblings.length} active categories of this group, in the new order.`,
    )
  }

  const changes = orderChanges(siblings, args.ordered_ids)

  return {
    willWrite: { changes },
    replayArgs: args,
    write: () => reorderCategories(context.supabase, changes),
  }
}

/** the category form, «Archive» and «Up» / «Down» of the Categories screen */
export const CATEGORIES_WRITE_TOOLS = [
  confirmedWriteTool(
    'create_category',
    {
      title: 'Add a category',
      description: 'Adds an income or expense category, or a subcategory of a top-level one.',
      inputSchema: createCategoryArgs,
      destructive: false,
    },
    planCreateCategory,
  ),
  confirmedWriteTool(
    'update_category',
    {
      title: 'Change a category',
      description:
        'Renames a category, changes its colour or icon, or brings it back from the archive. The system «Підписки» and «Кредити» are never renamed.',
      inputSchema: updateCategoryArgs,
      destructive: true,
    },
    planUpdateCategory,
  ),
  confirmedWriteTool(
    'archive_category',
    {
      title: 'Archive a category',
      description:
        'Archives a category and its subcategories, optionally moving their operations and plans to move_to; nothing is deleted. The system «Підписки» and «Кредити» are never archived.',
      inputSchema: archiveCategoryArgs,
      destructive: true,
    },
    planArchiveCategory,
  ),
  confirmedWriteTool(
    'reorder_categories',
    {
      title: 'Reorder categories',
      description: 'Puts the categories of one group (the same kind and parent) in a new order.',
      inputSchema: reorderArgs,
      destructive: true,
    },
    planReorder,
  ),
]
