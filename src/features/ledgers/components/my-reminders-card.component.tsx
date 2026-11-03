'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { Switch } from '@/components/ui/switch.component'
import { useMyNotifyChannels } from '../hooks/ledgers.hook'

type MyRemindersCardProps = {
  currentUserId: string
}

// No Figma frame (plan 3.8): one Switch 2:9645 in a Card. Every member decides for themselves, viewers included:
// off = no reminders of this space at all, on = in the app and as push (where the device has it).
export function MyRemindersCard({ currentUserId }: MyRemindersCardProps) {
  const translate = useTranslations('settings.access.reminders')
  const channels = useMyNotifyChannels(currentUserId)

  return (
    <Card title={translate('title')}>
      <p className="text-label text-text-secondary">{translate('hint')}</p>
      <Switch
        label={translate('label')}
        checked={channels.enabled}
        disabled={channels.isLoading || channels.isSaving}
        onCheckedChange={channels.save}
      />
    </Card>
  )
}
