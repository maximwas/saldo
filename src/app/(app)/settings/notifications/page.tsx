import { Suspense } from 'react'
import { MyRemindersCard } from '@/features/ledgers/components/my-reminders-card.component'
import { RemindersSettings } from '@/features/notifications/components/reminders-settings.component'
import { verifySession } from '@/lib/auth/dal.server'

// Settings → Notifications (Figma «My reminders» 36:111531 / 36:112024): push on this device and the member's own reminders
export default function NotificationsSettingsPage() {
  return (
    <Suspense>
      <Reminders />
    </Suspense>
  )
}

async function Reminders() {
  const session = await verifySession()

  return <RemindersSettings channelsCard={<MyRemindersCard currentUserId={session.userId} />} />
}
