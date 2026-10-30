import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { SignOut } from '@/components/layout/sign-out.component'
import { Card } from '@/components/ui/card.component'
import { getLedgerSettings, getMyDisplayName } from '@/features/ledgers/api/access.server'
import { DisplayNameForm } from '@/features/ledgers/components/display-name-form.component'
import { SpaceSettingsForm } from '@/features/ledgers/components/space-settings-form.component'
import { HideAmountsSwitch } from '@/features/settings/components/hide-amounts-switch.component'
import { LocaleSwitcher } from '@/features/settings/components/locale-switcher.component'
import { ThemeSwitcher } from '@/features/settings/components/theme-switcher.component'
import { getActiveLedger, verifySession } from '@/lib/auth/dal.server'

// Figma «Saldo» → Settings, General tab, frame 11:72807: cards 11:73032 (theme) and 11:73055 (language), gap 24;
// a Card has padding 24, gap 20, radius card, shadow-card, title text/card-title; its body is the hint (text/label,
// text-secondary) and the SegmentedControl, gap 16. The space and privacy cards have no frame: same Card.
export default async function SettingsPage() {
  const translate = await getTranslations('settings')

  return (
    <div className="flex max-w-180 flex-col gap-4 lg:gap-6">
      <Card title={translate('themeTitle')}>
        <p className="text-label text-text-secondary">{translate('themeHint')}</p>
        <ThemeSwitcher />
      </Card>
      <Card title={translate('languageTitle')}>
        <p className="text-label text-text-secondary">{translate('languageHint')}</p>
        <LocaleSwitcher />
      </Card>
      <Card title={translate('privacy.title')}>
        <p className="text-label text-text-secondary">{translate('privacy.hint')}</p>
        <HideAmountsSwitch />
      </Card>
      <Suspense>
        <MyName />
        <SpaceSettings />
      </Suspense>
      <Card title={translate('signOut.title')}>
        <p className="text-label text-text-secondary">{translate('signOut.hint')}</p>
        <div>
          <SignOut />
        </div>
      </Card>
    </div>
  )
}

// every member names themselves in the active space, whatever their role
async function MyName() {
  const [ledger, session] = await Promise.all([getActiveLedger(), verifySession()])

  if (!ledger) {
    return null
  }

  const name = await getMyDisplayName(ledger.ledgerId, session.userId)

  return <DisplayNameForm key={`${ledger.ledgerId}:${name}`} name={name} />
}

// the active space and its row are request data: read inside <Suspense> so the cards above stay instant
async function SpaceSettings() {
  const [ledger, translate] = await Promise.all([getActiveLedger(), getTranslations('settings.space')])

  if (!ledger) {
    return null
  }

  if (ledger.role !== 'owner') {
    return (
      <Card title={translate('title')}>
        <p className="text-label text-text-secondary">{translate('ownerOnly')}</p>
      </Card>
    )
  }

  const settings = await getLedgerSettings(ledger.ledgerId)

  return <SpaceSettingsForm key={settings.version} settings={settings} />
}
