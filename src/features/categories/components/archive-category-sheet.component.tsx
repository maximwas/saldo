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
import { useArchiveCategory, useCategories, useCategoryOperationCount } from '../hooks/categories.hook'
import type { CategoryView } from '../utils/categories.utils'

// the screen shows the sheet only after the categories are loaded; the query cache hands the same rows over
const NO_CATEGORIES: readonly CategoryView[] = []

type ArchiveCategorySheetProps = {
  /** the category to archive; null = the sheet is closed */
  category: CategoryView | null
  onCloseAction: () => void
}

// Figma «Saldo» → 2:52713 / 2:53216: deleting never destroys operations — move them to another category (the catch-all by
// default) or archive; an archived category leaves the pickers, its history and statistics stay (spec §6).
// shortcut: «Delete and move» archives the emptied category (archive_category with a target): the database has no
// category delete yet; a real delete RPC would drop it from the «Archive» list too.
export function ArchiveCategorySheet({ category, onCloseAction }: ArchiveCategorySheetProps) {
  const translate = useTranslations('categories')
  const categories = useCategories().data ?? NO_CATEGORIES
  const archive = useArchiveCategory()
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

    archive.mutate(
      {
        id: category.id,
        moveTo: move ? target : null,
      },
      {
        onSuccess: () => {
          notify.success(translate('archive.done'))
          onCloseAction()
        },
      },
    )
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
          <Button type="button" variant="secondary" onClick={() => confirm(false)} disabled={archive.isPending}>
            {translate('archive.archiveOnly')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => confirm(true)}
            disabled={archive.isPending || operations.isPending}
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
