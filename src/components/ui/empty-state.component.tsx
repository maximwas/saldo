import type { LucideIcon } from 'lucide-react'
import { NEUTRAL_TONE } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'

// Figma CategoryIcon colours through the soft / text variables (cat-blue = primary, cat-red = negative in both themes)
const TONES = {
  blue: 'bg-cat-blue-soft text-cat-blue-text',
  green: 'bg-cat-green-soft text-cat-green-text',
  pink: 'bg-cat-pink-soft text-cat-pink-text',
  red: 'bg-cat-red-soft text-cat-red-text',
  yellow: 'bg-cat-yellow-soft text-cat-yellow-text',
  neutral: NEUTRAL_TONE,
} as const

type EmptyStateProps = {
  icon: LucideIcon
  tone: keyof typeof TONES
  title: React.ReactNode
  hint?: React.ReactNode
  /** one or two buttons, centred in a row */
  action?: React.ReactNode
  /** already inside a card: no card of its own */
  bare?: boolean
  /** of the title and hint, e.g. alert for ErrorState */
  role?: React.AriaRole
  className?: string
}

// Figma «Saldo» → EmptyState 2:10027 (Feedback, Design System): a column, padding 8, gap 12, of the CategoryIcon 40, the
// body-semibold title, the label text and one Secondary button; in a card it pads 40/16 (64/32 on desktop) around a
// 480 column, as in the load-error frames 39:105552.
export function EmptyState({ icon: Icon, tone, title, hint, action, bare = false, role, className }: EmptyStateProps) {
  const column = (
    <div className={cn('flex w-full flex-col items-center gap-3 p-2 text-center', bare ? className : 'max-w-120')}>
      <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', TONES[tone])}>
        <Icon className="size-5" />
      </span>
      <div role={role} className="flex flex-col gap-3 self-stretch">
        <h2 className="text-body font-semibold text-text-primary">{title}</h2>
        {hint ? <p className="text-label text-text-secondary">{hint}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )

  if (bare) {
    return column
  }

  return (
    <section
      className={cn(
        'flex flex-col items-center rounded-card bg-card px-4 py-10 shadow-card lg:px-8 lg:py-16',
        className,
      )}
    >
      {column}
    </section>
  )
}
