import Decimal from 'decimal.js'

const currencyFormat = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })

/** digits after the point: 2 for UAH, USD, EUR; Intl knows the ISO 4217 exponent of every currency */
export const minorDigits = (currency: string) =>
  currencyFormat(currency, 'en').resolvedOptions().maximumFractionDigits ?? 0

/** minor units → «1 234,56 ₴», «−800,00 €» in the active locale; Intl gets a decimal string, so no float touches the sum */
export function formatMinor(minor: bigint | number, currency: string, locale: string): string {
  const fractionDigits = minorDigits(currency)

  return currencyFormat(currency, locale)
    .format(`${minor}E-${fractionDigits}` as Intl.StringNumericLiteral)
    .replace('-', '\u2212')
}

/** typed amount («1 234,56», «−5.1») → integer minor units; null for text or more decimals than the currency has */
export function toMinor(text: string, currency: string): number | null {
  const normalized = text.replace(/\s/g, '').replace(',', '.').replace('\u2212', '-')

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const minor = new Decimal(normalized).times(Decimal.pow(10, minorDigits(currency)))

  if (!minor.isInteger() || !Number.isSafeInteger(minor.toNumber())) {
    return null
  }

  return minor.toNumber()
}

/** minor units → «1234.56» for an input field (no grouping, no symbol) */
export function fromMinor(minor: bigint | number, currency: string): string {
  const fractionDigits = minorDigits(currency)

  return new Decimal(minor.toString()).dividedBy(Decimal.pow(10, fractionDigits)).toFixed(fractionDigits)
}

/** «₴», «€», «$» for the unknown and hidden states of Amount */
export const currencySymbol = (currency: string, locale: string) =>
  currencyFormat(currency, locale)
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency
