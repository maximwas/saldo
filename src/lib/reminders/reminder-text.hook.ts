import { useFormatter, useTranslations } from 'next-intl'
import type { ReminderSourceType } from './reminder-rules.api'

/** one rule in words, lower case: «3 and 1 days before and on the charge day at 09:00» in English */
export function useReminderText() {
  const translate = useTranslations('notifications.rules')
  const formatter = useFormatter()

  const offsets = (sourceType: ReminderSourceType, offsetsDays: number[]) => {
    const before = offsetsDays.filter((days) => days > 0).sort((first, second) => second - first)
    const parts = [
      before.length > 0
        ? translate('daysBefore', {
            list: formatter.list(before.map(String), { type: 'conjunction' }),
            days: before[before.length - 1],
          })
        : null,
      offsetsDays.includes(0) ? translate(`onDay.${sourceType}`) : null,
    ].filter((part) => part !== null)

    return parts.length === 2
      ? translate('and', {
          first: parts[0],
          second: parts[1],
        })
      : (parts[0] ?? '')
  }

  const summary = (sourceType: ReminderSourceType, offsetsDays: number[], atTime: string) =>
    translate('at', {
      offsets: offsets(sourceType, offsetsDays),
      time: atTime,
    })

  return {
    summary,
  }
}
