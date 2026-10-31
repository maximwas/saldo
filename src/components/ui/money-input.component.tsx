import { useLocale } from 'next-intl'
import { useMemo, useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { currencySymbol, fromMinor, minorDigits } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import type { FieldControlProps } from './field.component'
import { parseAmountText } from './money-input.utils'

type MoneyInputProps = FieldControlProps & {
  /** integer minor units (kopiykas, cents); null while empty */
  value: number | null
  onValueChange: (minor: number | null) => void
  currency: string
  /** shown before the number, e.g. «−» for an expense; display only, the value stays positive */
  sign?: string
  disabled?: boolean
  name?: string
  placeholder?: string
  autoFocus?: boolean
  onBlur?: () => void
  ref?: React.Ref<HTMLInputElement>
  className?: string
}

const textFromMinor = (minor: number | null, currency: string) => (minor === null ? '' : fromMinor(minor, currency))

// Figma «Saldo» → MoneyInput 2:7642 (+ State=Error 5:91715): field 48 high like every field, padding 0/16, gap 8, radius md, number-sm
// text; Sign text-secondary, Value text-primary, Currency text-tertiary; Default 1px border-strong, Focus 2px primary,
// Error 2px negative. No Disabled variant in Figma: it follows Input (subtle fill, tertiary text).
export function MoneyInput({
  value,
  onValueChange,
  currency,
  sign,
  disabled,
  name,
  placeholder,
  autoFocus,
  onBlur,
  ref,
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: MoneyInputProps) {
  const locale = useLocale()
  const { group, decimal } = useMemo(() => {
    const parts = new Intl.NumberFormat(locale).formatToParts(1_234_567.5)

    return {
      group: parts.find((part) => part.type === 'group')?.value ?? ' ',
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? ',',
    }
  }, [locale])
  const [text, setText] = useState(() => textFromMinor(value, currency))

  // a value changed from outside (form reset, loaded record) replaces the text; the text the user is typing
  // ("12.") already maps to the same minor value, so it is left alone
  if (parseAmountText(text, currency) !== value) {
    setText(textFromMinor(value, currency))
  }

  return (
    <div
      data-invalid={invalid ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'flex h-12 w-full items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-number-sm ring-1 ring-transparent transition-colors focus-within:border-primary focus-within:ring-primary data-invalid:border-negative data-invalid:ring-negative data-disabled:bg-subtle data-disabled:text-text-tertiary',
        className,
      )}
    >
      {sign ? <span className="font-display text-text-secondary">{sign}</span> : null}
      <NumericFormat
        id={id}
        name={name}
        getInputRef={ref}
        value={text}
        valueIsNumericString
        thousandSeparator={group}
        decimalSeparator={decimal}
        allowedDecimalSeparators={['.', ',']}
        decimalScale={minorDigits(currency)}
        allowNegative={false}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onBlur={onBlur}
        onValueChange={(values, source) => {
          // react-number-format also reports prop-driven changes; only typing should reach the form
          if (source.source !== 'event') {
            return
          }

          setText(values.value)
          onValueChange(parseAmountText(values.value, currency))
        }}
        className="min-w-0 flex-1 bg-transparent font-display text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:text-text-tertiary"
      />
      <span className="font-display text-text-tertiary">{currencySymbol(currency, locale)}</span>
    </div>
  )
}
