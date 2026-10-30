'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
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
    return <div aria-busy className="h-96 rounded-card bg-subtle" />
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
        <SegmentedControl
          label={translate('kindLabel')}
          value={kind}
          onValueChange={setKind}
          options={[
            {
              value: 'expense',
              label: translate('tabs.expense', { count: count('expense') }),
            },
            {
              value: 'income',
              label: translate('tabs.income', { count: count('income') }),
            },
          ]}
        />
        {canWrite ? (
          <Button
            onClick={() =>
              setForm({
                category: null,
                kind,
                parentId: null,
              })
            }
          >
            <Plus className="size-5" aria-hidden />
            {translate('new')}
          </Button>
        ) : null}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <section className="flex flex-col rounded-card bg-card px-5 py-5 shadow-card lg:col-span-2 lg:px-6 lg:py-6">
          <h2 className="pb-2 text-card-title text-text-primary">{translate(`title.${kind}`)}</h2>
          {nodes.length === 0 ? (
            <p className="py-8 text-center text-label text-text-secondary">{translate('empty')}</p>
          ) : (
            <ul className="flex flex-col">
              {nodes.flatMap((node, position) => [
                <CategoryRow
                  key={node.id}
                  category={node}
                  subcategoryCount={node.children.length}
                  canWrite={canWrite}
                  canMoveUp={position > 0}
                  canMoveDown={position < nodes.length - 1}
                  onMoveAction={(direction) => move(nodes, node.id, direction)}
                  onEditAction={() =>
                    setForm({
                      category: node,
                      kind,
                      parentId: null,
                    })
                  }
                  onAddSubAction={() =>
                    setForm({
                      category: null,
                      kind,
                      parentId: node.id,
                    })
                  }
                  onArchiveAction={() => setArchiving(node)}
                />,
                ...node.children.map((child, childPosition) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    nested
                    canWrite={canWrite}
                    canMoveUp={childPosition > 0}
                    canMoveDown={childPosition < node.children.length - 1}
                    onMoveAction={(direction) => move(node.children, child.id, direction)}
                    onEditAction={() =>
                      setForm({
                        category: child,
                        kind,
                        parentId: node.id,
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
                    nested={row.parentId !== null}
                    canWrite={canWrite}
                    archived
                    restoreDisabled={parentArchived(row)}
                    onRestoreAction={() => restore(row)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        <aside className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
          <h2 className="text-card-title text-text-primary">{translate('howTitle')}</h2>
          <ul className="flex flex-col gap-3 text-label text-text-secondary">
            <li>{translate('how.order')}</li>
            <li>{translate('how.delete')}</li>
            <li>{translate('how.archive')}</li>
            <li>{translate('how.taxes')}</li>
          </ul>
        </aside>
      </div>
      <CategoryFormSheet target={form} categories={data} onCloseAction={() => setForm(null)} />
      <ArchiveCategorySheet category={archiving} categories={data} onCloseAction={() => setArchiving(null)} />
    </>
  )
}
