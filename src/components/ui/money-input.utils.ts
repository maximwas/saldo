import { toMinor } from '@/lib/money/money.utils'

/**
 * Numeric string from react-number-format ("1583.25", always a point) → integer minor units.
 * A half-typed "12." or ".5" is a valid step on the way to a number, so it parses; empty text is null.
 */
export function parseAmountText(text: string, currency: string): number | null {
  const trimmed = text.endsWith('.') ? text.slice(0, -1) : text
  const normalized = trimmed.startsWith('.') ? `0${trimmed}` : trimmed

  return toMinor(normalized, currency)
}
