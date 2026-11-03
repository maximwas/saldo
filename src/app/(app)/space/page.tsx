import { Suspense } from 'react'
import { AccountCard } from '@/components/layout/account-card.component'
import { SignOut } from '@/components/layout/sign-out.component'
import { SpaceCard } from '@/components/layout/space-card.component'
import { SpaceTiles } from '@/components/layout/space-tiles.component'

// mobile Space tab (spec §2), Figma "Menu C · Space" 11:73245: my account on top, then the space; on desktop the same
// content under the Sidebar
export default function SpacePage() {
  return (
    <>
      <AccountCard />
      <SpaceCard />
      {/* server translations wait for the user's locale (a Supabase read) */}
      <Suspense>
        <SpaceTiles />
      </Suspense>
      <div className="flex justify-center">
        <SignOut />
      </div>
    </>
  )
}
