'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Switch } from '@/components/ui/switch.component'
import { useClock } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { useReminderRule } from '@/lib/reminders/reminder-rule.hook'
import type { ReminderRule, ReminderSourceType } from '@/lib/reminders/reminder-rules.api'
import { nextReminder } from '@/lib/reminders/reminder-schedule.utils'
import { useReminderText } from '@/lib/reminders/reminder-text.hook'
import { localDate, localTime } from '@/lib/utils/clock.utils'
import { ReminderRuleDialog } from './reminder-rule-dialog.component'

type ReminderRuleCardProps = {
  sourceType: ReminderSourceType
  sourceId: string
}

// Figma «Saldo» → Card «Reminders» 36:113504 (subscription 36:113156, credit 36:113529, debt 36:114048): the rule in
// words (body-medium), the next reminder (caption), Switch «Remind me», a small secondary «Change» that opens the
// dialog. §25 defaults are inserted by the database (subscriptions 3 and 2 days before, credits on the due day, debts none).
export function ReminderRuleCard({ sourceType, sourceId }: ReminderRuleCardProps) {
  const translate = useTranslations('notifications.rules')
  const formatter = useFormatter()
  const { now, timeZone } = useClock()
  const { summary } = useReminderText()
  const canWrite = useCanWrite()
  const { rule, dueDates, isLoading, isSaving, save } = useReminderRule(sourceType, sourceId)
  const [editing, setEditing] = useState(false)
  const locked = !canWrite || isLoading || isSaving
  const moment = now()
  const nextOf = (target: ReminderRule | null) =>
    target
      ? nextReminder({
          dueDates,
          offsetsDays: target.offsetsDays,
          atTime: target.atTime,
          today: localDate(moment, timeZone),
          nowTime: localTime(moment, timeZone),
        })
      : null
  const next = rule?.enabled ? nextOf(rule) : null
  const formatNext = (reminder: NonNullable<typeof next>) => ({
    date: formatter.dateTime(new Date(`${reminder.date}T12:00:00`), {
      day: '2-digit',
      month: '2-digit',
    }),
    time: reminder.time,
  })

  return (
    <Card title={translate('title')}>
      <div className="flex flex-col gap-3">
        {rule?.enabled ? (
          <>
            <p className="text-body font-medium text-text-primary first-letter:uppercase">
              {summary(sourceType, rule.offsetsDays, rule.atTime)}
            </p>
            {next ? <p className="text-caption text-text-tertiary">{translate('next', formatNext(next))}</p> : null}
          </>
        ) : (
          <p className="text-label text-text-secondary">{translate(`hint.${sourceType}`)}</p>
        )}
        <Switch
          label={translate('enabled')}
          checked={rule?.enabled ?? false}
          disabled={locked}
          onCheckedChange={(enabled) => save(rule ?? null, { enabled })}
        />
        <Button
          type="button"
          variant="secondary"
          size="s"
          disabled={locked}
          className="self-start"
          onClick={() => setEditing(true)}
        >
          {translate('change')}
        </Button>
      </div>
      {editing ? (
        <ReminderRuleDialog
          rule={rule ?? null}
          next={rule?.enabled ? next && formatNext(next) : null}
          onSaveAction={(patch) => save(rule ?? null, patch)}
          onCloseAction={() => setEditing(false)}
        />
      ) : null}
    </Card>
  )
}
