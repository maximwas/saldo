import { describe, expect, it } from 'vitest'
import { buildCategoryTree, type CategoryView, moveWithinSiblings, orderChanges, toCategory } from './categories.utils'

const category = (patch: Partial<CategoryView> & Pick<CategoryView, 'id'>): CategoryView => ({
  kind: 'expense',
  parentId: null,
  name: patch.id,
  color: null,
  icon: null,
  sortOrder: 1,
  archivedAt: null,
  version: 1,
  ...patch,
})

describe('buildCategoryTree', () => {
  const rows = [
    category({
      id: 'cafe',
      sortOrder: 2,
    }),
    category({
      id: 'food',
      sortOrder: 1,
    }),
    category({
      id: 'market',
      parentId: 'food',
      sortOrder: 2,
    }),
    category({
      id: 'shops',
      parentId: 'food',
      sortOrder: 1,
    }),
    category({
      id: 'salary',
      kind: 'income',
    }),
    category({
      id: 'gifts',
      archivedAt: '2026-10-01T00:00:00Z',
    }),
  ]

  it('splits by kind, orders by sort_order and nests subcategories', () => {
    const tree = buildCategoryTree(rows)

    expect(tree.expense.map((node) => node.id)).toEqual(['food', 'cafe'])
    expect(tree.expense[0].children.map((child) => child.id)).toEqual(['shops', 'market'])
    expect(tree.income.map((node) => node.id)).toEqual(['salary'])
  })

  it('keeps archived categories out of the trees', () => {
    const tree = buildCategoryTree(rows)

    expect(tree.archived.map((row) => row.id)).toEqual(['gifts'])
    expect(tree.expense.some((node) => node.id === 'gifts')).toBe(false)
  })
})

describe('moveWithinSiblings', () => {
  const siblings = [
    category({
      id: 'a',
      sortOrder: 1,
    }),
    category({
      id: 'b',
      sortOrder: 2,
    }),
    category({
      id: 'c',
      sortOrder: 3,
    }),
  ]

  it('swaps a place and returns only the changed rows', () => {
    expect(moveWithinSiblings(siblings, 'c', 'up')).toEqual([
      {
        id: 'c',
        version: 1,
        sortOrder: 2,
      },
      {
        id: 'b',
        version: 1,
        sortOrder: 3,
      },
    ])
  })

  it('does nothing at the edges', () => {
    expect(moveWithinSiblings(siblings, 'a', 'up')).toEqual([])
    expect(moveWithinSiblings(siblings, 'c', 'down')).toEqual([])
  })

  it('renumbers siblings that share a sort_order', () => {
    const tied = [
      category({
        id: 'a',
        sortOrder: 0,
      }),
      category({
        id: 'b',
        sortOrder: 0,
      }),
    ]

    expect(moveWithinSiblings(tied, 'b', 'up')).toEqual([
      {
        id: 'b',
        version: 1,
        sortOrder: 1,
      },
      {
        id: 'a',
        version: 1,
        sortOrder: 2,
      },
    ])
  })
})

describe('toCategory', () => {
  it('maps columns to the view and keeps the parent and archive date null when unset', () => {
    expect(
      toCategory({
        id: 'c1',
        kind: 'income',
        parent_id: null,
        name: 'Salary',
        color: null,
        icon: 'banknote',
        sort_order: 3,
        archived_at: null,
        version: 2,
      }),
    ).toEqual({
      id: 'c1',
      kind: 'income',
      parentId: null,
      name: 'Salary',
      color: null,
      icon: 'banknote',
      sortOrder: 3,
      archivedAt: null,
      version: 2,
    })
  })
})

describe('orderChanges', () => {
  const siblings = ['a', 'b', 'c'].map((id, index) =>
    category({
      id,
      sortOrder: index + 1,
    }),
  )

  it('renumbers by the new order and keeps unchanged rows out', () => {
    expect(orderChanges(siblings, ['a', 'c', 'b'])).toEqual([
      {
        id: 'c',
        version: 1,
        sortOrder: 2,
      },
      {
        id: 'b',
        version: 1,
        sortOrder: 3,
      },
    ])
  })

  it('returns nothing for the same order', () => {
    expect(orderChanges(siblings, ['a', 'b', 'c'])).toEqual([])
  })
})
