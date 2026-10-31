import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { SignOut } from '@/components/layout/sign-out.component'
import { SpaceCard } from '@/components/layout/space-card.component'
import { SpaceTiles } from '@/components/layout/space-tiles.component'
import { verifySession } from '@/lib/auth/dal.server'

// mobile Space tab (spec §2), Figma "Menu C · Space" 11:73245; on desktop the same content under the Sidebar
export default function SpacePage() {
  return (
    <>
      <SpaceCard />
      {/* server translations wait for the user's locale (a Supabase read) */}
      <Suspense>
        <SpaceTiles />
      </Suspense>
      <Suspense>
        <SignedInAs />
      </Suspense>
    </>
  )
}

// the session is request data: read inside <Suspense> so the shell stays instant (cacheComponents)
async function SignedInAs() {
  const [{ email }, translate] = await Promise.all([verifySession(), getTranslations('shell')])

  if (!email) {
    return null
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-caption text-text-tertiary">{translate('space.signedInAs', { email })}</p>
      <SignOut />
    </div>
  )
}
