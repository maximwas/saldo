import { AlertTriangle, ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Card } from '@/components/ui/card.component'
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

// Figma «Saldo» → Overview 2:8237 "Upcoming payments": rows of title + source + status, amount + date on the right;
// the amber strip counts payments past their date. Obligation icons (logos) arrive with the subscriptions feature.
export function UpcomingCard({ overview }: UpcomingCardProps) {
  const translate = useTranslations('overview')
  const format = useFormatter()

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
        <ul className="flex flex-col gap-4">
          {overview.upcoming.map((obligation) => (
            <li key={obligation.id} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-body font-medium text-text-primary">{obligation.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
                  <span>{translate(`source.${obligation.sourceType as 'manual'}`)}</span>
                  <Badge tone={STATE_TONE[obligation.state]}>{translate(`state.${obligation.state}`)}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Amount
                  minor={obligation.remainingMinor}
                  currency={obligation.currency}
                  kind={obligation.direction === 'in' ? 'income' : 'fact'}
                />
                <span className="text-caption text-text-secondary">
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
          className="flex cursor-pointer items-center justify-between gap-3 rounded-inner bg-warning-soft px-4 py-3 text-label text-warning-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-3">
            <AlertTriangle aria-hidden size={20} className="shrink-0" />
            {translate('upcoming.overdue', { count: overview.overdueCount })}
          </span>
          <span className="flex shrink-0 items-center font-semibold">
            <span className="hidden lg:inline">{translate('upcoming.review')}</span>
            <ChevronRight aria-hidden size={16} />
          </span>
        </Link>
      )}
    </Card>
  )
}
