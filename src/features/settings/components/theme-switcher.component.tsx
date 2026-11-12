'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useTransition } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { type AppTheme, THEMES } from '@/constants/theme.constants'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { saveTheme } from '../api/settings.actions'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const translate = useTranslations('settings')
  const [isPending, startTransition] = useTransition()
  // the server cannot know the device's theme (localStorage), so no option is selected until hydration
  const isClient = useHydrated()
  const options = THEMES.map((value) => ({
    value,
    label: translate(`themes.${value}`),
  }))

  const changeTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme)
    startTransition(async () => {
      await saveTheme(nextTheme)
    })
  }

  return (
    <SegmentedControl
      label={translate('themeTitle')}
      options={options}
      value={isClient ? (theme as AppTheme) : undefined}
      onValueChange={changeTheme}
      pending={isPending}
    />
  )
}
