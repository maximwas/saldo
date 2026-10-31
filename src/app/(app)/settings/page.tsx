import { Banknote, Bell, Database, Settings, Users } from 'lucide-react'
import type { Route } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Card } from '@/components/ui/card.component'
import { CurrenciesSummary } from '@/features/currencies/components/currencies-summary.component'
import { getMembers, getPendingInvites } from '@/features/ledgers/api/access.server'
import { LeaveSpaceButton } from '@/features/ledgers/components/leave-space-button.component'
import { memberName } from '@/features/ledgers/utils/members.utils'
import { SettingsLink } from '@/features/settings/components/settings-link.component'
import { getActiveLedger, verifySession } from '@/lib/auth/dal.server'
import GeneralSettingsPage from './general/page'

// Phones: the section list (Figma 2:35769, read only 2:47206); desktop: the General tab (11:72807), as /settings/general
export default function SettingsPage() {
  return (
    <>
      <Suspense>
        <SettingsSections />
      </Suspense>
      <div className="max-lg:hidden">
        <GeneralSettingsPage />
      </div>
    </>
  )
}

// Figma 2:35785: padding 4/20/32 (the shell's), gap 16: Info Banner for a viewer, Card «Space «…»» with the rows, Leave
// space for a member who is not the owner, the signed-in line. Security has no feature yet, so its row is left out.
async function SettingsSections() {
  const [session, ledger, translate, translateTabs, translateRoles] = await Promise.all([
    verifySession(),
    getActiveLedger(),
    getTranslations('settings.hub'),
    getTranslations('settings.tabs'),
    getTranslations('settings.access.roles'),
  ])

  if (!ledger) {
    return null
  }

  const isOwner = ledger.role === 'owner'
  const [members, invites] = await Promise.all([
    getMembers(ledger.ledgerId),
    isOwner ? getPendingInvites(ledger.ledgerId, new Date()) : [],
  ])
  const space = ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? ''
  const owner = members.find((member) => member.role === 'owner')
  const ownerName = owner ? memberName(owner) : '—'
  const rows: {
    href: Route
    icon: typeof Settings
    title: string
    subtitle: React.ReactNode
  }[] = [
    {
      href: '/settings/general',
      icon: Settings,
      title: translateTabs('general'),
      subtitle: translate('general'),
    },
    {
      href: '/settings/access',
      icon: Users,
      title: translateTabs('access'),
      subtitle: isOwner
        ? translate('accessOwner', {
            members: members.length,
            invites: invites.length,
          })
        : translate('accessMember', {
            others: members.length - 1,
            role: translate(ledger.role === 'editor' ? 'roles.editor' : 'roles.viewer'),
          }),
    },
    {
      href: '/settings/notifications',
      icon: Bell,
      title: translateTabs('notifications'),
      subtitle: translate('notifications'),
    },
    {
      href: '/settings/currencies',
      icon: Banknote,
      title: translateTabs('currencies'),
      subtitle: <CurrenciesSummary />,
    },
    {
      href: '/settings/data',
      icon: Database,
      title: translateTabs('data'),
      subtitle: translate('data'),
    },
  ]

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      {ledger.role === 'viewer' ? (
        <Banner kind="info">
          {translate('notice', {
            role: translateRoles('viewer'),
            space,
            owner: ownerName,
          })}
        </Banner>
      ) : null}
      <Card title={translate('title', { space })}>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.href} className="group">
              <SettingsLink {...row} />
            </li>
          ))}
        </ul>
      </Card>
      {isOwner ? null : <LeaveSpaceButton currentUserId={session.userId} ownerName={ownerName} className="w-full" />}
      <p className="text-center text-caption text-text-tertiary">
        {translate('signedInAs', { email: session.email ?? '—' })}
      </p>
    </div>
  )
}
