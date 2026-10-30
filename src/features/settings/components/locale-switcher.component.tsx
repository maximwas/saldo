'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { LOCALES } from '@/i18n/locale.utils'
import { cn } from '@/lib/utils/cn.utils'
import { setLocale } from '../api/settings.actions'

// Figma «Saldo» → SegmentedControl 2:7681: track subtle, padding 4, gap 4, radius md; the selected option is a card
// with shadow-card and label-semibold, the rest label-medium in text-secondary; options are 36 high, padding 8/16
export function LocaleSwitcher() {
  const activeLocale = useLocale()
  const translate = useTranslations('common.languages')
  const translateSettings = useTranslations('settings')
  const [isPending, startTransition] = useTransition()

  return (
    <fieldset
      aria-label={translateSettings('languageTitle')}
      aria-busy={isPending}
      className="flex w-fit items-center gap-1 rounded-md bg-subtle p-1"
    >
      {LOCALES.map((locale) => {
        const selected = locale === activeLocale

        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={selected}
            disabled={isPending}
            onClick={() => startTransition(() => setLocale(locale))}
            className={cn(
              'flex items-center justify-center rounded-logo-md px-4 py-2 text-label outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected ? 'bg-card font-semibold text-text-primary shadow-card' : 'font-medium text-text-secondary',
            )}
          >
            {translate(locale)}
          </button>
        )
      })}
    </fieldset>
  )
}
