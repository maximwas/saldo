import Decimal from 'decimal.js'

// narrow signs several currencies share: only the US dollar keeps «$», the others show their own («CAD», «CA$»)
const SHARED_SIGNS = new Set(['$', '¥', 'kr'])

function currencyFormat(currency: string, locale: string) {
  const narrow = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
  const sign = narrow.formatToParts(0).find((part) => part.type === 'currency')?.value ?? ''

  return currency === 'USD' || !SHARED_SIGNS.has(sign)
    ? narrow
    : new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      })
}

/** digits after the point: 2 for UAH, USD, EUR; Intl knows the ISO 4217 exponent of every currency */
export const minorDigits = (currency: string) =>
  currencyFormat(currency, 'en').resolvedOptions().maximumFractionDigits ?? 0

/** minor units → «1 234,56 ₴», «−800,00 €» in the active locale; Intl gets a decimal string, so no float touches the sum.
 * Text for CSV, MCP and the server; screen text goes through useMoneyText, which hides amounts */
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

const CURRENCY_NAMES = new Map<string, Intl.DisplayNames>()

/** «US dollar», «Polish zloty»: Intl's name of the currency in the active locale, capitalised as a row title */
export function currencyName(currency: string, locale: string) {
  // one Intl object per locale: the rates sheet names ~45 currencies on every keystroke of its search
  const names = CURRENCY_NAMES.get(locale) ?? new Intl.DisplayNames(locale, { type: 'currency' })

  CURRENCY_NAMES.set(locale, names)

  const name = names.of(currency) ?? currency

  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}

/** «₴», «€», «$» for the unknown and hidden states of Amount */
export const currencySymbol = (currency: string, locale: string) =>
  currencyFormat(currency, locale)
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency

/** screen text of a sum: masked «•••• ₴» («hide amounts»), unknown «? ₴» (never 0) or the formatted sum */
export function amountText(minor: bigint | number | null, currency: string, locale: string, hidden: boolean): string {
  const symbol = currencySymbol(currency, locale)

  if (hidden) {
    return `•••• ${symbol}`
  }

  if (minor === null) {
    return `? ${symbol}`
  }

  return formatMinor(minor, currency, locale)
}
