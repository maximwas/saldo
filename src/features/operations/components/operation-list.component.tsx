'use client'

import { Paperclip } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import type { AccountOption, CategoryOption, OperationItem } from '../operations.types'
import { displayAmount, showsOriginal } from '../utils/operation-display.utils'
import { dayLabelKind, groupByDay, summarize } from '../utils/operation-items.utils'
import { formatRate, impliedRate } from '../utils/rate.utils'

type OperationListProps = {
  items: OperationItem[]
  accounts: AccountOption[]
  categories: CategoryOption[]
  receiptIds: ReadonlySet<string>
  baseCurrency: string
  today: string
  onSelectAction: (item: OperationItem) => void
}

const ROW_BUTTON = 'cursor-pointer rounded-xs text-left outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Figma Saldo file → Operations 2:11403: a table (desktop) with day group rows (44, app fill) and 64 high rows; 2:13681: a card
// per day on mobile, the day sum on the right of its header. A transfer is one neutral line «−800,00 € → +33 200,00 ₴».
// shortcut: no "Planned" group (planned payments are 1.11), no hover quick actions: a click opens the sheet
export function OperationList({
  items,
  accounts,
  categories,
  receiptIds,
  baseCurrency,
  today,
  onSelectAction,
}: OperationListProps) {
  const translate = useTranslations('operations')
  const formatter = useFormatter()
  const locale = useLocale()
  const { timeZone } = useLedger()
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
        <span className="whitespace-nowrap">
          <Amount minor={-fromAmountMinor} currency={fromCurrency} kind="transfer" />
          <span className="text-text-tertiary"> → +</span>
          <Amount minor={toAmountMinor} currency={toCurrency} kind="transfer" />
        </span>
      )
    }

    const amount = displayAmount(item)

    return (
      <span className="whitespace-nowrap">
        {amount.plus ? <span className={amount.tone === 'income' ? 'text-positive-text' : undefined}>+</span> : null}
        <Amount minor={amount.minor} currency={amount.currency} kind={amount.tone} />
      </span>
    )
  }

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
      <Paperclip aria-label={translate('row.receipt')} role="img" size={14} className="shrink-0" />
    ) : null

  return (
    <>
      <div className="hidden overflow-hidden rounded-card bg-card shadow-card lg:block">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="h-10 border-b border-border text-caption text-text-secondary">
              <th scope="col" className="w-20 px-4 font-normal">
                {translate('table.date')}
              </th>
              <th scope="col" className="px-4 font-normal">
                {translate('table.description')}
              </th>
              <th scope="col" className="hidden w-40 px-4 font-normal xl:table-cell">
                {translate('table.category')}
              </th>
              <th scope="col" className="hidden w-44 px-4 font-normal xl:table-cell">
                {translate('table.account')}
              </th>
              <th scope="col" className="w-56 px-4 text-right font-normal">
                {translate('table.amount')}
              </th>
            </tr>
          </thead>
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
                  <td className="px-4 text-label text-text-secondary">{shortDate(item.row.occurredOn)}</td>
                  <td className="px-4">
                    <span className="flex min-w-0 items-center gap-3">
                      <CategoryIcon
                        icon={
                          item.kind === 'transfer' ? 'arrow-left-right' : (category(item.row.categoryId)?.icon ?? null)
                        }
                        color={item.kind === 'transfer' ? null : (category(item.row.categoryId)?.color ?? null)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <button
                          type="button"
                          onClick={() => onSelectAction(item)}
                          className={`${ROW_BUTTON} truncate text-body font-medium text-text-primary after:absolute after:inset-0`}
                        >
                          {titleOf(item)}
                        </button>
                        <span className="flex items-center gap-1.5 text-caption text-text-secondary">
                          <span className="truncate">{subtitleOf(item)}</span>
                          {paperclip(item)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden truncate px-4 text-body text-text-secondary xl:table-cell">
                    {item.kind === 'transfer'
                      ? ''
                      : (category(item.row.categoryId)?.name ?? translate('row.noCategory'))}
                  </td>
                  <td className="hidden truncate px-4 text-body text-text-secondary xl:table-cell">
                    {item.kind === 'transfer' ? '' : accountName(item.row.accountId)}
                  </td>
                  <td className="px-4 text-right text-body font-medium">{amountOf(item)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="flex flex-col gap-4 lg:hidden">
        {groups.map((group) => (
          <section key={group.date} className="rounded-card bg-card px-4 py-1 shadow-card">
            <header className="flex items-center justify-between gap-3 py-3">
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
                    className={`${ROW_BUTTON} flex min-h-16 w-full items-center gap-x-3 py-2 ${item.kind === 'transfer' ? 'flex-wrap' : ''}`}
                  >
                    <CategoryIcon
                      icon={
                        item.kind === 'transfer' ? 'arrow-left-right' : (category(item.row.categoryId)?.icon ?? null)
                      }
                      color={item.kind === 'transfer' ? null : (category(item.row.categoryId)?.color ?? null)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-medium text-text-primary">{titleOf(item)}</span>
                      <span className="flex items-center gap-1.5 text-caption text-text-secondary">
                        <span className="truncate">{subtitleOf(item)}</span>
                        {paperclip(item)}
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
