import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → StatusPill 2:7738; a Kind maps to a tone:
// Plan → plan · Unknown → unknown · Unconfirmed → warning · Paid/Active/Returned → positive · Partial/Trial → info ·
// Reserve → reserve · Shortfall → negative · Estimate/Withheld/Paused → neutral · Archive/Cancelled/Written off → muted
const badgeVariants = cva(
  // padding 2/10, text/caption-medium; only Plan and Unknown carry a 1px border (24 high, the rest 22)
  'inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-medium',
  {
    variants: {
      tone: {
        plan: 'border border-border-strong text-text-secondary',
        unknown: 'border border-dashed border-border-strong bg-card text-text-secondary',
        warning: 'bg-warning-soft text-warning-text',
        positive: 'bg-positive-soft text-positive-text',
        info: 'bg-primary-soft text-primary-text',
        reserve: 'bg-reserve-soft text-reserve-text',
        negative: 'bg-negative-soft text-negative-text',
        neutral: 'bg-subtle text-text-secondary',
        muted: 'bg-subtle text-text-tertiary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

type BadgeProps = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>({ className: cn(badgeVariants({ tone }), className) }, props),
    render,
    state: {
      slot: 'badge',
      tone,
    },
  })
}
