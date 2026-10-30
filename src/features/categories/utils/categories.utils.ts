export const CATEGORY_KINDS = ['expense', 'income'] as const

export type CategoryKind = (typeof CATEGORY_KINDS)[number]

export type CategoryView = {
  id: string
  kind: CategoryKind
  parentId: string | null
  name: string
  color: string | null
  icon: string | null
  sortOrder: number
  archivedAt: string | null
  version: number
}

type CategoryNode = CategoryView & {
  /** active subcategories in order; the DB allows two levels at most, so a child has none of its own */
  children: CategoryView[]
}

export type CategoryTree = Record<CategoryKind, CategoryNode[]> & {
  /** every archived category, top-level or not, flat */
  archived: CategoryView[]
}

const bySortOrder = (first: CategoryView, second: CategoryView) =>
  first.sortOrder - second.sortOrder || first.name.localeCompare(second.name)

/** income and expense trees of active categories, plus the flat archive (Figma 2:49639) */
export function buildCategoryTree(rows: readonly CategoryView[]): CategoryTree {
  const active = rows.filter((row) => row.archivedAt === null)
  const tree: CategoryTree = {
    expense: [],
    income: [],
    archived: rows.filter((row) => row.archivedAt !== null).sort(bySortOrder),
  }

  for (const row of active.filter((candidate) => candidate.parentId === null).sort(bySortOrder)) {
    tree[row.kind].push({
      ...row,
      children: active.filter((child) => child.parentId === row.id).sort(bySortOrder),
    })
  }

  return tree
}

export type SortChange = {
  id: string
  version: number
  sortOrder: number
}

/** moves one category a place up or down among its siblings and renumbers them 1…n; only changed rows come back */
export function moveWithinSiblings(
  siblings: readonly CategoryView[],
  id: string,
  direction: 'up' | 'down',
): SortChange[] {
  const index = siblings.findIndex((sibling) => sibling.id === id)
  const target = direction === 'up' ? index - 1 : index + 1

  if (index === -1 || target < 0 || target >= siblings.length) {
    return []
  }

  const order = [...siblings]

  ;[order[index], order[target]] = [order[target], order[index]]

  return order
    .map((sibling, position) => ({
      id: sibling.id,
      version: sibling.version,
      sortOrder: position + 1,
      changed: sibling.sortOrder !== position + 1,
    }))
    .filter((entry) => entry.changed)
    .map(({ changed: _changed, ...change }) => change)
}

/** next sort_order among the siblings a new category joins */
export const nextCategorySortOrder = (siblings: readonly Pick<CategoryView, 'sortOrder'>[]) =>
  siblings.reduce((max, sibling) => Math.max(max, sibling.sortOrder), 0) + 1
