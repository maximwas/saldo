import { createTranslator } from 'next-intl'
import { resolveLocale } from '@/i18n/locale.utils'
import { formatMinor } from '@/lib/money/money.utils'
import english from '../../../../messages/en/notifications.json'
import ukrainian from '../../../../messages/uk/notifications.json'

// the cron route has no request locale: each member gets the text in their own user_settings.locale
const MESSAGES = {
  uk: ukrainian,
  en: english,
}

export type ReminderTextInput = {
  locale: string | null
  direction: string
  daysBefore: number
  amountMinor: number | null
  currency: string
  customText: string | null
}

/** «due in 3 days · 349.00 UAH» in the member's locale; the rule's own text replaces it; an unknown amount (§7) is left out, never 0 */
export function reminderBody(input: ReminderTextInput): string {
  if (input.customText) {
    return input.customText
  }

  const locale = resolveLocale({
    settingsLocale: input.locale,
  })
  const translate = createTranslator({
    locale,
    messages: {
      notifications: MESSAGES[locale],
    },
    namespace: 'notifications.reminder',
  })
  const when = translate(input.direction === 'in' ? 'in' : 'out', {
    days: input.daysBefore,
  })

  if (input.amountMinor === null) {
    return when
  }

  return `${when} · ${formatMinor(input.amountMinor, input.currency, locale)}`
}

/** the click opens Upcoming payments with the payment dialog of this obligation, in its space */
export function reminderLinkPath(obligationId: string, ledgerId: string): string {
  return `/payments?pay=${obligationId}&ledger=${ledgerId}`
}
