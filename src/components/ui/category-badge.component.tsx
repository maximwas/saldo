import { Tag } from 'lucide-react'
import { CATEGORY_SWATCHES, type CategoryColor, NEUTRAL_TONE } from '@/constants/category-colors.constants'
import { CATEGORY_ICONS, type CategoryIconName } from '@/constants/category-icons.constants'
import { cn } from '@/lib/utils/cn.utils'

type CategoryBadgeProps = {
  /** a key of CATEGORY_ICONS; anything else (an old value, null) shows the tag */
  icon: string | null
  /** null (no colour) keeps the neutral tile of a transfer */
  color: string | null
  /** 40 in mobile rows, 32 in the desktop table and in select fields and options */
  size?: 40 | 32
  className?: string
}

const SIZES = {
  40: {
    box: 'size-10',
    icon: 'size-5',
  },
  32: {
    box: 'size-8',
    icon: 'size-4',
  },
} as const

// Figma «Saldo» → CategoryBadge 29:89750: a circle in the category colour with a white Lucide icon, 40 (icon 20) or
// 32 (icon 16); a category without a colour keeps the neutral tile
export function CategoryBadge({ icon, color, size = 40, className }: CategoryBadgeProps) {
  const Icon = CATEGORY_ICONS[icon as CategoryIconName] ?? Tag
  const swatch = CATEGORY_SWATCHES[color as CategoryColor]

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        SIZES[size].box,
        swatch ? `${swatch} text-on-primary` : NEUTRAL_TONE,
        className,
      )}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  )
}
