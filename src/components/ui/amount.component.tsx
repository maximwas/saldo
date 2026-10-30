import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Amount 2:7789 (Kind × Size S 16 / M 22 / L 28 / XL 44); figures are tabular
const amountVariants = cva('whitespace-nowrap tabular-nums', {
  variants: {
    kind: {
      fact: 'text-text-primary',
      plan: 'text-text-secondary',
      income: 'text-positive-text',
      shortfall: 'text-negative-text',
      transfer: 'text-text-tertiary',
      reserve: 'text-reserve-text',
    },
    size: {
      s: 'text-body font-medium',
      m: 'font-display text-number-sm',
      l: 'font-display text-number',
      xl: 'font-display text-hero',
    },
  },
  defaultVariants: { kind: 'fact', size: 's' },
})

type AmountProps = VariantProps<typeof amountVariants> & {
  /** already formatted by src/lib/money; null = unknown sum, shown as «? ₴», never 0 */
  value: string | null
  /** currency sign for the unknown and hidden states */
  symbol: string
  /** «приховати суми» */
  hidden?: boolean
  className?: string
}

export function Amount({ value, symbol, hidden = false, kind, size, className }: AmountProps) {
  const unknown = value === null
  return (
    <span className={cn(amountVariants({ kind, size }), unknown && 'text-text-tertiary', className)}>
      {hidden ? `•••• ${symbol}` : unknown ? `? ${symbol}` : value}
    </span>
  )
}
