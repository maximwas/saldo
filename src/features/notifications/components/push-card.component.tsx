'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { usePush } from '../hooks/push.hook'

// No Figma frame (plan 3.6, 3.7): a card in the notification centre's style. The permission prompt appears only
// after a click on «Enable»; iOS gets the Home Screen explanation instead of a button that could not work.
export function PushCard() {
  const translate = useTranslations('notifications.push')
  const { state, enable, disable } = usePush(translate('failed'))

  if (state === 'checking') {
    return null
  }

  const actions = {
    off: (
      <Button type="button" onClick={() => void enable()}>
        {translate('enable')}
      </Button>
    ),
    on: (
      <Button type="button" variant="secondary" onClick={() => void disable()}>
        {translate('disable')}
      </Button>
    ),
  }

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-card p-4 shadow-card lg:p-5">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <h2 className="text-body font-semibold text-text-primary">{translate(`${state}.title`)}</h2>
        <p className="text-label text-text-secondary">{translate(`${state}.text`)}</p>
      </div>
      {state === 'off' || state === 'on' ? actions[state] : null}
    </section>
  )
}
