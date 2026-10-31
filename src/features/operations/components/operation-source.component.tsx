'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarClock, ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
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
// secondary), Ghost S «open source». On a phone (17:90017) the whole block is the link (min 44, padding 12/12/12/16)
// with a chevron and no section name. A viewer gets the same block: it only reads.
export function OperationSource({ operationId }: OperationSourceProps) {
  const translate = useTranslations('operations.source')
  const translateType = useTranslations('obligations.source')
  const formatter = useFormatter()
  const locale = useLocale()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const sources = useQuery(operationQueries.sources(ledgerId, operationId))
  const desktop = useIsDesktop()

  const date = (value: string) =>
    formatter.dateTime(new Date(`${value}T12:00:00Z`), {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    })

  function meta(source: Source) {
    const type = translateType(source.sourceType as 'manual')
    const section = desktop ? 'shown' : 'hidden'

    return source.plannedMinor === null
      ? translate('metaUnknown', {
          type,
          section,
        })
      : translate('meta', {
          type,
          amount: formatMinor(source.plannedMinor, source.currency, locale),
          section,
        })
  }

  const text = (source: Source) => (
    <>
      <CalendarClock aria-hidden size={20} className="shrink-0 text-text-primary" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label font-medium text-text-primary">
          {translate('paid', {
            title: source.title,
            date: date(source.dueOn),
          })}
        </span>
        <span className="text-caption text-text-secondary">{meta(source)}</span>
      </span>
    </>
  )

  return (sources.data ?? []).map((source) =>
    desktop ? (
      <div key={source.obligationId} className="flex items-center gap-3 rounded-inner bg-primary-soft py-3 pr-2 pl-4">
        {text(source)}
        <Button variant="ghost" size="s" render={<Link href={sourceHref(source) as Route} />} nativeButton={false}>
          {translate('open')}
        </Button>
      </div>
    ) : (
      <Link
        key={source.obligationId}
        href={sourceHref(source) as Route}
        className="flex min-h-11 items-center gap-3 rounded-inner bg-primary-soft py-3 pr-3 pl-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {text(source)}
        <ChevronRight aria-hidden size={20} className="shrink-0 text-text-primary" />
      </Link>
    ),
  )
}
