'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Chip } from '@/components/ui/chip.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { Sheet } from '@/components/ui/sheet.component'
import type { ReminderRule, ReminderRulePatch } from '@/lib/reminders/reminder-rules.api'

const PRESET_OFFSETS = [7, 3, 1, 0]
const DEFAULT_TIME = '09:00'
const MAX_OFFSETS = 5

type ReminderRuleDialogProps = {
  rule: ReminderRule | null
  /** dd.MM and HH:mm of the next reminder of the rule as it is saved now; null when nothing is left to remind about */
  next: {
    date: string
    time: string
  } | null
  onSaveAction: (patch: ReminderRulePatch) => void
  onCloseAction: () => void
}

// Figma «Saldo» → Reminders · change rule 36:114263 (Dialog 480) / 36:114827 (BottomSheet): «Remind in» day chips that
// can be several, a required time field in the member's time zone, a note with the next reminder, Cancel / Save.
export function ReminderRuleDialog({ rule, next, onSaveAction, onCloseAction }: ReminderRuleDialogProps) {
  const translate = useTranslations('notifications.rules')
  const [offsets, setOffsets] = useState(rule?.offsetsDays ?? [0])
  const [time, setTime] = useState(rule?.atTime ?? DEFAULT_TIME)
  // an offset set elsewhere (a space default) stays visible even when it is not a preset
  const shown = [...new Set([...PRESET_OFFSETS, ...offsets])].sort((first, second) => second - first)
  const valid = time !== '' && offsets.length >= 1 && offsets.length <= MAX_OFFSETS

  const toggle = (days: number) =>
    setOffsets((current) => (current.includes(days) ? current.filter((item) => item !== days) : [...current, days]))

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('dialog.title')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('dialog.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              onSaveAction({
                offsetsDays: [...offsets].sort((first, second) => second - first),
                atTime: time,
                enabled: true,
              })
              onCloseAction()
            }}
          >
            {translate('dialog.save')}
          </Button>
        </>
      }
    >
      <p className="text-label font-medium text-text-secondary">{translate('dialog.days')}</p>
      <div className="flex flex-wrap gap-2">
        {shown.map((days) => (
          <Chip key={days} selected={offsets.includes(days)} onClick={() => toggle(days)}>
            {translate('offset', { days })}
          </Chip>
        ))}
      </div>
      <Field label={translate('dialog.time')} hint={translate('dialog.timeHint')} required>
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      </Field>
      <p className="text-caption text-text-tertiary">
        {next ? translate('dialog.note', next) : translate('dialog.noteNone')}
      </p>
    </Sheet>
  )
}
