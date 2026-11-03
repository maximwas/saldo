import { useTranslations } from 'next-intl'
import { RouteTabs } from '@/components/layout/route-tabs.component'

// Figma «Saldo» → phase 4 budget (2:12870 desktop, 2:16111 mobile): the month, goals and big expenses; gap 24 (20 on
// mobile), where the goals tab has its short name
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
            <>
              <span className="lg:hidden">{translate('goalsShort')}</span>
              <span className="max-lg:hidden">{translate('goals')}</span>
            </>
          ),
        },
        {
          href: '/budget/big-expenses',
          label: translate('bigExpenses'),
        },
      ]}
    />
  )
}
