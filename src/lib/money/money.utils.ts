const currencyFormat = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })

/** minor units → «1 234,56 ₴» in the active locale; Intl gets a decimal string, so no float ever touches the sum */
export function formatMinor(minor: bigint | number, currency: string, locale: string): string {
  const format = currencyFormat(currency, locale)
  const fractionDigits = format.resolvedOptions().maximumFractionDigits ?? 0

  return format.format(`${minor}E-${fractionDigits}` as Intl.StringNumericLiteral)
}

/** «₴», «€», «$» for the unknown and hidden states of Amount */
export const currencySymbol = (currency: string, locale: string) =>
  currencyFormat(currency, locale)
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency
