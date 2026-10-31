import { AlertTriangle } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Card } from '@/components/ui/card.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import type { Overview } from '../api/overview.api'
import { isoToDate } from '../utils/overview.utils'

type UpcomingCardProps = {
  overview: Overview
}

const STATE_TONE = {
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
} as const

// Figma «Saldo» → Overview 2:8326 "Upcoming payments": ListItem rows (padding 12/0, gap 16) with the service logo or
// letter 40, title body-medium, source with the installment or the account (label) + StatusPill, the planned
// amount (text-secondary) and date on the right; the amber strip (padding 12/16, gap 12, body-medium + label-semibold)
// counts payments past their date.
export function UpcomingCard({ overview }: UpcomingCardProps) {
  const translate = useTranslations('overview')
  const format = useFormatter()
  const accountName = (id: string | null) => overview.accounts.find((account) => account.id === id)?.name

  function subtitle(obligation: Overview['upcoming'][number]) {
    const source = translate(`source.${obligation.sourceType as 'manual'}`)

    if (obligation.installment) {
      return `${source} · ${translate('upcoming.installment', obligation.installment)}`
    }

    const account = obligation.sourceType === 'subscription' ? accountName(obligation.accountId) : undefined

    return account ? `${source} · ${account}` : source
  }

  return (
    <Card
      title={translate('upcoming.title')}
      action={{
        label: translate('upcoming.all'),
        href: '/payments',
      }}
    >
      {overview.upcoming.length === 0 ? (
        <div className="flex flex-col gap-1 py-6 text-center">
          <p className="text-body font-medium text-text-primary">{translate('upcoming.empty')}</p>
          <p className="text-caption text-text-secondary">{translate('upcoming.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {overview.upcoming.map((obligation) => (
            <li key={obligation.id} className="flex items-center gap-4 py-3">
              <ServiceLogo name={obligation.title} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-body font-medium text-text-primary">{obligation.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-text-secondary">
                  <span>{subtitle(obligation)}</span>
                  <Badge tone={STATE_TONE[obligation.state]}>{translate(`state.${obligation.state}`)}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <Amount
                  minor={obligation.remainingMinor}
                  currency={obligation.currency}
                  kind={obligation.direction === 'in' ? 'income' : 'plan'}
                />
                <span className="text-label text-text-secondary">
                  {obligation.dueOn === overview.today
                    ? translate('upcoming.today')
                    : format.dateTime(isoToDate(obligation.dueOn), {
                        timeZone: 'UTC',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {overview.overdueCount > 0 && (
        <Link
          href={'/payments' as Route}
          className="flex cursor-pointer items-center gap-3 rounded-inner bg-warning-soft px-4 py-3 text-warning-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <AlertTriangle aria-hidden size={20} className="shrink-0" />
          <span className="flex-1 text-body font-medium">
            {translate('upcoming.overdue', { count: overview.overdueCount })}
          </span>
          <span className="shrink-0 text-label font-semibold">{translate('upcoming.review')}</span>
        </Link>
      )}
    </Card>
  )
}
