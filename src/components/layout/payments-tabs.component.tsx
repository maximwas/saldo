'use client'

import { useTranslations } from 'next-intl'
import { RouteTabs } from './route-tabs.component'

// Figma «Saldo» → Upcoming payments 2:12213 (desktop) / 2:13286 (mobile): Tabs gap 24 (16 on mobile); on mobile the
// last tab reads «Debts» (5:86541). Phone only (Maxim, 3.11): on desktop the sidebar lists the same pages as sub-items
export function PaymentsTabs() {
  const translate = useTranslations('nav')

  return (
    <RouteTabs
      label={translate('payments')}
      className="gap-4 lg:hidden"
      tabs={[
        {
          href: '/payments',
          label: translate('paymentsUpcoming'),
          exact: true,
        },
        {
          href: '/payments/subscriptions',
          label: translate('subscriptions'),
        },
        {
          href: '/payments/credits',
          label: translate('credits'),
        },
        {
          href: '/payments/debts',
          label: (
            <>
              <span className="lg:hidden">{translate('debtsShort')}</span>
              <span className="max-lg:hidden">{translate('debts')}</span>
            </>
          ),
        },
      ]}
    />
  )
}
