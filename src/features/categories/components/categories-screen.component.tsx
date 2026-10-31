'use client'

import { Archive, GripVertical, Landmark, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Chip } from '@/components/ui/chip.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCategories, useReorderCategories, useUpdateCategory } from '../hooks/categories.hook'
import type { CategoryView } from '../utils/categories.utils'
import { buildCategoryTree, type CategoryKind, moveWithinSiblings } from '../utils/categories.utils'
import { ArchiveCategorySheet } from './archive-category-sheet.component'
import { CategoryFormSheet, type CategoryFormTarget } from './category-form-sheet.component'
import { CategoryRow } from './category-row.component'

// Figma «Saldo» → 2:49639 (desktop: list card 2/3 + «How it works» 1/3) / 2:50386 (mobile): kind switch with
// counts, one card with the tree and the archive under it. Counts of operations per category are not shown: they would
// need every operation of the space; the archive dialog counts only the category it is about.
// the line widths of the four rows in the loading frame
const LOADING_ROWS = [
  ['w-35', 'w-22.5'],
  ['w-42.5', 'w-27.5'],
  ['w-30', 'w-20'],
  ['w-37.5', 'w-25'],
] as const

const HOW = [
  {
    key: 'order',
    Icon: GripVertical,
  },
  {
    key: 'delete',
    Icon: Trash2,
  },
  {
    key: 'archive',
    Icon: Archive,
  },
  {
    key: 'taxes',
    Icon: Landmark,
  },
] as const

export function CategoriesScreen() {
  const translate = useTranslations('categories')
  const canWrite = useCanWrite()
  const { data, isPending, isError } = useCategories()
  const reorder = useReorderCategories()
  const update = useUpdateCategory()
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [form, setForm] = useState<CategoryFormTarget | null>(null)
  const [archiving, setArchiving] = useState<CategoryView | null>(null)

  if (isPending) {
    // Figma categories loading frame 2:56714: a card (padding 20, gap 20), a 120×20 title, four rows (gap 12) of a
    // 40 circle and two lines (16 and 12 high, radius xs)
    return (
      <SkeletonCard aria-busy className="gap-5 p-5">
        <Bone className="h-5 w-30 rounded-sm" />
        {LOADING_ROWS.map(([title, meta]) => (
          <div key={title} className="flex items-center gap-3">
            <Bone className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Bone className={`h-4 rounded-xs ${title}`} />
              <Bone className={`h-3 rounded-xs ${meta}`} />
            </div>
          </div>
        ))}
      </SkeletonCard>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const tree = buildCategoryTree(data)
  const nodes = tree[kind]
  const count = (target: CategoryKind) => tree[target].reduce((sum, node) => sum + 1 + node.children.length, 0)
  const archivedOfKind = tree.archived.filter((row) => row.kind === kind)
  const parentArchived = (row: CategoryView) =>
    data.some((parent) => parent.id === row.parentId && parent.archivedAt !== null)

  const move = (siblings: readonly CategoryView[], id: string, direction: 'up' | 'down') =>
    reorder.mutate(moveWithinSiblings(siblings, id, direction))

  const restore = (row: CategoryView) =>
    update.mutate({
      id: row.id,
      expectedVersion: row.version,
      patch: { archived_at: null },
    })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Figma 2:49639: the kind is a pair of chips, gap 8 */}
        <fieldset aria-label={translate('kindLabel')} className="flex items-center gap-2">
          {(['expense', 'income'] as const).map((value) => (
            <Chip key={value} selected={kind === value} onClick={() => setKind(value)}>
              {translate(`tabs.${value}`, { count: count(value) })}
            </Chip>
          ))}
        </fieldset>
        {canWrite ? (
          <Button
            onClick={() =>
              setForm({
                category: null,
                kind,
              })
            }
          >
            <Plus className="size-5" aria-hidden />
            {translate('new')}
          </Button>
        ) : null}
      </div>
      {/* Figma 2:49639: the list card grows, «How it works» keeps 400; both start at the top */}
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-6">
        <section className="flex w-full min-w-0 flex-col rounded-card bg-card px-5 py-5 shadow-card lg:flex-1 lg:px-6 lg:py-6">
          <h2 className="pb-2 text-card-title text-text-primary">{translate(`title.${kind}`)}</h2>
          {nodes.length === 0 ? (
            <p className="py-8 text-center text-label text-text-secondary">{translate('empty')}</p>
          ) : (
            <ul className="flex flex-col">
              {nodes.flatMap((node, position) => [
                <CategoryRow
                  key={node.id}
                  category={node}
                  canMoveUp={position > 0}
                  canMoveDown={position < nodes.length - 1}
                  onMoveAction={(direction) => move(nodes, node.id, direction)}
                  onEditAction={() =>
                    setForm({
                      category: node,
                      kind,
                    })
                  }
                  onArchiveAction={() => setArchiving(node)}
                />,
                ...node.children.map((child, childPosition) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    canMoveUp={childPosition > 0}
                    canMoveDown={childPosition < node.children.length - 1}
                    onMoveAction={(direction) => move(node.children, child.id, direction)}
                    onEditAction={() =>
                      setForm({
                        category: child,
                        kind,
                      })
                    }
                    onArchiveAction={() => setArchiving(child)}
                  />
                )),
              ])}
            </ul>
          )}
          {archivedOfKind.length > 0 ? (
            <div className="flex flex-col pt-6">
              <h3 className="pb-1 text-label font-semibold text-text-secondary">
                {translate('archiveTitle', { count: archivedOfKind.length })}
              </h3>
              <ul className="flex flex-col">
                {archivedOfKind.map((row) => (
                  <CategoryRow
                    key={row.id}
                    category={row}
                    archived
                    restoreDisabled={parentArchived(row)}
                    onRestoreAction={() => restore(row)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        {/* Figma Card 2:50042: tips gap 16, a 20 icon and label text-secondary, gap 12 */}
        <aside className="flex w-full flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:w-100 lg:shrink-0 lg:p-6">
          <h2 className="text-card-title text-text-primary">{translate('howTitle')}</h2>
          <ul className="flex flex-col gap-4 text-label text-text-secondary">
            {HOW.map(({ key, Icon }) => (
              <li key={key} className="flex gap-3">
                <Icon aria-hidden className="size-5 shrink-0" />
                {translate(`how.${key}`)}
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <CategoryFormSheet target={form} onCloseAction={() => setForm(null)} />
      <ArchiveCategorySheet category={archiving} onCloseAction={() => setArchiving(null)} />
    </>
  )
}
