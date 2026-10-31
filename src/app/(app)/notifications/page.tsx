import { DynamicMarker } from '@/components/layout/dynamic-marker.component'
import { NotificationsScreen } from '@/features/notifications/components/notifications-screen.component'

export default function NotificationsPage() {
  return (
    <>
      <NotificationsScreen />
      <DynamicMarker />
    </>
  )
}
