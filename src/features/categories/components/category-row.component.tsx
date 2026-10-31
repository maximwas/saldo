'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { Menu, type MenuItem } from '@/components/ui/menu.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CategoryView } from '../utils/categories.utils'

type CategoryRowProps = {
  category: CategoryView
  /** a subcategory: indented, small icon, no «add subcategory» */
  nested?: boolean
  subcategoryCount?: number
  archived?: boolean
  /** a subcategory of an archived category cannot come back alone */
  restoreDisabled?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveAction?: (direction: 'up' | 'down') => void
  onEditAction?: () => void
  onAddSubAction?: () => void
  onArchiveAction?: () => void
  onRestoreAction?: () => void
}

// Figma «Saldo» → 2:49639 / 2:50386: row 80 high (68 for a subcategory), icon 40 (32), name body-medium with
// a label-size line under it, «···» 44, border-bottom. Order is set from the menu («Up» / «Down»), not by dragging.
export function CategoryRow({
  category,
  nested = false,
  subcategoryCount = 0,
  archived = false,
  restoreDisabled = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveAction,
  onEditAction,
  onAddSubAction,
  onArchiveAction,
  onRestoreAction,
}: CategoryRowProps) {
  const translate = useTranslations('categories')
  const canWrite = useCanWrite()

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
        ...(nested
          ? []
          : [
              {
                label: translate('menu.addSub'),
                onSelect: () => onAddSubAction?.(),
              },
            ]),
        {
          label: translate('menu.archive'),
          onSelect: () => onArchiveAction?.(),
          danger: true,
        },
      ]

  return (
    // Figma CategoryRow: Top 64 high, Sub 52 with a 48 indent; gap 12; name body-medium (Sub body), meta caption tertiary
    <li className={cn('flex items-center gap-3 border-b border-border', nested ? 'min-h-13 pl-12' : 'min-h-16')}>
      <CategoryIcon icon={category.icon} color={category.color} size={nested ? 'sm' : 'md'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-body text-text-primary', !nested && 'font-medium')}>{category.name}</span>
        {subcategoryCount > 0 ? (
          <span className="text-caption text-text-tertiary">
            {translate('subcategories', { count: subcategoryCount })}
          </span>
        ) : null}
      </div>
      {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
      {canWrite ? <Menu label={translate('menu.label')} items={items} /> : null}
    </li>
  )
}
