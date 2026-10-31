'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { Field } from '@/components/ui/field.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import {
  useArchiveCategory,
  useCategories,
  useCategoryOperationCount,
  useDeleteCategory,
} from '../hooks/categories.hook'
import type { CategoryView } from '../utils/categories.utils'

// the screen shows the sheet only after the categories are loaded; the query cache hands the same rows over
const NO_CATEGORIES: readonly CategoryView[] = []

type ArchiveCategorySheetProps = {
  /** the category to archive; null = the sheet is closed */
  category: CategoryView | null
  onCloseAction: () => void
}

// Figma «Saldo» → 2:52713 / 2:53216: deleting never destroys operations — «Delete and move» re-points them to another
// category (the catch-all by default) and deletes the category (RPC delete_category); «Archive» keeps it hidden from the
// pickers with its history and statistics (spec §6).
export function ArchiveCategorySheet({ category, onCloseAction }: ArchiveCategorySheetProps) {
  const translate = useTranslations('categories')
  const categories = useCategories().data ?? NO_CATEGORIES
  const archive = useArchiveCategory()
  const remove = useDeleteCategory()
  const [moveTo, setMoveTo] = useState<string | null>(null)
  const family = category
    ? categories.filter((row) => row.id === category.id || row.parentId === category.id).map((row) => row.id)
    : []
  const operations = useCategoryOperationCount(family)
  // the new home: an active category of the same kind, outside the archived family
  const targets = category
    ? categories.filter((row) => row.archivedAt === null && row.kind === category.kind && !family.includes(row.id))
    : []
  // the defaults' catch-all («Other») carries the ellipsis icon (Figma 13:74335)
  const target = moveTo ?? (targets.find((row) => row.icon === 'ellipsis') ?? targets.at(-1))?.id ?? null

  const confirm = (move: boolean) => {
    if (!category) {
      return
    }

    const input = {
      id: category.id,
      moveTo: move ? target : null,
    }
    const onSuccess = () => {
      notify.success(translate(move ? 'archive.deleted' : 'archive.done'))
      onCloseAction()
    }

    if (move) {
      remove.mutate(input, { onSuccess })
    } else {
      archive.mutate(input, { onSuccess })
    }
  }

  return (
    <Sheet
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) {
          setMoveTo(null)
          onCloseAction()
        }
      }}
      title={translate('archive.title', { name: category?.name ?? '' })}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => confirm(false)}
            disabled={archive.isPending || remove.isPending}
          >
            {translate('archive.archiveOnly')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => confirm(true)}
            disabled={archive.isPending || remove.isPending || operations.isPending}
          >
            {translate('archive.confirm')}
          </Button>
        </>
      }
    >
      {category ? (
        <>
          <p className="text-body text-text-secondary">
            {translate('archive.summary', { count: operations.data ?? 0 })}
          </p>
          {operations.data ? (
            <Field label={translate('archive.moveTo')}>
              <Select
                value={target}
                onValueChange={setMoveTo}
                options={targets.map((row) => ({
                  value: row.id,
                  label: row.name,
                  leading: <CategoryBadge icon={row.icon} color={row.color} size={32} />,
                }))}
              />
            </Field>
          ) : null}
          <p className="flex gap-3 rounded-inner bg-primary-soft px-4 py-3 text-body-medium text-primary-text">
            <span className="py-0.5">
              <Info className="size-5 shrink-0" aria-hidden />
            </span>
            <span className="flex-1">{translate('archive.info')}</span>
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
