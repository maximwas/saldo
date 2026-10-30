'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore, useTransition } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { type AppTheme, THEMES } from '@/constants/theme.constants'
import { saveTheme } from '../api/settings.actions'

const subscribeNever = () => () => {}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const translate = useTranslations('settings')
  const [isPending, startTransition] = useTransition()
  // the server cannot know the device's theme (localStorage), so no option is selected until hydration
  const isClient = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
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
