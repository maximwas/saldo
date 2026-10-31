'use client'

import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch.component'
import { useUiStore } from '@/store/ui.store'

export function HideAmountsSwitch() {
  const translate = useTranslations('settings.privacy')
  const hideAmounts = useUiStore((state) => state.hideAmounts)
  const setHideAmounts = useUiStore((state) => state.setHideAmounts)

  return <Switch label={translate('hideAmounts')} checked={hideAmounts} onCheckedChange={setHideAmounts} />
}
