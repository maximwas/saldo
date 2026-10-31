'use client'

import { Archive, GripVertical, Landmark, Plus, Trash2 } from 'lucide-react'
import { Reorder } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Chip } from '@/components/ui/chip.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useCanWrite } from '@/contexts/ledger.context'
import {
  useCategories,
  useCategoryOperationCounts,
  useReorderCategories,
  useUpdateCategory,
} from '../hooks/categories.hook'
import type { CategoryView } from '../utils/categories.utils'
import { buildCategoryTree, type CategoryKind, moveWithinSiblings, orderChanges } from '../utils/categories.utils'
import { ArchiveCategorySheet } from './archive-category-sheet.component'
import { CategoryFormSheet, type CategoryFormTarget } from './category-form-sheet.component'
import { CategoryRow } from './category-row.component'

// Figma «Saldo» → 2:49639 (desktop: list card 2/3 + «How it works» 1/3) / 2:50386 (mobile): kind switch with
// counts, one card with the tree and the archive under it. Order: desktop rows always have a grip and are dragged any
// time (35:104232), saved on drop; phones enter a mode with «Change order» (35:104589): grips on, «···», chips and
// the FAB hidden, «Cancel» / «Done» under the card. A category is added with the FAB on phones (2:50745).
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
  const desktop = useIsDesktop()
  const counts = useCategoryOperationCounts().data
  const [reordering, setReordering] = useState(false)
  // the order being dragged; it belongs to one kind and one snapshot of the list, a refetch drops it
  const [draft, setDraft] = useState<{
    kind: CategoryKind
    source: readonly CategoryView[]
    ids: string[]
  } | null>(null)
  const latestIds = useRef<string[]>([])

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
  const sortable = canWrite && nodes.length > 1 && (desktop || reordering)
  const draftIds = draft && draft.kind === kind && draft.source === data ? draft.ids : null
  const ids = draftIds ?? nodes.map((node) => node.id)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  const move = (siblings: readonly CategoryView[], id: string, direction: 'up' | 'down') =>
    reorder.mutate(moveWithinSiblings(siblings, id, direction))

  const restore = (row: CategoryView) =>
    update.mutate({
      id: row.id,
      expectedVersion: row.version,
      patch: { archived_at: null },
    })

  const dragTo = (next: string[]) => {
    latestIds.current = next
    setDraft({
      kind,
      source: data,
      ids: next,
    })
  }

  const save = (orderedIds: string[]) => {
    const changes = orderChanges(nodes, orderedIds)

    if (changes.length > 0) {
      reorder.mutate(changes, { onError: () => setDraft(null) })
    }
  }

  const finishReorder = (apply: boolean) => {
    if (apply && draftIds) {
      save(draftIds)
    }

    setDraft(null)
    setReordering(false)
  }

  const renderRow = (node: (typeof nodes)[number], position: number, rowSortable: boolean) => (
    <CategoryRow
      key={node.id}
      category={node}
      operations={counts?.[node.id] ?? (counts ? 0 : undefined)}
      sortable={rowSortable}
      menuHidden={reordering}
      canMoveUp={position > 0}
      canMoveDown={position < nodes.length - 1}
      onMoveAction={(direction) => move(nodes, node.id, direction)}
      // on phones the order is saved with «Done», on desktop at once
      onDragEndAction={desktop ? () => save(latestIds.current) : undefined}
      onEditAction={() =>
        setForm({
          category: node,
          kind,
        })
      }
      onArchiveAction={() => setArchiving(node)}
      subrows={
        node.children.length > 0 ? (
          <ul className="flex flex-col pl-12">
            {node.children.map((child, childPosition) => (
              <CategoryRow
                key={child.id}
                category={child}
                operations={counts?.[child.id] ?? (counts ? 0 : undefined)}
                menuHidden={reordering}
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
            ))}
          </ul>
        ) : null
      }
    />
  )

  const rows = ids.flatMap((id, position) => {
    const node = nodeById.get(id)

    return node ? [renderRow(node, position, sortable)] : []
  })

  const emptyList = <p className="py-8 text-center text-label text-text-secondary">{translate('empty')}</p>
  const sortableList = (
    <Reorder.Group as="ul" axis="y" values={ids} onReorder={dragTo} className="flex flex-col">
      {rows}
    </Reorder.Group>
  )
  const plainList = <ul className="flex flex-col">{rows}</ul>
  const listOf = () => {
    if (nodes.length === 0) {
      return emptyList
    }

    return sortable ? sortableList : plainList
  }
  const list = listOf()
  const reorderButtons = (
    <div className="flex items-center gap-3">
      <Button variant="secondary" className="flex-1" onClick={() => finishReorder(false)}>
        {translate('reorder.cancel')}
      </Button>
      <Button className="flex-1" onClick={() => finishReorder(true)}>
        {translate('reorder.done')}
      </Button>
    </div>
  )
  const reorderStart = (
    <Button variant="secondary" className="w-full" onClick={() => setReordering(true)}>
      <GripVertical className="size-5" aria-hidden />
      {translate('reorder.start')}
    </Button>
  )
  const reorderOf = () => {
    if (desktop || !canWrite || nodes.length < 2) {
      return null
    }

    return reordering ? reorderButtons : reorderStart
  }
  const reorderControls = reorderOf()

  return (
    <>
      {reordering ? null : (
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
            // phones add a category with the FAB (2:50745), so the button is desktop only
            <Button
              className="hidden lg:inline-flex"
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
      )}
      {/* Figma 2:49639: the list card grows, «How it works» keeps 400; both start at the top */}
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-6">
        <section className="flex w-full min-w-0 flex-col rounded-card bg-card px-5 py-5 shadow-card lg:flex-1 lg:px-6 lg:py-6">
          <h2 className="pb-2 text-card-title text-text-primary">{translate(`title.${kind}`)}</h2>
          {list}
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
                    operations={counts?.[row.id] ?? (counts ? 0 : undefined)}
                    archived
                    menuHidden={reordering}
                    restoreDisabled={parentArchived(row)}
                    onRestoreAction={() => restore(row)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        {/* Figma Card 2:50042: tips gap 16, a 20 icon and label text-secondary, gap 12; the mobile frame 2:50386 has none */}
        <aside className="hidden w-full flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:flex lg:w-100 lg:shrink-0 lg:p-6">
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
      {reorderControls}
      {!desktop && canWrite && !reordering ? (
        <button
          type="button"
          aria-label={translate('new')}
          onClick={() =>
            setForm({
              category: null,
              kind,
            })
          }
          className="fixed right-5 bottom-25 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus aria-hidden size={24} />
        </button>
      ) : null}
      <CategoryFormSheet target={form} onCloseAction={() => setForm(null)} />
      <ArchiveCategorySheet category={archiving} onCloseAction={() => setArchiving(null)} />
    </>
  )
}
