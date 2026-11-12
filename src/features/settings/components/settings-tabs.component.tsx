import { useTranslations } from 'next-intl'
import { RouteTabs } from '@/components/layout/route-tabs.component'

const TABS = [
  {
    key: 'general',
    href: '/settings',
  },
  {
    key: 'access',
    href: '/settings/access',
  },
  {
    key: 'notifications',
    href: '/settings/notifications',
  },
  {
    key: 'currencies',
    href: '/settings/currencies',
  },
  {
    key: 'security',
    href: '/settings/security',
  },
  {
    key: 'data',
    href: '/settings/data',
  },
] as const

// Figma «Saldo» → Settings, Tabs 2:30898: gap 24, 1px border-bottom; Tab = label body-medium (text-primary when
// active, else text-secondary), padding 10/4/0, 2px primary indicator under the active one. Figma order (Security
// holds the AI access of phase 10 only). Phones have no tabs: the section list 2:35769 at /settings leads to each page.
export function SettingsTabs() {
  const translate = useTranslations('settings')

  return (
    <RouteTabs
      label={translate('tabsLabel')}
      className="hidden gap-6 lg:flex"
      tabs={TABS.map((tab) => ({
        href: tab.href,
        label: translate(`tabs.${tab.key}`),
        exact: true,
        // phones open General at /settings/general, the desktop tab stays /settings
        aliases: tab.key === 'general' ? ['/settings/general'] : undefined,
      }))}
    />
  )
}
