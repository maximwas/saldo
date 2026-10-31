'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { Switch } from '@/components/ui/switch.component'
import type { PushState } from '../hooks/push.hook'

type PushSettingsCardProps = {
  state: PushState
  onEnableAction: () => void
  onDisableAction: () => void
}

// Figma «Saldo» → «My reminders» 36:111531 · Card «Push» 36:111817: the Switch «Push on this device», what the state
// means (label), «Status: …» (caption). «Send a test» of the frame has no server route yet. The switch only works
// where the browser can ask: denied, iOS outside the Home Screen and no support leave it off and disabled.
export function PushSettingsCard({ state, onEnableAction, onDisableAction }: PushSettingsCardProps) {
  const translate = useTranslations('notifications.settings.push')
  const known = state !== 'checking'

  return (
    <Card title={translate('title')}>
      <div className="flex flex-col gap-4">
        <Switch
          label={translate('label')}
          className="w-60"
          checked={state === 'on'}
          disabled={state !== 'on' && state !== 'off'}
          onCheckedChange={(enabled) => (enabled ? onEnableAction() : onDisableAction())}
        />
        {known ? (
          <>
            <p className="text-label text-text-secondary">{translate(state)}</p>
            <p className="text-caption text-text-tertiary">
              {translate('status', { state: translate(`state.${state}`) })}
            </p>
          </>
        ) : null}
      </div>
    </Card>
  )
}
