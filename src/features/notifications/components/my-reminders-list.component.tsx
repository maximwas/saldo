'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { Bone } from '@/components/ui/skeleton.component'
import { useClock } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useDayText } from '@/lib/dates/day-text.hook'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { listMyReminders, type MyReminder } from '@/lib/reminders/reminder-rules.api'
import { nextReminder } from '@/lib/reminders/reminder-schedule.utils'
import { useReminderText } from '@/lib/reminders/reminder-text.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { localDate, localTime } from '@/lib/utils/clock.utils'
import { useHydrated } from '@/lib/utils/hydrated.hook'

// Figma «Saldo» → «My reminders» 36:111531 · Card 36:111834: ListItem rows, padding 12/0, gap 16: the logo, the title
// (body-medium) over «Subscription · 3 and 1 days before at 09:00» (label), the date of the next reminder at the end.
export function MyRemindersList() {
  const translate = useTranslations('notifications.settings.mine')
  const dayText = useDayText()
  const { now, timeZone } = useClock()
  const { summary } = useReminderText()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const { data } = useQuery({
    queryKey: ledgerQueryKey('reminder-rules', ledgerId, 'mine'),
    queryFn: () => listMyReminders(getBrowserSupabase(), ledgerId),
  })
  const hydrated = useHydrated()
  const moment = now()
  const rows = (data ?? [])
    .map((reminder: MyReminder) => ({
      reminder,
      next: nextReminder({
        dueDates: reminder.dueDates,
        offsetsDays: reminder.offsetsDays,
        atTime: reminder.atTime,
        today: localDate(moment, timeZone),
        nowTime: localTime(moment, timeZone),
      }),
    }))
    .filter((row) => row.next !== null)
    .sort((first, second) => (first.next?.date ?? '').localeCompare(second.next?.date ?? ''))

  // the server has no list: a skeleton until hydration and the first load, then the list or «none»
  if (!hydrated || data === undefined) {
    return (
      <Card title={translate('title')} className="h-full">
        <Bone aria-busy className="h-32 rounded-md" />
      </Card>
    )
  }

  return (
    <Card title={translate('title')} className="h-full">
      {rows.length === 0 ? (
        <p className="text-label text-text-secondary">{translate('empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ reminder, next }) => (
            <li key={reminder.sourceId} className="flex items-start gap-4 py-3">
              <ServiceLogo name={reminder.title} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-body font-medium text-text-primary">{reminder.title}</p>
                <p className="text-label text-text-secondary">
                  {translate(`kind.${reminder.sourceType}`)} ·{' '}
                  {summary(reminder.sourceType, reminder.offsetsDays, reminder.atTime)}
                </p>
              </div>
              <time className="text-label text-text-secondary" dateTime={next?.date}>
                {next ? dayText(next.date, 'short') : null}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
