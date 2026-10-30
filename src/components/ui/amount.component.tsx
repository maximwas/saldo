import { cva, type VariantProps } from 'class-variance-authority'
import { useLocale } from 'next-intl'
import { currencySymbol, formatMinor } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import { useUiStore } from '@/store/ui.store'

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
  /** overrides the device's «hide amounts» setting */
  hidden?: boolean
  className?: string
}

// masked («•••• ₴»), unknown («? ₴») or the formatted sum
function amountText(minor: AmountProps['minor'], currency: string, locale: string, masked: boolean) {
  const symbol = currencySymbol(currency, locale)

  if (masked) {
    return `•••• ${symbol}`
  }

  if (minor === null) {
    return `? ${symbol}`
  }

  return formatMinor(minor, currency, locale)
}

export function Amount({ minor, currency, hidden, kind, size, className }: AmountProps) {
  const locale = useLocale()
  const hideAmounts = useUiStore((state) => state.hideAmounts)

  return (
    <span
      className={cn(
        amountVariants({
          kind,
          size,
        }),
        minor === null && 'text-text-tertiary',
        // zero is neither income nor shortfall (Figma Amount rules)
        minor !== null && Number(minor) === 0 && (kind === 'income' || kind === 'shortfall') && 'text-text-primary',
        className,
      )}
    >
      {amountText(minor, currency, locale, hidden ?? hideAmounts)}
    </span>
  )
}
