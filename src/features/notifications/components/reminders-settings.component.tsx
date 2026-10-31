'use client'

import { useTranslations } from 'next-intl'
import { usePush } from '../hooks/push.hook'
import { MyRemindersList } from './my-reminders-list.component'
import { PushBanner } from './push-banner.component'
import { PushSettingsCard } from './push-settings-card.component'

type RemindersSettingsProps = {
  /** the member's own switch of this space's reminders (ledgers feature): features do not import each other */
  channelsCard: React.ReactNode
}

// Figma «Saldo» → «My reminders» 36:111531 (Desktop: two columns, gap 24) / 36:112024 (Mobile: one column): the push
// banner on top when push is off or blocked (36:112660, 36:112343), push on this device, then the rule list.
// «Time and quiet hours» of the frame needs a default time and quiet hours the database does not have.
export function RemindersSettings({ channelsCard }: RemindersSettingsProps) {
  const translate = useTranslations('notifications.push')
  const { state, enable, disable } = usePush(translate('failed'))

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PushBanner state={state} onEnableAction={() => void enable()} />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4 lg:gap-6">
          <PushSettingsCard state={state} onEnableAction={() => void enable()} onDisableAction={() => void disable()} />
          {channelsCard}
        </div>
        <MyRemindersList />
      </div>
    </div>
  )
}
