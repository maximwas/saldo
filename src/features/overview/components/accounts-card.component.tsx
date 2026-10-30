import { Banknote, CreditCard, Landmark } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import type { Overview } from '../api/overview.api'

type AccountsCardProps = {
  overview: Overview
}

const KIND_ICON = {
  bank: CreditCard,
  cash: Banknote,
  savings: Landmark,
}

// Figma «Saldo» → Overview 2:8237 "Accounts": balance in the account currency, "Not in available · 49 800,00 ₴" for
// excluded foreign accounts, the "In available" total below
export function AccountsCard({ overview }: AccountsCardProps) {
  const translate = useTranslations('overview')

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
          <ul className="flex flex-col gap-4">
            {overview.accounts.map((account) => {
              const Icon = KIND_ICON[account.kind]
              const foreign = account.currency !== overview.baseCurrency

              return (
                <li key={account.id} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text"
                  >
                    <Icon size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-body font-medium text-text-primary">{account.name}</p>
                    <p className="flex flex-wrap items-center gap-x-1 text-caption text-text-secondary">
                      <span>
                        {account.includeInAvailable
                          ? `${translate(`accounts.kind.${account.kind}`)} · ${account.currency}`
                          : translate('accounts.notInAvailable')}
                      </span>
                      {foreign && !account.includeInAvailable && (
                        <>
                          <span aria-hidden>·</span>
                          <Amount
                            minor={account.baseMinor}
                            currency={overview.baseCurrency}
                            className="text-caption font-normal text-text-secondary"
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
          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
            <span className="text-body text-text-primary">{translate('accounts.inAvailable')}</span>
            <Amount minor={overview.available.balancesMinor} currency={overview.baseCurrency} />
          </div>
        </>
      )}
    </Card>
  )
}
