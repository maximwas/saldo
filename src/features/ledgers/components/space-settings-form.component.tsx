'use client'

import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { type SubmitEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { updateLedgerSettings } from '../api/access.api'
import type { LedgerSettings } from '../api/access.server'
import { updateLedgerSettingsInputSchema } from '../schemas/access.schema'

type Currency = (typeof CURRENCIES)[number]

type SpaceSettingsFormProps = {
  settings: LedgerSettings
}

const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]
// 2026-10-25 is a Sunday: index n is the weekday with week_starts_on = n
const SUNDAY = new Date(2026, 9, 25)

// ICU still lists Europe/Kiev, while the database default (and the IANA name) is Europe/Kyiv
const canonicalZone = (zone: string) => (zone === 'Europe/Kiev' ? 'Europe/Kyiv' : zone)

// Plan 1.13 / 1.18, owner only (ledgers RLS). Figma «Saldo» has no frame for it: the Card and fields follow the
// settings «General» tab (frame 11:72807) and the Select / Input / DateField primitives.
export function SpaceSettingsForm({ settings }: SpaceSettingsFormProps) {
  const router = useRouter()
  const translate = useTranslations('settings.space')
  const translateError = useTranslations('errors.db')
  const formatter = useFormatter()
  const [name, setName] = useState(settings.name)
  const [currency, setCurrency] = useState(settings.baseCurrency as Currency)
  const [timeZone, setTimeZone] = useState(canonicalZone(settings.timeZone))
  const [weekStartsOn, setWeekStartsOn] = useState(String(settings.weekStartsOn))
  const [nextIncomeOn, setNextIncomeOn] = useState(settings.nextIncomeOn)
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const zoneOptions = useMemo(() => {
    const zones = new Set(Intl.supportedValuesOf('timeZone').map(canonicalZone))

    zones.add(canonicalZone(settings.timeZone))

    return [...zones].sort().map((value) => ({
      value,
      label: value.replaceAll('_', ' '),
    }))
  }, [settings.timeZone])
  const weekOptions = WEEK_DAYS.map((value) => ({
    value: String(value),
    // Ukrainian weekday names are lowercase, a list label starts with a capital
    label: formatter
      .dateTime(new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + value), {
        weekday: 'long',
      })
      .replace(/^./u, (char) => char.toUpperCase()),
  }))

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = updateLedgerSettingsInputSchema.safeParse({
      ledgerId: settings.id,
      version: settings.version,
      name,
      baseCurrency: currency,
      timeZone,
      weekStartsOn: Number(weekStartsOn),
      nextIncomeOn,
    })

    if (!parsed.success) {
      setNameError(translate('nameRequired'))

      return
    }

    setIsPending(true)
    setNameError(null)
    setError(null)

    try {
      await updateLedgerSettings(getBrowserSupabase(), parsed.data)
      notify.success(translate('saved'))
      router.refresh()
    } catch (caught) {
      setError(translateError(toPgError(caught as { code?: string }).kind))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card title={translate('title')}>
      <form onSubmit={submit} noValidate className="flex max-w-120 flex-col gap-4">
        <Field label={translate('name')} error={nameError ?? undefined}>
          <Input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-medium text-text-secondary">{translate('baseCurrency')}</span>
          <SegmentedControl
            label={translate('baseCurrency')}
            options={CURRENCIES.map((value) => ({
              value,
              label: value,
            }))}
            value={currency}
            onValueChange={setCurrency}
          />
          <p className="text-caption text-text-tertiary">{translate('baseCurrencyHint')}</p>
        </div>
        <Field label={translate('timeZone')} hint={translate('timeZoneHint')}>
          <Select options={zoneOptions} value={timeZone} onValueChange={(value) => setTimeZone(value ?? timeZone)} />
        </Field>
        <Field label={translate('weekStartsOn')}>
          <Select
            options={weekOptions}
            value={weekStartsOn}
            onValueChange={(value) => setWeekStartsOn(value ?? weekStartsOn)}
          />
        </Field>
        <Field label={translate('nextIncomeOn')} hint={translate('nextIncomeHint')}>
          <DatePicker value={nextIncomeOn} onValueChange={setNextIncomeOn} clearable />
        </Field>
        {error ? (
          <p role="alert" className="text-caption text-negative-text">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending} className="cursor-pointer self-start">
          {translate('save')}
        </Button>
      </form>
    </Card>
  )
}
