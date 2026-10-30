import { cva, type VariantProps } from 'class-variance-authority'
import { useLocale } from 'next-intl'
import { currencySymbol, formatMinor } from '@/lib/money/money.utils'
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
  defaultVariants: {
    kind: 'fact',
    size: 's',
  },
})

type AmountProps = VariantProps<typeof amountVariants> & {
  /** integer minor units (kopecks, cents); null = unknown sum, shown as «? ₴», never 0 */
  minor: bigint | number | null
  /** ISO 4217 code: UAH, EUR, USD */
  currency: string
  /** the «hide amounts» setting */
  hidden?: boolean
  className?: string
}

export function Amount({ minor, currency, hidden = false, kind, size, className }: AmountProps) {
  const locale = useLocale()
  const symbol = currencySymbol(currency, locale)

  return (
    <span
      className={cn(
        amountVariants({
          kind,
          size,
        }),
        minor === null && 'text-text-tertiary',
        className,
      )}
    >
      {hidden ? `•••• ${symbol}` : minor === null ? `? ${symbol}` : formatMinor(minor, currency, locale)}
    </span>
  )
}
