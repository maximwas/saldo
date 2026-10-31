'use client'

import { GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'motion/react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'
import { Badge } from '@/components/ui/badge.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { Menu, type MenuItem } from '@/components/ui/menu.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { useCanWrite } from '@/contexts/ledger.context'
import type { CategoryView } from '../utils/categories.utils'

type CategoryRowProps = {
  category: CategoryView
  /** operations of the category; undefined = not loaded yet, the line stays empty */
  operations?: number
  archived?: boolean
  /** a subcategory of an archived category cannot come back alone */
  restoreDisabled?: boolean
  /** a drag handle and a Reorder.Item (the parent must be a Reorder.Group); the handle is the only drag start */
  sortable?: boolean
  /** reorder mode on phones: the «···» menu is hidden */
  menuHidden?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveAction?: (direction: 'up' | 'down') => void
  onDragEndAction?: () => void
  onEditAction?: () => void
  onArchiveAction?: () => void
  onRestoreAction?: () => void
  /** subcategories, listed under the row */
  subrows?: ReactNode
}

// Figma «Saldo» → CategoryRow 2:49893 (desktop 2:49639, mobile 2:50386): 64 high, gap 12, a 32×44 grip (when it can be
// dragged), badge 40, the name body-medium over a caption with the operation count in text-tertiary, the archive pill, «···» 44,
// border-bottom. The dragged row is raised (color-raised, radius-md, shadow-float, side padding 12: 35:104589).
export function CategoryRow({
  category,
  operations,
  archived = false,
  restoreDisabled = false,
  sortable = false,
  menuHidden = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveAction,
  onDragEndAction,
  onEditAction,
  onArchiveAction,
  onRestoreAction,
  subrows,
}: CategoryRowProps) {
  const translate = useTranslations('categories')
  const desktop = useIsDesktop()
  const canWrite = useCanWrite()
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)

  const items: MenuItem[] = archived
    ? [
        {
          label: translate('menu.restore'),
          onSelect: () => onRestoreAction?.(),
          disabled: restoreDisabled,
        },
      ]
    : [
        {
          label: translate('menu.up'),
          onSelect: () => onMoveAction?.('up'),
          disabled: !canMoveUp,
        },
        {
          label: translate('menu.down'),
          onSelect: () => onMoveAction?.('down'),
          disabled: !canMoveDown,
        },
        {
          label: translate('menu.edit'),
          onSelect: () => onEditAction?.(),
        },
        {
          label: translate('menu.delete'),
          onSelect: () => onArchiveAction?.(),
          danger: true,
        },
      ]

  function metaOf() {
    if (operations === undefined) {
      return null
    }

    if (archived) {
      const history = operations > 0 ? translate('meta.inHistory', { count: operations }) : null

      return desktop ? [translate('meta.hidden'), history].filter(Boolean).join(' · ') : history
    }

    return operations === 0 ? translate('meta.unused') : translate('meta.operations', { count: operations })
  }

  const meta = metaOf()
  const body = (
    <div className="flex min-h-16 items-center gap-3">
      {sortable ? (
        <button
          type="button"
          aria-label={translate('grip', { name: category.name })}
          onPointerDown={(event) => controls.start(event)}
          className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-5" />
        </button>
      ) : null}
      <CategoryBadge icon={category.icon} color={category.color} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-text-primary">{category.name}</span>
        {meta ? <span className="text-caption text-text-tertiary">{meta}</span> : null}
      </div>
      {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
      {canWrite && !menuHidden ? <Menu label={translate('menu.label')} items={items} /> : null}
    </div>
  )

  if (sortable) {
    return (
      <Reorder.Item
        as="li"
        value={category.id}
        dragListener={false}
        dragControls={controls}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => {
          setDragging(false)
          onDragEndAction?.()
        }}
        // the dragged row lifts like Figma 35:104602: raised card, radius-md, shadow-float, side padding 12
        className={`relative flex flex-col border-b border-border ${dragging ? 'z-10 rounded-md border-transparent bg-raised px-3 shadow-float' : 'bg-card'}`}
      >
        {body}
        {subrows}
      </Reorder.Item>
    )
  }

  return (
    <li className="flex flex-col border-b border-border">
      {body}
      {subrows}
    </li>
  )
}
