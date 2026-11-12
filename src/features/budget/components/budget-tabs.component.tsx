import { useTranslations } from 'next-intl'
import { RouteTabs } from '@/components/layout/route-tabs.component'
import { SoonBadge } from '@/components/layout/soon-badge.component'

// Figma «Saldo» → phase 4 budget (2:12870 desktop, 2:16111 mobile): the month, goals and big expenses; gap 24 (20 on
// mobile), where the goals tab has its short name; goals and big expenses are not built yet and say «soon»
export function BudgetTabs() {
  const translate = useTranslations('nav')

  return (
    <RouteTabs
      label={translate('budget')}
      className="gap-5 lg:gap-6"
      tabs={[
        {
          href: '/budget',
          label: translate('budgetMonth'),
          exact: true,
        },
        {
          href: '/budget/goals',
          label: (
            <span className="flex items-center gap-2">
              <span className="lg:hidden">{translate('goalsShort')}</span>
              <span className="max-lg:hidden">{translate('goals')}</span>
              <SoonBadge />
            </span>
          ),
        },
        {
          href: '/budget/big-expenses',
          label: (
            <span className="flex items-center gap-2">
              {translate('bigExpenses')}
              <SoonBadge />
            </span>
          ),
        },
      ]}
    />
  )
}
