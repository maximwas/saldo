'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useOptimistic, useTransition } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { type AppLocale, LOCALES } from '@/i18n/locale.utils'
import { setLocale } from '../api/settings.actions'

export function LocaleSwitcher() {
  const activeLocale = useLocale() as AppLocale
  const translate = useTranslations('common.languages')
  const translateSettings = useTranslations('settings')
  const [isPending, startTransition] = useTransition()
  // the pill slides at once; the server action and the refresh with the new messages follow
  const [shownLocale, setShownLocale] = useOptimistic(activeLocale)
  const options = LOCALES.map((locale) => ({
    value: locale,
    label: translate(locale),
    lang: locale,
  }))

  const changeLocale = (locale: AppLocale) => {
    startTransition(async () => {
      setShownLocale(locale)
      await setLocale(locale)
    })
  }

  return (
    <SegmentedControl
      label={translateSettings('languageTitle')}
      options={options}
      value={shownLocale}
      onValueChange={changeLocale}
      pending={isPending}
    />
  )
}
