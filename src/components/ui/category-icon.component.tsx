import { Tag } from 'lucide-react'
import { CATEGORY_TONES, type CategoryColor, NEUTRAL_TONE } from '@/constants/category-colors.constants'
import { CATEGORY_ICONS, type CategoryIconName } from '@/constants/category-icons.constants'
import { cn } from '@/lib/utils/cn.utils'

type CategoryIconProps = {
  /** a key of CATEGORY_ICONS; anything else (an old value, null) shows the tag */
  icon: string | null
  color: string | null
  /** 40 for a row, 32 for a subcategory (Figma CategoryIcon Size=40 / 32) */
  size?: 'md' | 'sm'
  className?: string
}

export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon as CategoryIconName] ?? Tag
  const tone = CATEGORY_TONES[color as CategoryColor] ?? NEUTRAL_TONE

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-10' : 'size-8',
        tone,
        className,
      )}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} />
    </span>
  )
}
