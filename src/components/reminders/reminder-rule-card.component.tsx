'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { Switch } from '@/components/ui/switch.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useReminderRule } from '@/lib/reminders/reminder-rule.hook'
import type { ReminderRule, ReminderSourceType } from '@/lib/reminders/reminder-rules.api'
import { cn } from '@/lib/utils/cn.utils'

const PRESET_OFFSETS = [0, 1, 2, 3, 5, 7, 14]

type ReminderRuleCardProps = {
  sourceType: ReminderSourceType
  sourceId: string
}

type OffsetChipsProps = {
  rule: ReminderRule
  disabled: boolean
  onChangeAction: (offsets: number[]) => void
}

function OffsetChips({ rule, disabled, onChangeAction }: OffsetChipsProps) {
  const translate = useTranslations('notifications.rules')
  const selected = rule.offsetsDays
  // an offset set elsewhere (a space default) stays visible even when it is not a preset
  const offsets = [...new Set([...PRESET_OFFSETS, ...selected])].sort((first, second) => first - second)

  const toggle = (days: number) => {
    const next = selected.includes(days) ? selected.filter((item) => item !== days) : [...selected, days]

    // the table keeps 1..5 offsets: the last one goes away with the switch, not with the chip
    if (next.length >= 1 && next.length <= 5) {
      onChangeAction(next.sort((first, second) => second - first))
    }
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label={translate('offsets')}>
      {offsets.map((days) => (
        <li key={days}>
          <button
            type="button"
            aria-pressed={selected.includes(days)}
            disabled={disabled}
            onClick={() => toggle(days)}
            className={cn(
              'h-9 cursor-pointer rounded-full border px-3 text-label font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60',
              selected.includes(days)
                ? 'border-transparent bg-primary-soft text-primary-text'
                : 'border-border bg-card text-text-secondary',
            )}
          >
            {translate('offset', { days })}
          </button>
        </li>
      ))}
    </ul>
  )
}

// No Figma frame (plan 3.6): built from Switch 2:9645 and the filter chips of the notification centre 2:59946.
// §25 defaults are inserted by the database (subscriptions 3 and 2 days before, credits on the due day, debts none).
export function ReminderRuleCard({ sourceType, sourceId }: ReminderRuleCardProps) {
  const translate = useTranslations('notifications.rules')
  const canWrite = useCanWrite()
  const { rule, isLoading, isSaving, save } = useReminderRule(sourceType, sourceId)
  const locked = !canWrite || isLoading || isSaving

  return (
    <Card title={translate('title')}>
      <p className="text-label text-text-secondary">{translate(`hint.${sourceType}`)}</p>
      <Switch
        label={translate('enabled')}
        checked={rule?.enabled ?? false}
        disabled={locked}
        onCheckedChange={(enabled) => save(rule ?? null, { enabled })}
      />
      {rule?.enabled ? (
        <OffsetChips rule={rule} disabled={locked} onChangeAction={(offsetsDays) => save(rule, { offsetsDays })} />
      ) : null}
    </Card>
  )
}
