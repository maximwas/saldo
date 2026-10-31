import { Info, TriangleAlert, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Banner (2:36492 Info, 5:105803 Warning, 2:49340 Danger): padding 12/16, gap 12, radius inner, the
// 20 icon in a box with 2 px top/bottom so it sits on the first line, text body-medium. Danger draws Icon/wallet in
// Figma, copied as is.
const KINDS = {
  info: {
    Icon: Info,
    tone: 'bg-primary-soft text-primary-text',
  },
  warning: {
    Icon: TriangleAlert,
    tone: 'bg-warning-soft text-warning-text',
  },
  danger: {
    Icon: Wallet,
    tone: 'bg-negative-soft text-negative-text',
  },
} as const

type BannerProps = React.ComponentProps<'div'> & {
  kind?: keyof typeof KINDS
  /** Figma «Action box»: a text button at the end of the line, label-medium in the banner's colour */
  action?: React.ReactNode
}

// role="alert" for an error that appears after an action; a standing notice has none
export function Banner({ kind = 'info', className, children, action, ...props }: BannerProps) {
  const { Icon, tone } = KINDS[kind]

  return (
    <div className={cn('flex gap-3 rounded-inner px-4 py-3', tone, className)} {...props}>
      <span className="flex shrink-0 py-0.5">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="flex-1 text-body font-medium">{children}</p>
      {action && <span className="flex shrink-0 py-0.5 text-label font-medium">{action}</span>}
    </div>
  )
}
