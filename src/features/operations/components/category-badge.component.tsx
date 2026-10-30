import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

// theme.css category tokens: the class names are spelled out so Tailwind sees them
const TONES: Record<string, string> = {
  blue: 'bg-cat-blue-soft text-cat-blue-text',
  green: 'bg-cat-green-soft text-cat-green-text',
  orange: 'bg-cat-orange-soft text-cat-orange-text',
  pink: 'bg-cat-pink-soft text-cat-pink-text',
  purple: 'bg-cat-purple-soft text-cat-purple-text',
  teal: 'bg-cat-teal-soft text-cat-teal-text',
  yellow: 'bg-cat-yellow-soft text-cat-yellow-text',
  red: 'bg-cat-red-soft text-cat-red-text',
  cyan: 'bg-cat-cyan-soft text-cat-cyan-text',
  lime: 'bg-cat-lime-soft text-cat-lime-text',
}
const NEUTRAL = 'bg-subtle text-text-secondary'

type CategoryBadgeProps = {
  name: string | null
  color: string | null
  /** a transfer is neutral (Figma CategoryIcon Color=neutral), never a category colour */
  transfer?: boolean
}

// Figma «Saldo» → CategoryIcon 2:7867: 40 square, radius md, soft tint with the text tone of the same colour.
// shortcut: the category icon names are not mapped to lucide yet, so the first letter stands in
export function CategoryBadge({ name, color, transfer = false }: CategoryBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md text-body font-semibold',
        transfer ? NEUTRAL : ((color && TONES[color]) ?? NEUTRAL),
      )}
    >
      {transfer ? <ArrowLeftRight size={20} /> : (name?.charAt(0).toUpperCase() ?? '·')}
    </span>
  )
}
