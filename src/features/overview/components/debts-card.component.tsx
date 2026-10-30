import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import type { Overview } from '../api/overview.api'

type DebtsCardProps = {
  overview: Overview
}

// No Figma frame for debts on Overview: the Accounts card 2:8237 pattern with two rows. §3 keeps the open debts apart
// from the month's result (Month card) and from the shortfall («Available»); a space without open debts shows nothing.
export function DebtsCard({ overview }: DebtsCardProps) {
  const translate = useTranslations('overview')
  const { owedToMeMinor, iOweMinor, unknownCount } = overview.openDebts

  if (owedToMeMinor === 0 && iOweMinor === 0 && unknownCount === 0) {
    return null
  }

  return (
    <Card
      title={translate('debts.title')}
      action={{
        label: translate('debts.all'),
        href: '/payments/debts',
      }}
    >
      <dl className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body text-text-primary">{translate('debts.owedToMe')}</dt>
          <dd>
            <Amount minor={owedToMeMinor} currency={overview.baseCurrency} kind="income" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body text-text-primary">{translate('debts.iOwe')}</dt>
          <dd>
            <Amount minor={-iOweMinor} currency={overview.baseCurrency} />
          </dd>
        </div>
      </dl>
      <p className="border-t border-border pt-4 text-caption text-text-secondary">
        {translate('debts.apart')}
        {unknownCount > 0 && ` ${translate('debts.unknown', { count: unknownCount })}`}
      </p>
    </Card>
  )
}
