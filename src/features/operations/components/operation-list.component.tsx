'use client'

import { useQuery } from '@tanstack/react-query'
import { Link as LinkIcon, Paperclip } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { AuthorAvatar } from '@/components/ui/author-avatar.component'
import { Badge } from '@/components/ui/badge.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { serviceLogoOf } from '@/components/ui/service-logo.utils'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { formatMinor } from '@/lib/money/money.utils'
import type { RecordState } from '@/lib/query/sync-queue.utils'
import { operationQueries } from '../api/operations.queries'
import type { OperationItem, PlannedRow } from '../operations.types'
import { displayAmount, showsOriginal } from '../utils/operation-display.utils'
import { dayLabelKind, groupByDay, summarize } from '../utils/operation-items.utils'
import { formatRate, impliedRate } from '../utils/rate.utils'

type OperationListProps = {
  items: OperationItem[]
  receiptIds: ReadonlySet<string>
  /** rows still in the device's queue: pending, error or conflict (§22) */
  syncStates?: ReadonlyMap<string, RecordState>
  /** open plans of today and the next 7 days, above the facts; none outside the current month */
  planned?: readonly PlannedRow[]
  onSelectAction: (item: OperationItem) => void
}

const SYNC_TONE = {
  pending: 'info',
  error: 'negative',
  conflict: 'warning',
} as const

// the «+» takes the colour of the amount after it; a refund's stays the text colour, never green
const PLUS_TONE = {
  fact: undefined,
  income: 'text-positive-text',
  transfer: 'text-text-tertiary',
} as const

const ROW_BUTTON = 'cursor-pointer rounded-xs text-left outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Figma Saldo file → Operations 2:11403: a table (desktop) — TableHeader 40 (caption-medium, tertiary), day group rows
// (44, app fill), TableRow 64: padding 0/16, gap 16, date 72, description (leading 32, gap 12, title body-medium,
// subtitle label), category 160, account 180, amount 260; 2:13681: a card per day on mobile (DayHeader padding 12/0/8),
// ListItem 72 with a 40 leading and the category as its subtitle. The leading is the service logo when the payee has
// one, else the CategoryBadge; a transfer and an adjustment keep the neutral tile. A transfer is one neutral line
// «−800,00 € → +33 200,00 ₴». The «Planned» group comes first (2:11543 / 2:13753): its header carries the count,
// «not a fact yet», the Plan pill and the total (mobile: pill and count), its rows the due date, the source with the
// installment or the period, and the plan sum in secondary next to a Plan pill (mobile: the date under the sum).
// shortcut: no hover quick actions and no action on a plan row (none drawn): a click on a fact opens the sheet
export function OperationList({ items, receiptIds, syncStates, planned = [], onSelectAction }: OperationListProps) {
  const translate = useTranslations('operations')
  const translatePlan = useTranslations('operations.plan')
  const translateObligation = useTranslations('obligations')
  const translateSync = useTranslations('sync.badge')
  const formatter = useFormatter()
  const locale = useLocale()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const today = useToday()
  const options = useQuery(operationQueries.options(ledgerId))
  const refunds = useQuery(operationQueries.refunds(ledgerId))
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  const names = useMemberNames()
  const groups = groupByDay(items)
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? ''
  const category = (id: string | null) => categories.find((candidate) => candidate.id === id)

  const dateOf = (date: string) => new Date(`${date}T12:00:00Z`)
  const shortDate = (date: string) =>
    formatter.dateTime(dateOf(date), {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    })
  const longDate = (date: string) =>
    formatter.dateTime(dateOf(date), {
      weekday: date === today ? undefined : 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })

  function dayTitle(date: string) {
    const kind = dayLabelKind(date, today)
    const label = formatter.dateTime(dateOf(date), {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })

    if (kind === 'today') {
      return translate('day.today', { date: label })
    }

    if (kind === 'yesterday') {
      return translate('day.yesterday', { date: label })
    }

    return longDate(date)
  }

  function titleOf(item: OperationItem) {
    if (item.kind === 'transfer' && item.transfer) {
      return `${accountName(item.transfer.fromAccountId)} → ${accountName(item.transfer.toAccountId)}`
    }

    if (item.row.transferId) {
      return translate('row.fee')
    }

    return item.row.counterparty ?? category(item.row.categoryId)?.name ?? translate(`kinds.${item.kind}`)
  }

  function subtitleOf(item: OperationItem) {
    const { row } = item

    if (showsOriginal(item)) {
      const rate = impliedRate(row.amountMinor, row.currency, row.baseAmountMinor as number, row.baseCurrency)

      return `${formatMinor(row.amountMinor, row.currency, locale)} · ${translate('row.rate', { rate: rate ? formatRate(rate, locale) : '' })}`
    }

    // a transfer has no base amount by design: only an expense or income without a rate is «unknown»
    if (item.kind !== 'transfer' && row.currency !== row.baseCurrency && row.baseAmountMinor === null) {
      return translate('row.rateUnknown')
    }

    if (row.note) {
      return row.note
    }

    // Figma 15:84284: a refund names the purchase it returns
    const purchase = row.refundOfId ? refunds.data?.purchases[row.refundOfId] : undefined

    if (purchase) {
      return translate('refund.subtitle', { date: shortDate(purchase.occurredOn) })
    }

    if (item.kind === 'transfer') {
      return row.transferId ? translate('kinds.transfer') : ''
    }

    return formatter.dateTime(new Date(row.occurredAt), {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    })
  }

  function amountOf(item: OperationItem) {
    if (item.kind === 'transfer' && item.transfer) {
      const { fromAmountMinor, fromCurrency, toAmountMinor, toCurrency } = item.transfer

      return fromCurrency === toCurrency ? (
        <Amount minor={fromAmountMinor} currency={fromCurrency} kind="transfer" />
      ) : (
        // each side stays whole; on a narrow row the second one drops to its own line instead of being clipped
        <span className="flex flex-wrap justify-end gap-x-1">
          <Amount minor={-fromAmountMinor} currency={fromCurrency} kind="transfer" />
          <span className="whitespace-nowrap">
            <span className="text-text-tertiary">→ +</span>
            <Amount minor={toAmountMinor} currency={toCurrency} kind="transfer" />
          </span>
        </span>
      )
    }

    const amount = displayAmount(item)

    return (
      <span className="whitespace-nowrap">
        {amount.plus ? <span className={PLUS_TONE[amount.tone]}>+</span> : null}
        <Amount minor={amount.minor} currency={amount.currency} kind={amount.tone} />
      </span>
    )
  }

  // a transfer and an adjustment are neutral lines: no category colour, neither income nor spending (§5)
  const neutral = (item: OperationItem) => item.kind === 'transfer' || item.kind === 'adjustment'

  function iconOf(item: OperationItem) {
    if (item.kind === 'transfer') {
      return 'arrow-left-right'
    }

    if (item.kind === 'adjustment') {
      return 'scale'
    }

    // a refund keeps the colour of its category, with the «returned» arrow
    return item.kind === 'refund' ? 'undo-2' : (category(item.row.categoryId)?.icon ?? null)
  }

  const colorOf = (item: OperationItem) => (neutral(item) ? null : (category(item.row.categoryId)?.color ?? null))

  function leadingOf(item: OperationItem, size: 40 | 32) {
    const payee = item.row.counterparty

    if (!neutral(item) && payee && serviceLogoOf(payee)) {
      return <ServiceLogo name={payee} size={size} />
    }

    if (neutral(item)) {
      return <CategoryIcon icon={iconOf(item)} color={null} size={size === 40 ? 'md' : 'sm'} />
    }

    return <CategoryBadge icon={iconOf(item)} color={colorOf(item)} size={size} />
  }

  // mobile has no category column: a categorised row names its category under the title (Figma ListItem Subtitle)
  const mobileSubtitle = (item: OperationItem) =>
    (!neutral(item) && category(item.row.categoryId)?.name) || subtitleOf(item)

  const categoryCell = (item: OperationItem) => {
    if (item.kind === 'transfer') {
      return translate('kinds.transfer')
    }

    return neutral(item) ? '' : (category(item.row.categoryId)?.name ?? translate('row.noCategory'))
  }

  const accountCell = (item: OperationItem) =>
    item.kind === 'transfer' && item.transfer
      ? `${accountName(item.transfer.fromAccountId)} → ${accountName(item.transfer.toAccountId)}`
      : accountName(item.row.accountId)

  // a purchase chip with its date on a refund, the refunded sum on a purchase that has refunds
  function refundNote(item: OperationItem) {
    const purchase = item.row.refundOfId ? refunds.data?.purchases[item.row.refundOfId] : undefined

    // Figma 15:84284 «Relation»: subtle pill, padding 2/8, gap 4, a 12 link icon, text/micro
    if (purchase) {
      return (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-micro whitespace-nowrap text-text-secondary">
          <LinkIcon aria-hidden size={12} />
          {translate('refund.purchase', { date: shortDate(purchase.occurredOn) })}
        </span>
      )
    }

    const refunded = refunds.data?.refundedById[item.row.id]

    return refunded ? (
      <span className="shrink-0 whitespace-nowrap">
        · {translate('refund.refunded', { amount: formatMinor(refunded, item.row.currency, locale) })}
      </span>
    ) : null
  }

  // shortcut: the group total adds base-currency plans only; a foreign or unknown sum makes it unknown, not partial
  const planTotal = planned.every((plan) => plan.remainingMinor !== null && plan.currency === baseCurrency)
    ? -planned.reduce((sum, plan) => sum + (plan.remainingMinor ?? 0), 0)
    : null
  const planMinor = (plan: PlannedRow) => (plan.remainingMinor === null ? null : -plan.remainingMinor)

  // «Credit · installment 3 of 12»; a subscription names its period on desktop only (2:11552 vs 2:13761)
  function planSubtitle(plan: PlannedRow, withInterval: boolean) {
    const source = translateObligation(`source.${plan.sourceType as 'manual'}`)

    if (plan.installment) {
      return `${source} · ${translatePlan('installment', plan.installment)}`
    }

    return withInterval && plan.interval ? `${source} · ${translatePlan('interval', plan.interval)}` : source
  }

  // a credit has no category of its own: Figma names its section
  const planCategory = (plan: PlannedRow) =>
    category(plan.categoryId)?.name ??
    (plan.sourceType === 'credit' ? translatePlan('creditCategory') : translate('row.noCategory'))

  const author = (item: OperationItem) => (item.row.createdBy ? names[item.row.createdBy] : null)

  const dayTotal = (group: (typeof groups)[number]) => {
    const totals = summarize(group.items)
    const counted = group.items.some(
      (item) => item.kind === 'income' || item.kind === 'expense' || item.kind === 'refund',
    )

    return counted && totals.unknownCount === 0 ? (
      <span className="text-label font-semibold text-text-primary">
        <Amount minor={totals.resultMinor} currency={baseCurrency} />
      </span>
    ) : null
  }

  const paperclip = (item: OperationItem) =>
    receiptIds.has(item.row.id) ? (
      <Paperclip aria-label={translate('row.receipt')} role="img" size={16} className="shrink-0" />
    ) : null

  function syncBadge(item: OperationItem) {
    const state = syncStates?.get(item.row.id)

    return state && state !== 'synced' ? <Badge tone={SYNC_TONE[state]}>{translateSync(state)}</Badge> : null
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-card bg-card shadow-card lg:block">
        <table className="w-full table-fixed text-left">
          <thead>
            {/* cells split the 16 gaps into 8 + 8: date 16+72+8, category 8+160+8, account 8+180+8, amount 8+260+16 */}
            <tr className="h-10 border-b border-border text-caption font-medium text-text-tertiary">
              <th scope="col" className="w-24 pr-2 pl-4 font-medium">
                {translate('table.date')}
              </th>
              <th scope="col" className="px-2 font-medium">
                {translate('table.description')}
              </th>
              <th scope="col" className="hidden w-44 px-2 font-medium xl:table-cell">
                {translate('table.category')}
              </th>
              <th scope="col" className="hidden w-49 px-2 font-medium xl:table-cell">
                {translate('table.account')}
              </th>
              <th scope="col" className="w-71 pr-4 pl-2 text-right font-medium">
                {translate('table.amount')}
              </th>
            </tr>
          </thead>
          {planned.length > 0 ? (
            <tbody>
              <tr className="h-11 border-b border-border bg-app">
                <th scope="colgroup" colSpan={5} className="px-4 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <span className="text-label font-semibold text-text-primary">{translatePlan('title')}</span>
                    <span className="flex-1 text-label text-text-secondary">
                      {translatePlan('count', { count: planned.length })} · {translatePlan('notFact')}
                    </span>
                    <Badge tone="plan">{translatePlan('pill')}</Badge>
                    <Amount minor={planTotal} currency={baseCurrency} kind="plan" className="text-label" />
                  </span>
                </th>
              </tr>
              {planned.map((plan) => (
                <tr key={plan.id} className="h-16 border-b border-border">
                  <td className="pr-2 pl-4 text-label text-text-secondary">{shortDate(plan.dueOn)}</td>
                  <td className="px-2">
                    <span className="flex min-w-0 items-center gap-3">
                      <ServiceLogo name={plan.title} size={32} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-body font-medium text-text-primary">{plan.title}</span>
                        <span className="truncate text-label text-text-secondary">{planSubtitle(plan, true)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden truncate px-2 text-label text-text-secondary xl:table-cell">
                    {planCategory(plan)}
                  </td>
                  <td className="hidden truncate px-2 text-label text-text-secondary xl:table-cell">
                    {plan.accountId ? accountName(plan.accountId) : ''}
                  </td>
                  <td className="pr-4 pl-2">
                    <span className="flex items-center justify-end gap-2">
                      <Badge tone="plan">{translatePlan('pill')}</Badge>
                      <Amount minor={planMinor(plan)} currency={plan.currency} kind="plan" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          ) : null}
          {groups.map((group) => (
            <tbody key={group.date}>
              <tr className="h-11 border-b border-border bg-app">
                <th scope="colgroup" colSpan={5} className="px-4 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <span className="text-label font-semibold text-text-primary first-letter:uppercase">
                      {dayTitle(group.date)}
                    </span>
                    <span className="flex-1 text-label text-text-secondary">
                      {translate('day.count', { count: group.items.length })}
                    </span>
                    {dayTotal(group)}
                  </span>
                </th>
              </tr>
              {group.items.map((item) => (
                <tr key={item.row.id} className="relative h-16 border-b border-border hover:bg-subtle">
                  <td className="pr-2 pl-4 text-label text-text-secondary">{shortDate(item.row.occurredOn)}</td>
                  <td className="px-2">
                    <span className="flex min-w-0 items-center gap-3">
                      {leadingOf(item, 32)}
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onSelectAction(item)}
                          className={`${ROW_BUTTON} truncate text-body font-medium text-text-primary after:absolute after:inset-0`}
                        >
                          {titleOf(item)}
                        </button>
                        <span className="flex items-center gap-2 text-label text-text-secondary">
                          <AuthorAvatar name={author(item)} />
                          <span className="truncate">{subtitleOf(item)}</span>
                          {paperclip(item)}
                          {refundNote(item)}
                          {syncBadge(item)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden truncate px-2 text-label text-text-secondary xl:table-cell">
                    {categoryCell(item)}
                  </td>
                  <td className="hidden truncate px-2 text-label text-text-secondary xl:table-cell">
                    {accountCell(item)}
                  </td>
                  <td className="pr-4 pl-2 text-right text-body font-medium">{amountOf(item)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="flex flex-col gap-4 lg:hidden">
        {planned.length > 0 ? (
          <section className="rounded-card bg-card px-4 py-1 shadow-card">
            <header className="flex items-center gap-3 pt-3 pb-2">
              <h3 className="flex-1 text-label font-semibold text-text-primary">{translatePlan('title')}</h3>
              <span className="flex items-center gap-1.5">
                <Badge tone="plan">{translatePlan('pill')}</Badge>
                <span className="text-label font-medium text-text-secondary">
                  {translatePlan('count', { count: planned.length })}
                </span>
              </span>
            </header>
            <ul>
              {planned.map((plan) => (
                <li key={plan.id} className="flex min-h-18 items-center gap-4 py-3">
                  <ServiceLogo name={plan.title} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-body font-medium text-text-primary">{plan.title}</span>
                    <span className="truncate text-label text-text-secondary">{planSubtitle(plan, false)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <Amount minor={planMinor(plan)} currency={plan.currency} kind="plan" />
                    <span className="text-label text-text-secondary">
                      {plan.dueOn === today ? translateObligation('todayLabel') : shortDate(plan.dueOn)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {groups.map((group) => (
          <section key={group.date} className="rounded-card bg-card px-4 py-1 shadow-card">
            <header className="flex items-center justify-between gap-3 pt-3 pb-2">
              <h3 className="text-label font-semibold text-text-primary first-letter:uppercase">
                {dayTitle(group.date)}
              </h3>
              {dayTotal(group)}
            </header>
            <ul>
              {group.items.map((item) => (
                <li key={item.row.id}>
                  <button
                    type="button"
                    onClick={() => onSelectAction(item)}
                    // a transfer shows two amounts: they drop to their own line instead of cutting the title
                    className={`${ROW_BUTTON} flex min-h-18 w-full items-center gap-x-4 py-3 ${item.kind === 'transfer' ? 'flex-wrap' : ''}`}
                  >
                    {leadingOf(item, 40)}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-body font-medium text-text-primary">{titleOf(item)}</span>
                      <span className="flex items-center gap-2 text-label text-text-secondary">
                        <AuthorAvatar name={author(item)} />
                        <span className="truncate">{mobileSubtitle(item)}</span>
                        {paperclip(item)}
                        {refundNote(item)}
                        {syncBadge(item)}
                      </span>
                    </span>
                    <span
                      className={`text-body font-medium ${item.kind === 'transfer' ? 'basis-full text-right' : ''}`}
                    >
                      {amountOf(item)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
