import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Chip 2:7714: padding 8/12, gap 6, radius full, label-medium; every state keeps the 1px border so
// nothing jumps: Default border-strong (hover subtle, pressed border fill), Selected primary border + primary-soft + check
export const chipClass = (selected: boolean) =>
  cn(
    'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-label font-medium outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    selected
      ? 'border-primary bg-primary-soft text-primary-text'
      : 'border-border-strong text-text-primary hover:bg-subtle active:bg-border',
  )

type ChipProps = Omit<React.ComponentProps<'button'>, 'className'> & {
  selected: boolean
}

export function Chip({ selected, children, ...props }: ChipProps) {
  return (
    <button type="button" aria-pressed={selected} className={chipClass(selected)} {...props}>
      {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}
