'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { operationQueries } from '../api/operations.queries'
import type { OperationSource as Source } from '../operations.types'
import { sourceHref } from '../utils/operation-display.utils'

type OperationSourceProps = {
  operationId: string
}

// Figma Saldo → link to the source 17:89221: on primary-soft (padding 12/8/12/16, gap 12, radius inner) a calendar
// icon, the paid obligation and its date (label-medium), then the source type, its plan and the section (caption,
// secondary), Ghost S «open source». A viewer gets the same block: it only reads.
export function OperationSource({ operationId }: OperationSourceProps) {
  const translate = useTranslations('operations.source')
  const translateType = useTranslations('obligations.source')
  const formatter = useFormatter()
  const locale = useLocale()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const sources = useQuery(operationQueries.sources(ledgerId, operationId))

  const date = (value: string) =>
    formatter.dateTime(new Date(`${value}T12:00:00Z`), {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    })

  function meta(source: Source) {
    const type = translateType(source.sourceType as 'manual')

    return source.plannedMinor === null
      ? translate('metaUnknown', { type })
      : translate('meta', {
          type,
          amount: formatMinor(source.plannedMinor, source.currency, locale),
        })
  }

  return (sources.data ?? []).map((source) => (
    <div
      key={source.obligationId}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-inner bg-primary-soft py-3 pr-2 pl-4"
    >
      <CalendarClock aria-hidden size={20} className="shrink-0 text-primary-text" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label font-medium text-text-primary">
          {translate('paid', {
            title: source.title,
            date: date(source.dueOn),
          })}
        </span>
        <span className="text-caption text-text-secondary">{meta(source)}</span>
      </span>
      <Button variant="ghost" size="s" render={<Link href={sourceHref(source) as Route} />} nativeButton={false}>
        {translate('open')}
      </Button>
    </div>
  ))
}
