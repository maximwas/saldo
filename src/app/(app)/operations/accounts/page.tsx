import { DynamicMarker } from '@/components/layout/dynamic-marker.component'
import { AccountsScreen } from '@/features/accounts/components/accounts-screen.component'

export default function AccountsPage() {
  return (
    <>
      <AccountsScreen />
      <DynamicMarker />
    </>
  )
}
