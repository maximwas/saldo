import { Suspense } from 'react'
import { MyRemindersCard } from '@/features/ledgers/components/my-reminders-card.component'
import { verifySession } from '@/lib/auth/dal.server'

// Settings → Notifications (Figma tab 2:30905, no frame of its content): the member's own reminders of this space
export default function NotificationsSettingsPage() {
  return (
    <Suspense>
      <Reminders />
    </Suspense>
  )
}

async function Reminders() {
  const session = await verifySession()

  return <MyRemindersCard currentUserId={session.userId} />
}
