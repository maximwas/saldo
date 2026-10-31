import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import type { Overview } from '../api/overview.api'

type AccountsCardProps = {
  overview: Overview
}

const KIND_ICON = {
  bank: 'credit-card',
  cash: 'banknote',
  savings: 'landmark',
} as const

// Figma «Saldo» → Overview 2:8434 "Accounts": ListItem rows (padding 12/0, gap 16) with a CategoryIcon 40 in the
// account's colour, kind and currency, or «not in available» with the base sum (label, secondary), the balance (body-medium);
// the «in available» total under a border (padding-top 16: body-medium secondary, body-semibold sum)
export function AccountsCard({ overview }: AccountsCardProps) {
  const translate = useTranslations('overview')
  const translateCurrency = useTranslations('currencies')

  return (
    <Card
      title={translate('accounts.title')}
      action={{
        label: translate('accounts.all'),
        href: '/operations/accounts',
      }}
    >
      {overview.accounts.length === 0 ? (
        <div className="flex flex-col gap-1 py-6 text-center">
          <p className="text-body font-medium text-text-primary">{translate('accounts.empty')}</p>
          <p className="text-caption text-text-secondary">{translate('accounts.emptyHint')}</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col">
            {overview.accounts.map((account) => {
              const foreign = account.currency !== overview.baseCurrency

              return (
                <li key={account.id} className="flex items-center gap-4 py-3">
                  {/* an account without a colour keeps the blue of the primary tile it had */}
                  <CategoryIcon icon={KIND_ICON[account.kind]} color={account.color ?? 'blue'} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-body font-medium text-text-primary">{account.name}</p>
                    <p className="flex flex-wrap items-center gap-x-1 text-label text-text-secondary">
                      <span>
                        {account.includeInAvailable
                          ? `${translate(`accounts.kind.${account.kind}`)} · ${translateCurrency(`names.${account.currency as 'UAH'}`)}`
                          : translate('accounts.notInAvailable')}
                      </span>
                      {foreign && !account.includeInAvailable && (
                        <>
                          <span aria-hidden>·</span>
                          <Amount
                            minor={account.baseMinor}
                            currency={overview.baseCurrency}
                            className="text-label font-normal text-text-secondary"
                          />
                        </>
                      )}
                    </p>
                  </div>
                  <Amount minor={account.balanceMinor} currency={account.currency} />
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-body font-medium text-text-secondary">{translate('accounts.inAvailable')}</span>
            <Amount
              minor={overview.available.balancesMinor}
              currency={overview.baseCurrency}
              className="font-semibold"
            />
          </div>
        </>
      )}
    </Card>
  )
}
