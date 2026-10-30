'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useArchiveCategory, useCategoryOperationCount } from '../hooks/categories.hook'
import type { CategoryView } from '../utils/categories.utils'

// a sentinel for «do not move» in the Select
const KEEP = 'keep'

type ArchiveCategorySheetProps = {
  /** the category to archive; null = the sheet is closed */
  category: CategoryView | null
  categories: readonly CategoryView[]
  onCloseAction: () => void
}

// Figma «Saldo» → 2:49639, «How it works»: deleting never destroys operations — offer moving them to another
// category or archiving; an archived category leaves the pickers, its history and statistics stay (spec §6)
export function ArchiveCategorySheet({ category, categories, onCloseAction }: ArchiveCategorySheetProps) {
  const translate = useTranslations('categories')
  const archive = useArchiveCategory()
  const [moveTo, setMoveTo] = useState(KEEP)
  const family = category
    ? categories.filter((row) => row.id === category.id || row.parentId === category.id).map((row) => row.id)
    : []
  const operations = useCategoryOperationCount(family)
  // the new home: an active category of the same kind, outside the archived family
  const targets = category
    ? categories.filter((row) => row.archivedAt === null && row.kind === category.kind && !family.includes(row.id))
    : []
  const parentName = (row: CategoryView) => categories.find((parent) => parent.id === row.parentId)?.name

  const confirm = () => {
    if (!category) {
      return
    }

    archive.mutate(
      {
        id: category.id,
        moveTo: moveTo === KEEP ? null : moveTo,
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
          setMoveTo(KEEP)
          onCloseAction()
        }
      }}
      title={translate('archive.title', { name: category?.name ?? '' })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={archive.isPending || operations.isPending}>
            {translate('archive.confirm')}
          </Button>
        </>
      }
    >
      {category ? (
        <>
          <p className="text-label text-text-secondary">
            {translate('archive.summary', { count: operations.data ?? 0 })}
          </p>
          {operations.data ? (
            <Field label={translate('archive.moveTo')} hint={translate('archive.moveHint')}>
              <Select
                value={moveTo}
                onValueChange={(value) => setMoveTo(value ?? KEEP)}
                options={[
                  {
                    value: KEEP,
                    label: translate('archive.keep'),
                  },
                  ...targets.map((row) => ({
                    value: row.id,
                    label: row.parentId ? `${parentName(row)} › ${row.name}` : row.name,
                  })),
                ]}
              />
            </Field>
          ) : null}
          <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-body-medium text-primary-text">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            {translate('archive.info')}
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
