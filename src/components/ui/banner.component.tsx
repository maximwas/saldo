import { Info, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

type BannerProps = {
  kind: 'info' | 'danger'
  /** alert for an error that appears after an action; a standing notice has none */
  role?: 'alert'
  className?: string
  children: React.ReactNode
}

// Figma «Saldo» → Banner (2:36492 Info, 2:49340 Danger): padding 12/16, gap 12, radius inner, the 20 icon in a box with
// 2 px top/bottom so it sits on the first line, text body-medium. Danger draws Icon/wallet in Figma, copied as is.
const KINDS = {
  info: {
    Icon: Info,
    tone: 'bg-primary-soft text-primary-text',
  },
  danger: {
    Icon: Wallet,
    tone: 'bg-negative-soft text-negative-text',
  },
} as const

export function Banner({ kind, role, className, children }: BannerProps) {
  const { Icon, tone } = KINDS[kind]

  return (
    <div role={role} className={cn('flex gap-3 rounded-inner px-4 py-3', tone, className)}>
      <span className="flex shrink-0 py-0.5">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="flex-1 text-body font-medium">{children}</p>
    </div>
  )
}
