import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

const KINDS = {
  info: {
    Icon: Info,
    tone: 'bg-primary-soft text-primary-text',
  },
  warning: {
    Icon: TriangleAlert,
    tone: 'bg-warning-soft text-warning-text',
  },
}

type BannerProps = React.ComponentProps<'p'> & {
  kind?: keyof typeof KINDS
}

// Figma «Saldo» → Banner (refund 14:75142, offline 5:105803): padding 12/16, gap 12, radius inner, a 20 icon set 2 down
// from the top (Icon box), body-medium text
export function Banner({ kind = 'info', className, children, ...props }: BannerProps) {
  const { Icon, tone } = KINDS[kind]

  return (
    <p
      className={cn('flex items-start gap-3 rounded-inner px-4 py-3 text-body font-medium', tone, className)}
      {...props}
    >
      <Icon aria-hidden size={20} className="mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
    </p>
  )
}
